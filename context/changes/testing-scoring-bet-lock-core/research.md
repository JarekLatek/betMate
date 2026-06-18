---
date: 2026-06-18T16:11:26+02:00
researcher: Jarosław Latek
git_commit: a7db188ccf846cb6e3bf1a5ab5d0e1a698305c7d
branch: ms2026_release
repository: betMate
topic: "Phase 1 — Scoring & bet-lock core: ground risks #1, #3, #5 for the unit/boundary test rollout"
tags: [research, codebase, scoring, bet-lock, timezone, idempotency, cancelled-match, vitest]
status: complete
last_updated: 2026-06-18
last_updated_by: Jarosław Latek
---

# Research: Scoring & bet-lock core (test-plan Phase 1)

**Date**: 2026-06-18T16:11:26+02:00
**Researcher**: Jarosław Latek
**Git Commit**: a7db188ccf846cb6e3bf1a5ab5d0e1a698305c7d
**Branch**: ms2026_release
**Repository**: betMate

## Research Question

Ground test-plan §3 **Phase 1 — "Scoring & bet-lock core"** against the *current*
code so a plan can be written. The phase must protect three risks from
`context/foundation/test-plan.md` §2:

- **#1** Scoring awards wrong points or silently corrupts the leaderboard (wrong
  W/D/W credit, double-scoring on re-run, accumulation error). Known oracle
  conflict: PRD says **1 pt**, implementation suspected **3 pts**.
- **#3** 5-minute bet lock bypassed via timezone/clock handling → a bet placed or
  edited after kickoff.
- **#5** Cancelled/postponed match mishandled → points wrongly awarded, or bets
  not voided and still counted in stats.

This is a QA-grounding pass (file:line truth for the planner), per §1 principle #3.

## Summary

The phase is well-scoped but research surfaced **more than the plan assumed**, and
two findings change the shape of the plan:

1. **Oracle conflict confirmed and quantified.** Both scoring implementations award
   `3` points; the agreed rule is `1`. A faithful unit test asserting the spec value
   will *fail today* — that failing test is the intended signal (the oracle must be
   the spec, not the constant).
2. **Scoring logic is implemented TWICE** — once in TypeScript (`scoring.service.ts`)
   and once copy-pasted into the Deno edge function (`sync-matches/index.ts`). They
   share no code and each carries its own `POINTS_FOR_CORRECT_BET = 3`. A unit test
   on one runtime gives *zero* signal on the other. The plan must decide whether
   Phase 1 covers one or both, and whether to flag the duplication as a defect.
3. **Risk #5 is effectively unimplemented, not just untested.** There is no bet-void
   path for CANCELED/POSTPONED matches, and `calculateBetStats` lets a cancelled bet
   sit as `pending` forever — which *inflates hit-rate* by shrinking the denominator.
   This is a real correctness bug a unit test will expose, not merely a coverage gap.
4. **Bet lock: the authoritative lock is DB RLS on the Postgres clock** (timezone-safe,
   covers create/edit/delete). The app-layer JS check is correct only while
   `match_datetime` serializes with an explicit offset — and `createBet` has **no
   app-layer check at all** (asymmetry vs update/delete). Existing tests only exercise
   UTC-`Z` strings, so timezone-safety is *assumed, not verified*.

Idempotency (`is_scored`) guards the clean sequential path but is **non-transactional**:
points are written before the match is flagged, so a partial failure or a concurrent
admin+cron run can double-count.

---

## Detailed Findings

### Risk #1 — Scoring correctness, accumulation, idempotency

**Entry points**
- Service: `scoreMatches()` — `src/lib/services/scoring.service.ts:101`
- API trigger: `POST /api/admin/score-matches` — `src/pages/api/admin/score-matches.ts:11`,
  calls `scoreMatches(locals.supabase, dry_run)` at `:52`. Zod body `{ dry_run?: boolean }` (`:7`).
  Gated only by `auth.getUser()` (`:13`) — **no admin-role check despite the `/admin/` path; any
  authenticated user can trigger a full scoring pass.**
- Edge copy: `scoreFinishedMatches(supabase)` — `supabase/functions/sync-matches/index.ts:164`,
  runs inside the cron-driven sync cycle.

Both select unscored work identically: `status = FINISHED AND is_scored = false AND result IS NOT NULL`
(`scoring.service.ts:26-28`, `index.ts:173-175`).

**Points constant — oracle conflict (the headline)**
- `src/lib/services/scoring.service.ts:5` → `const POINTS_FOR_CORRECT_BET = 3;`
- `supabase/functions/sync-matches/index.ts:127` → `const POINTS_FOR_CORRECT_BET = 3;`
- Flat value — **no differentiated W/D/W credit**; a correct HOME_WIN / DRAW / AWAY_WIN all award 3.
- **Test consequence:** assert against the agreed spec (`1`), never `toBe(3)` (that just echoes the
  code back at itself — the §2 anti-pattern). The plan/implementer must reconcile the constant; the
  test is the forcing function.

**Outcome derivation**
- Comparison is exact enum equality: `bet.picked_result === match.result`
  (`scoring.service.ts:126`, `index.ts:207`). Enum `match_outcome = "HOME_WIN" | "DRAW" | "AWAY_WIN"`
  (`src/db/database.types.ts:209`).
- `match.result` is derived only in the edge function from goals — `calculateResult()`
  `index.ts:60-68` (null goals → null result; `>`/`<`/`=` → HOME/AWAY/DRAW). The service trusts
  `matches.result`; `result IS NULL` rows are excluded.

**Accumulation**
- `scores` table keyed `(user_id, tournament_id)` with a `points` running total
  (`database.types.ts:147-149`; `ScoreEntity` `src/types.ts:41`).
- `upsertScore()` `scoring.service.ts:53-84`: `newPoints = (existing?.points || 0) + pointsToAdd`
  (`:67`), then `upsert(..., { onConflict: "user_id,tournament_id" })` (`:69-79`). Edge copy
  `index.ts:209-226`.
- **Non-atomic SELECT-then-UPSERT** → two concurrent runs can both read the same `existing.points`
  and one overwrites the other (**lost points**). No DB-side atomic increment.

**Idempotency**
- Flag `matches.is_scored` (`database.types.ts:87`), checked `.eq("is_scored", false)`
  (`scoring.service.ts:27`, `index.ts:174`), set by `markMatchAsScored()` `scoring.service.ts:89-95`
  (edge `index.ts:239`).
- **Not transactional:** points awarded (`upsertScore`, `:128`) *before* the match is flagged
  (`markMatchAsScored`, `:136`), in separate DB calls. If flagging fails (caught `:140`, pushed to
  `errors`, match stays `is_scored=false`) the **next run re-awards points → double-count**. Per-match
  `try/catch` records but does not roll back. Clean single sequential run: guarded correctly.

### Risk #3 — 5-minute bet lock & timezone

**Three layers, only one authoritative.**

1. **DB RLS (authoritative, timezone-safe)** — `supabase/migrations/20251028120000_initial_schema.sql`:
   - INSERT `:250-261`, UPDATE `:267-279`, DELETE `:285-296`, each with
     `matches.match_datetime > (now() + interval '5 minutes') and matches.status = 'SCHEDULED'`.
   - `now()` = Postgres `transaction_timestamp()` (UTC); `match_datetime` is `timestamptz`
     (`:91`, comment `:107` "in UTC"). Comparing two `timestamptz` is timezone-safe. **This is the
     real lock and it covers create, edit, and delete.**

2. **App-layer service (`src/lib/services/bet.service.ts`)**
   - `createBet` `:46-62` — **NO time/status check.** Relies entirely on RLS. (Asymmetry: if RLS
     were ever bypassed — service-role client, future refactor — bets could be created post-kickoff.)
   - `updateBet` `:142-154` and `deleteBet` `:278-290` — `new Date(match.match_datetime).getTime() - new Date().getTime() <= 5*60*1000` → 403.
   - **Timezone note:** `new Date(iso).getTime()` is UTC-absolute *iff* the ISO string carries an
     offset/`Z`. PostgREST emits `timestamptz` with offset, so it's correct today — but untested under
     a non-UTC server `TZ` and untested against offset-less strings. App `new Date()` vs DB `now()`
     are two clocks: skew yields inconsistent 403s (UX), not a bypass (DB is authoritative on write).

3. **Client-side (cosmetic only)** — `src/components/matches/MatchCard.tsx:71-77` and
   `src/lib/utils/bet-utils.ts:75-87` (`canDeleteBet`) use the **browser clock** (`Date.now()`).
   User-controllable; UI-gating only; must **not** be treated as enforcement.

| Path | App-layer lock | DB RLS lock |
|------|----------------|-------------|
| Create (`POST /api/bets`) | **MISSING** (`bet.service.ts:46`) | Yes (`:250`) |
| Edit (`PUT /api/bets/[id]`) | Yes (`bet.service.ts:142`) | Yes (`:267`) |
| Delete (`DELETE /api/bets/[id]`) | Yes (`bet.service.ts:278`) | Yes (`:285`) |

API routes do no time check, delegating to the service: `src/pages/api/bets.ts:83`,
`src/pages/api/bets/[id].ts:111` (PUT), `:213` (DELETE). Create schema validates only `match_id`
+ `picked_result` (`src/lib/validation/bet.validation.ts:7-16`).

### Risk #5 — Cancelled / postponed match handling

**Status enum** (`database.types.ts:210-216`; SQL `…initial_schema.sql:30`):
`SCHEDULED | IN_PLAY | FINISHED | POSTPONED | CANCELED`. api-football → internal mapping
`sync-matches/index.ts:29-58` (`PST→POSTPONED`; `CANC/ABD/AWD/WO→CANCELED`).

**Scoring only ever touches FINISHED** (`scoring.service.ts:26`) — CANCELED/POSTPONED are never
fetched, so they never (wrongly) score. *That part is correct.* The bug is downstream:

- **No bet-void path exists.** There is no `bet_status` column and no code that marks/voids bets when
  a match is canceled/postponed. (Schema `bets`: only `picked_result`, no status.)
- `getBetDisplayStatus()` `src/lib/utils/bet-utils.ts:52-66`: CANCELED/POSTPONED have
  `status !== "SCHEDULED"` but `result === null`, so they fall to the `result === null → "pending"`
  branch and stay **`pending` forever** (they never transition to FINISHED).
- `calculateBetStats()` `bet-utils.ts:107-127`: `hitRate = hits / (hits + misses)` — a perpetually
  `pending` cancelled bet is **excluded from the denominator → inflated hit-rate.**
  Worked example: 1 correct + 1 wrong + 1 cancelled shows 50% (1/2); had the cancelled match instead
  finished as a loss it'd be 33% (1/3).
- `getUserBets()` `bet.service.ts:327-395` returns all bets with no `match.status` filter — cancelled
  bets surface in the list as `pending`.
- Leaderboard is unaffected (it reads `scores`, populated only by FINISHED scoring) —
  `leaderboard.service.ts:72-109`.

**Implication for the plan:** Risk #5 is largely a *missing-behavior* finding. A unit test on
`getBetDisplayStatus` / `calculateBetStats` asserting "cancelled bets are voided / excluded" will
fail because the behavior doesn't exist. The plan must decide Phase-1 scope: pin current behavior with
a documented-known-bug test, or pair the test with the minimal fix. Either way these two pure
functions (`bet-utils.ts`) are cheap, high-signal unit targets — no Supabase mock needed.

### Test base & how to add a unit test (cookbook grounding for §6.1)

- **Vitest config** `vitest.config.ts`: env `node` (`:7`), globals `true` (`:6`), setup
  `./tests/setup.ts` (`:21`), include `src/**/*.{test,spec}.ts` (`:8`), exclude `e2e/**` (`:9`),
  10s timeouts (`:22-23`), `@`→`./src`. Coverage v8, thresholds lines 70 / branches 60 /
  functions 80 / statements 70 (`:10-19`), excludes `src/components/ui/**` + `database.types.ts`.
- **Run commands** (`package.json:14-20`): `npm test` (= `vitest run`), `npm run test:watch`,
  `npm run test:coverage`, `npm run test:ui`.
- **Reference tests** (co-located in `src/lib/services/`):
  - `scoring.service.test.ts` — 21 tests across happy-path / dryRun / edge / error / business-rules.
    Note `it("should award exactly 3 points…")` **encodes the wrong oracle** and will need updating.
    Inline Supabase mock via chained `vi.fn().mockReturnThis()` (`:7-22`); `scoreMatches(mock as …)`.
  - `bet.service.test.ts` — 28 tests; `createBet`(2), `updateBet`(9, incl. "exactly 5 minutes → 403"),
    `deleteBet`(7), `getUserBets`(8). All time fixtures use `new Date(Date.now()±N).toISOString()`
    → **UTC-`Z` only; no non-UTC `TZ`, no offset/offset-less variants.** `new BetService(mockSupabase)`.
- **No unit factories/builders yet** — mocks are inline. `tests/setup.ts` is just empty
  before/after hooks. Opportunity: a tiny match/bet factory to keep new boundary tests readable.
- Inventory: 2 unit files (above) + 5 Playwright e2e specs under `tests/e2e/specs/` with POM in
  `tests/e2e/pages/` and an `auth.fixture.ts` (Phase 3 territory, not Phase 1).

## Code References

- `src/lib/services/scoring.service.ts:5` — `POINTS_FOR_CORRECT_BET = 3` (oracle conflict, spec=1)
- `src/lib/services/scoring.service.ts:26-28` — unscored query (FINISHED only, idempotency filter)
- `src/lib/services/scoring.service.ts:53-84` — non-atomic `upsertScore` accumulation
- `src/lib/services/scoring.service.ts:101-147` — `scoreMatches` award-then-flag (non-transactional)
- `supabase/functions/sync-matches/index.ts:60-68` — `calculateResult` (only place result is derived)
- `supabase/functions/sync-matches/index.ts:127` — **duplicate** `POINTS_FOR_CORRECT_BET = 3`
- `supabase/functions/sync-matches/index.ts:164-239` — duplicate scoring path (`scoreFinishedMatches`)
- `src/pages/api/admin/score-matches.ts:11-52` — trigger, authn-only (no admin-role gate)
- `src/lib/services/bet.service.ts:46-62` — `createBet` with NO app-layer lock
- `src/lib/services/bet.service.ts:142-154` — `updateBet` 5-min lock (app clock)
- `src/lib/services/bet.service.ts:278-290` — `deleteBet` 5-min lock (app clock)
- `supabase/migrations/20251028120000_initial_schema.sql:250-296` — RLS INSERT/UPDATE/DELETE locks (authoritative)
- `src/components/matches/MatchCard.tsx:71-77` — client-clock lock (cosmetic)
- `src/lib/utils/bet-utils.ts:52-66` — `getBetDisplayStatus` (cancelled → pending forever)
- `src/lib/utils/bet-utils.ts:107-127` — `calculateBetStats` (hit-rate denominator inflation)
- `src/db/database.types.ts:209-216` — `match_outcome` + `match_status` enums
- `vitest.config.ts:6-23` — unit test config; `package.json:14-20` — scripts
- `src/lib/services/scoring.service.test.ts`, `src/lib/services/bet.service.test.ts` — reference tests

## Architecture Insights

- **Two-runtime duplication** of business-critical scoring (TS service + Deno edge) with no shared
  source of truth is the dominant structural risk for #1. Tests on one runtime do not protect the
  other; reconciling the constant in one file silently leaves the other wrong.
- **Layered enforcement, single source of truth at the DB.** Bet lock and "only-FINISHED scores"
  both ultimately depend on the Postgres clock / RLS. App and client layers are convenience/UX and
  are individually weaker — useful to test as "defense in depth," but the contract lives in SQL.
- **Pure functions are the cheapest high-signal targets.** `bet-utils.ts` (#5) needs no Supabase mock;
  the scoring/bet services use an inline chained-mock pattern that already exists and can be extended.
- **Non-transactional write sequences** (award→flag, read→upsert) are the idempotency/accumulation
  weak points for #1 — testable at unit level by simulating a mid-sequence failure with the mock.

## Historical Context (from prior changes)

- `context/foundation/test-plan.md:47,70` — pre-registered the exact 1-vs-3 oracle conflict and the
  "don't assert the constant at itself" anti-pattern; this research confirms it in code.
- `context/foundation/test-plan.md:86` — Phase 1 row (risks #1/#3/#5, unit + boundary/edge).
- No prior `context/changes/**` or `context/archive/**` research exists for these areas (first pass).

## Related Research

- None yet — this is the first research artifact under `context/changes/`. Phase 2 will produce the
  integration-layer counterpart (sync contract, IDOR, DB-coupled scoring).

## Open Questions

1. **Phase-1 scope of the oracle fix:** does Phase 1 (a) only *encode* the spec=1 oracle in a failing
   test and leave the fix to a follow-up, or (b) fix `POINTS_FOR_CORRECT_BET` (both copies) within the
   change? Plan must state which, since a red test on `main` affects the CI gate (§5).
2. **One runtime or both?** Should Phase-1 unit tests cover only `scoring.service.ts`, or also assert
   the edge `scoreFinishedMatches` (Deno) — or should the duplication itself be filed as a defect to
   collapse into one shared module first?
3. **Risk #5 — pin or fix?** Document the cancelled-bet/hit-rate inflation as a known bug via a test
   that asserts *current* behavior, or write the test against *desired* behavior (void/exclude) and
   pair it with the minimal `bet-utils.ts` fix?
4. **Timezone test mechanism:** assert lock correctness by running a test with `process.env.TZ` set to
   a non-UTC zone and/or feeding offset-bearing vs offset-less `match_datetime` strings — confirm
   Vitest honors `TZ` in the `node` env, or set it in `tests/setup.ts`.
5. **Idempotency unit coverage:** is simulating the award-succeeds / flag-fails double-count window
   via the existing inline mock sufficient, or does this risk belong in Phase 2 (real DB) instead?
