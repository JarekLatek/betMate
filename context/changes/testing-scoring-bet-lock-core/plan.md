# Scoring & Bet-Lock Core — Test Rollout Phase 1 Implementation Plan

## Overview

Phase 1 of the project's test rollout (`test-plan.md` §3 Phase 1): lock the
deterministic, highest-stakes logic with **unit + boundary tests**, taking every
oracle from the *agreed spec*, not from the implementation under test. The phase
protects three risks:

- **#1** Scoring awards wrong points / corrupts the leaderboard (wrong credit,
  double-scoring on re-run, accumulation error).
- **#3** 5-minute bet lock bypassed via timezone / clock handling.
- **#5** Cancelled / postponed match mishandled in bet stats.

To make the oracle single-sourced and the tests honest, the phase carries three
small, surgical code changes the planning decisions require (a rule collapse, a
bet-utils void-status fix) plus a decision record. It is otherwise a test-authoring
phase — it does **not** rewrite the scoring engine or add a DB transaction layer.

## Current State Analysis

Grounded by `context/changes/testing-scoring-bet-lock-core/research.md` (read it for
file:line truth). Key facts that shape this plan:

- **Scoring is implemented twice.** `src/lib/services/scoring.service.ts:101`
  (Node/Astro) and a copy-pasted Deno edge function `supabase/functions/sync-matches/index.ts:164`.
  Each carries its own `const POINTS_FOR_CORRECT_BET = 3` (`scoring.service.ts:5`,
  `index.ts:127`). They share no code. A test on one gives zero signal on the other.
- **Oracle conflict, now resolved.** Research recorded "PRD says 1pt, code uses 3pt."
  **Decision (2026-06-18): the agreed rule is 3pt for a correct outcome, 0 for wrong** —
  the code is correct. There is **no `prd.md` on disk**, so the decision is recorded in
  `test-plan.md` + `change.md`, not in a PRD. A richer future "Toto" model (exact
  scoreline = 3, correct outcome only = 1) is documented as a *deferred* enhancement;
  it is unbuildable today because bets store only an outcome enum, no predicted goals
  (`bets` table `…initial_schema.sql:83-91`; `bet.validation.ts:11`).
- **Scoring is flat & outcome-only.** Award = exact enum equality
  `bet.picked_result === match.result` (`scoring.service.ts:126`). A correct
  HOME_WIN / DRAW / AWAY_WIN all pay the same. `match.result` is derived from goals
  only in the edge function (`calculateResult()` `index.ts:60-68`).
- **Idempotency is non-transactional.** `scoreMatches` awards points (`upsertScore`,
  `:128`) *before* flagging the match (`markMatchAsScored`, `:136`), in separate DB
  calls. If flagging fails, the match stays `is_scored=false` and the next run
  **re-awards → double-count**. The clean sequential path is guarded correctly.
- **Bet lock has three layers; only the DB is authoritative.** RLS on the Postgres
  clock covers create/edit/delete and is timezone-safe (`…initial_schema.sql:250-296`).
  The app-layer service checks edit/delete (`bet.service.ts:142`, `:278`) but
  **`createBet` has no app-layer time check** (`bet.service.ts:46`). Existing tests use
  **UTC-`Z` strings only** — timezone-safety is assumed, not verified.
- **Cancelled/postponed stats are mislabelled, not mis-counted.** `getBetDisplayStatus`
  (`bet-utils.ts:52-67`) returns `"pending"` for CANCELED/POSTPONED (status≠SCHEDULED
  but result=null). `calculateBetStats` (`:107-127`) already *excludes* non-hit/miss
  from the hit-rate denominator (`resolved = hits + misses`, `:123`), so the rate is
  **not numerically inflated** — the real defect is semantic: a voided bet looks
  "pending" (still live) forever and is lumped into the pending count.
- **Test base.** Vitest `node` env, globals on, setup `tests/setup.ts` (empty hooks),
  include `src/**/*.{test,spec}.ts`, `@`→`./src` (`vitest.config.ts`). Reference tests
  co-located: `scoring.service.test.ts` (inline chained `vi.fn().mockReturnThis()`
  Supabase mock), `bet.service.test.ts`. Run: `npm test` (= `vitest run`),
  `npm run test:watch`, `npm run test:coverage`.

## Desired End State

- A single shared, pure scoring-rule module is the **only** home of
  `POINTS_FOR_CORRECT_BET` and the correct/incorrect decision; both runtimes import it.
- Unit tests assert scoring points from the recorded **3pt** decision (oracle cited,
  never `toBe(code-constant)` in spirit), cover cross-match accumulation, the clean
  re-run idempotency guard, and pin the non-transactional double-count window as a
  documented known-bug with a Phase-2 fix pointer.
- Bet-lock boundary tests run under a **non-UTC `TZ`** and exercise offset-bearing and
  offset-less `match_datetime` strings for edit + delete; the `createBet` no-app-lock
  asymmetry is documented as a boundary note.
- `bet-utils.ts` distinguishes a **void** status for CANCELED/POSTPONED; tests pin that
  voids are excluded from the hit-rate denominator and no longer reported as pending.
- `test-plan.md` §2/§6.1 record the resolved oracle and the deferred Toto model;
  `test-plan.md` §6.1 "Run locally" is filled in. CI unit gate (§5) can be required.

### Verify it:

- `npm test` is **green** (no red/oracle-conflict tests left on the branch).
- `npm run test:coverage` shows new coverage on `src/lib/scoring/`,
  `scoring.service.ts`, `bet.service.ts`, `bet-utils.ts`.
- `npm run lint` and `npm run build` (typecheck) pass.
- The edge function still builds/deploys (Phase 1 manual gate).

### Key Discoveries:

- Pure scoring rule is runtime-agnostic and DB-free → cheap to share across Node + Deno
  (`scoring.service.ts:126`, `index.ts:207`).
- Idempotency double-count is real but only fixable safely with a DB transaction/RPC —
  out of unit scope, belongs to Phase 2 (`scoring.service.ts:128,136`).
- Offset-less `new Date("2026-06-01T12:00:00")` is parsed as **local** time → the actual
  timezone bypass class to exercise (`bet.service.ts:148`, `bet-utils.ts:82`).
- Hit-rate is already void-safe by accident; the fix formalizes intent (`bet-utils.ts:123`).

## What We're NOT Doing

- **Not** changing `POINTS_FOR_CORRECT_BET` (3 is the agreed rule).
- **Not** building the future "Toto" exact-score model (schema + UI + scoring rewrite) —
  documented as deferred only.
- **Not** collapsing the scoring *orchestration* (query/upsert/flag) across runtimes —
  only the pure rule. The edge-deploy toolchain risk is not worth it mid-tournament.
- **Not** adding a DB transaction / atomic-increment / RPC to fix the idempotency window
  or the non-atomic accumulation — that is Phase 2 (real Supabase).
- **Not** adding a `bet_status` column or a server-side bet-void path for cancelled
  matches — Phase 2. Phase 1 only fixes the client-side display/stats semantics.
- **Not** touching IDOR, sync-contract, auth/middleware, or leaderboard tie-rank — those
  are Phases 2/3 (`test-plan.md` §3).
- **Not** testing the Deno edge orchestration directly (no Deno test harness this phase).

## Implementation Approach

Four phases, ordered so the shared oracle lands first and everything else builds on a
green base. Each phase is independently verifiable; Phases 3 and 4 are independent of
1–2 and of each other. Every test takes expected values from the agreed spec (the 3pt
decision; the 5-minute boundary; void exclusion), never echoed from the code under test.

## Critical Implementation Details

- **Cross-runtime import.** The shared rule module must stay import-clean for Deno: no
  `@/` path-alias imports, no Node built-ins. Keep it dependency-free (inline the
  `"HOME_WIN" | "DRAW" | "AWAY_WIN"` union or import a type-only). The Deno function
  imports it by **relative path** (`../../../src/lib/scoring/score-rule.ts`); confirm
  `supabase functions deploy` (or `deno check supabase/functions/sync-matches/index.ts`)
  still bundles. **Fallback if Deno bundling rejects the cross-dir import:** keep the
  constant in the shared module as the canonical source, and in the edge function
  re-declare it with a comment `// MUST equal src/lib/scoring/score-rule.ts` — documented,
  not silently divergent.
- **`TZ` in Vitest.** Node reads `TZ` at process start; flipping `process.env.TZ` mid-test
  is unreliable. Set the non-UTC zone **process-wide** for the run (e.g. `vitest.config.ts`
  `test.env.TZ` or the test script) so `new Date()` parsing of offset-less strings actually
  shifts. Verify with a sanity assertion that the run is not in UTC.

---

## Phase 1: Scoring rule collapse + oracle lock

### Overview

Extract the pure scoring rule into one shared module, wire both runtimes to it, record
the oracle decision, and unit-test the rule once against the 3pt spec.

### Changes Required:

#### 1. Shared pure scoring rule

**File**: `src/lib/scoring/score-rule.ts` (new)

**Intent**: Single source of truth for the points rule so the oracle (risk #1) lives in
exactly one place. Pure, DB-free, import-clean for both Node and Deno.

**Contract**: Exports `POINTS_FOR_CORRECT_BET = 3` (doc comment cites the 2026-06-18
decision + the deferred Toto model) and a pure
`pointsForBet(picked: MatchOutcome, result: MatchOutcome | null): number` returning
`POINTS_FOR_CORRECT_BET` when `result !== null && picked === result`, else `0`. No
imports beyond a local/type-only outcome union.

#### 2. Wire the TS service to the shared rule

**File**: `src/lib/services/scoring.service.ts`

**Intent**: Remove the local `POINTS_FOR_CORRECT_BET` and use the shared rule, so a
future change cannot diverge the constant in this copy.

**Contract**: Delete `:5` const; import from `@/lib/scoring/score-rule`; the award branch
(`:126-130`) uses `pointsForBet(...)` (or the shared constant). No behavior change.

#### 3. Wire the Deno edge function to the shared rule

**File**: `supabase/functions/sync-matches/index.ts`

**Intent**: Same single-source guarantee on the edge copy.

**Contract**: Replace `:127` const with a relative import of `score-rule.ts` (or the
documented fallback re-declaration). Award branch `:207-233` unchanged in behavior.

#### 4. Record the oracle decision + deferred model

**File**: `context/foundation/test-plan.md`, `context/changes/testing-scoring-bet-lock-core/change.md`

**Intent**: Make the spec a recorded human decision (not the code echoing itself), since
no `prd.md` exists.

**Contract**: In `test-plan.md` §2 row #1 Source and §6.1 oracle note, change the
"PRD states 1pt vs impl 3pt — conflict" wording to "Resolved 2026-06-18: agreed rule =
3pt; future Toto model deferred (see change `testing-scoring-bet-lock-core`)." Add the
deferred Toto model to §7 (negative-space) or a one-line note. Append the decision to
`change.md` Notes.

#### 5. Unit test the pure rule

**File**: `src/lib/scoring/score-rule.test.ts` (new)

**Intent**: Pin the oracle once.

**Contract**: Assert `pointsForBet` returns `3` for each correct outcome (HOME_WIN,
DRAW, AWAY_WIN), `0` for a wrong pick, and `0` when `result === null`. A comment cites
the 3pt decision as the oracle source.

### Success Criteria:

#### Automated Verification:

- New module + test exist: `src/lib/scoring/score-rule.ts`, `score-rule.test.ts`
- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Typecheck/build passes: `npm run build`

#### Manual Verification:

- Edge function still bundles/deploys (or fallback re-declaration documented):
  `deno check supabase/functions/sync-matches/index.ts` and/or `supabase functions deploy sync-matches`
- `test-plan.md` §2/§6.1 + `change.md` reflect the resolved oracle and deferred model
- A spot scoring run (admin trigger or dry_run) still awards 3 per correct bet

**Implementation Note**: After automated verification passes, pause for human
confirmation that the edge function still deploys before proceeding.

---

## Phase 2: Scoring service correctness (accumulation + idempotency)

### Overview

Extend the existing `scoring.service.test.ts` to cover cross-match accumulation, the
clean re-run idempotency guard, and the non-transactional double-count window (pinned as
a documented known-bug with a Phase-2 fix pointer).

### Changes Required:

#### 1. Reconcile the existing oracle test

**File**: `src/lib/services/scoring.service.test.ts`

**Intent**: The existing `it("should award exactly 3 points…")` currently echoes the
code constant; reframe it to cite the 3pt decision as the oracle.

**Contract**: Keep the `3` assertion but reference the decision in the test name/comment;
optionally assert via the shared rule so the source is explicit.

#### 2. Accumulation across matches

**File**: `src/lib/services/scoring.service.test.ts`

**Intent**: Prove a user correct in N matches accrues N×3 into `scores.points`.

**Contract**: Mock two unscored matches with the same user correct in both; assert the
second `upsertScore` reads the prior total and writes the sum (`scoring.service.ts:67`).

#### 3. Clean re-run idempotency (green)

**File**: `src/lib/services/scoring.service.test.ts`

**Intent**: Prove a normal second run awards nothing once matches are flagged.

**Contract**: Mock the unscored query returning `[]` (all `is_scored=true` filtered out);
assert `updated_scores === 0` and no `upsert` call.

#### 4. Non-transactional double-count window (pinned known-bug)

**File**: `src/lib/services/scoring.service.test.ts`

**Intent**: Document the dangerous award-ok / flag-fails seam at unit level.

**Contract**: Mock `upsertScore` success but `markMatchAsScored` (the matches `update`)
failing → assert the error is recorded and the match is *not* flagged; a comment marks
this as the **KNOWN double-count window** to be fixed atomically in Phase 2. (Test asserts
current behavior; it must not claim re-run safety the code doesn't provide.)

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- New tests cover accumulation, clean re-run, and the flag-fail window
- Lint passes: `npm run lint`

#### Manual Verification:

- The known-bug test reads clearly as documenting a defect, with a Phase-2 pointer
- Coverage on `scoring.service.ts` increased (`npm run test:coverage`)

**Implementation Note**: Pause for human confirmation after automated verification.

---

## Phase 3: Bet-lock boundary & timezone

### Overview

Extend `bet.service.test.ts` to verify the 5-minute lock under a non-UTC `TZ` and across
offset-bearing / offset-less `match_datetime` strings, for edit and delete; document the
`createBet` no-app-lock asymmetry.

### Changes Required:

#### 1. Non-UTC test timezone

**File**: `vitest.config.ts` (and/or `tests/setup.ts`)

**Intent**: Make offset-less date parsing actually shift, so the timezone bypass class is
exercised.

**Contract**: Set `test.env.TZ` to a non-UTC zone (e.g. `America/New_York`). Add a sanity
assertion in the new tests that the run is not UTC. See Critical Implementation Details.

#### 2. Boundary tests for edit/delete across date formats

**File**: `src/lib/services/bet.service.test.ts`

**Intent**: Prove the lock holds at the 5-minute boundary regardless of timezone and
string format.

**Contract**: For `updateBet` and `deleteBet`, add cases with `match_datetime` as: `Z`
(UTC), explicit offset (`+02:00`), and **offset-less** local-style strings, around the
exact 5-minute boundary (just-inside → 403, just-outside → allowed). Reuse the existing
`new BetService(mockSupabase)` pattern.

#### 3. Document the createBet asymmetry

**File**: `src/lib/services/bet.service.test.ts`

**Intent**: Make the create-path gap explicit so it isn't mistaken for covered.

**Contract**: A test (or documented assertion) noting `createBet` performs **no** app-layer
time check and relies on DB RLS — a boundary note, not a unit failure; flags RLS as the
authoritative lock for create.

### Success Criteria:

#### Automated Verification:

- Tests run under a non-UTC `TZ`; sanity assertion confirms it
- Unit tests pass: `npm test`
- Offset / offset-less / boundary cases present for edit + delete
- Lint passes: `npm run lint`

#### Manual Verification:

- Confirm Vitest honors the configured `TZ` (offset-less fixture shifts as expected)
- The createBet asymmetry note is clear about RLS being authoritative

**Implementation Note**: Pause for human confirmation after automated verification.

---

## Phase 4: Cancelled/postponed handling (risk #5)

### Overview

Give CANCELED/POSTPONED bets a distinct **void** display status (so they stop
masquerading as `pending`), keep them excluded from the hit-rate denominator, and pin
that with tests.

### Changes Required:

#### 1. Void status in bet-utils

**File**: `src/lib/utils/bet-utils.ts`

**Intent**: Distinguish a voided bet from a live pending one.

**Contract**: Extend `BetDisplayStatus` (`:47`) with `"void"`; `getBetDisplayStatus`
(`:52-67`) returns `"void"` when `match.status` is `CANCELED` or `POSTPONED`. Pending
remains only for SCHEDULED / not-yet-resulted.

#### 2. Stats account for void separately

**File**: `src/lib/utils/bet-utils.ts`

**Intent**: Surface voids without polluting pending, and keep the hit-rate denominator
void-safe explicitly.

**Contract**: `BetStatsData` (`:96-102`) gains a `void` count; `calculateBetStats`
(`:107-127`) increments `void` for `"void"` status and keeps `resolved = hits + misses`
(voids excluded). No change to the numeric hit-rate formula — only intent made explicit.

#### 3. Tests for void handling

**File**: `src/lib/utils/bet-utils.test.ts` (new — no Supabase mock needed)

**Intent**: Pin desired void semantics and the exclusion.

**Contract**: Assert `getBetDisplayStatus` returns `"void"` for CANCELED and POSTPONED;
assert `calculateBetStats` over {1 hit, 1 miss, 1 cancelled} yields `hitRate === 50`
(void excluded, *not* counted as a loss → not 33) and `void === 1`, `pending === 0`.

### Success Criteria:

#### Automated Verification:

- New test file exists and passes: `src/lib/utils/bet-utils.test.ts`
- Unit tests pass: `npm test`
- Lint + build pass: `npm run lint`, `npm run build`

#### Manual Verification:

- A cancelled bet renders as voided (not "pending") wherever `getBetDisplayStatus` feeds
  the UI (`src/components/my-bets`, `src/components/matches`)
- No regression in existing my-bets stats display

**Implementation Note**: Pause for human confirmation after automated verification.

---

## Testing Strategy

### Unit Tests:

- Pure scoring rule: correct=3 / wrong=0 / null-result=0 across all outcomes.
- Scoring service: accumulation, clean re-run idempotency, flag-fail double-count window.
- Bet service: 5-min lock at boundary under non-UTC TZ + offset/offset-less strings;
  createBet asymmetry note.
- bet-utils: void status + void-excluded hit-rate.

### Integration Tests:

- None this phase. Deferred to `test-plan.md` §3 Phase 2 (real Supabase): atomic
  idempotency/accumulation, sync contract, IDOR, server-side bet-void path.

### Manual Testing Steps:

1. `npm test` green; `npm run test:coverage` shows new coverage on the four targets.
2. `deno check supabase/functions/sync-matches/index.ts` (and/or deploy) succeeds.
3. Trigger a scoring pass (admin `dry_run`) and confirm 3 points per correct bet.
4. In the UI, view a cancelled-match bet and confirm it shows as voided, not pending.

## Performance Considerations

None. All changes are pure logic or test code; no new queries or hot-path work.

## Migration Notes

No schema or data migration. The deferred Toto model (predicted-goals columns + UI +
scoring rewrite) is explicitly out of scope and would be its own change.

## References

- Research: `context/changes/testing-scoring-bet-lock-core/research.md`
- Test plan: `context/foundation/test-plan.md` (§2 risks, §3 Phase 1, §5 gates, §6.1 cookbook)
- Scoring: `src/lib/services/scoring.service.ts:5,101-147`; edge `supabase/functions/sync-matches/index.ts:127,164-239`
- Bet lock: `src/lib/services/bet.service.ts:46,142,278`; RLS `supabase/migrations/20251028120000_initial_schema.sql:250-296`
- Stats: `src/lib/utils/bet-utils.ts:47-127`
- Reference tests: `src/lib/services/scoring.service.test.ts`, `src/lib/services/bet.service.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Scoring rule collapse + oracle lock

#### Automated

- [x] 1.1 New module + test exist (score-rule.ts, score-rule.test.ts)
- [x] 1.2 Unit tests pass (npm test)
- [x] 1.3 Lint passes (npm run lint)
- [x] 1.4 Typecheck/build passes (npm run build)

#### Manual

- [x] 1.5 Edge function still bundles/deploys (or fallback documented) — `deno check` passes, cross-dir import resolves
- [x] 1.6 test-plan.md §2/§6.1 + change.md reflect resolved oracle + deferred model
- [ ] 1.7 Spot scoring run awards 3 per correct bet — DEFERRED: empty test DB, no signal without seed

### Phase 2: Scoring service correctness

#### Automated

- [ ] 2.1 Unit tests pass (npm test)
- [ ] 2.2 New tests cover accumulation, clean re-run, flag-fail window
- [ ] 2.3 Lint passes (npm run lint)

#### Manual

- [ ] 2.4 Known-bug test reads as documenting a defect with Phase-2 pointer
- [ ] 2.5 Coverage on scoring.service.ts increased

### Phase 3: Bet-lock boundary & timezone

#### Automated

- [ ] 3.1 Tests run under non-UTC TZ with sanity assertion
- [ ] 3.2 Unit tests pass (npm test)
- [ ] 3.3 Offset / offset-less / boundary cases present for edit + delete
- [ ] 3.4 Lint passes (npm run lint)

#### Manual

- [ ] 3.5 Vitest honors configured TZ (offset-less fixture shifts)
- [ ] 3.6 createBet asymmetry note clear about RLS being authoritative

### Phase 4: Cancelled/postponed handling

#### Automated

- [ ] 4.1 New test file exists and passes (bet-utils.test.ts)
- [ ] 4.2 Unit tests pass (npm test)
- [ ] 4.3 Lint + build pass

#### Manual

- [ ] 4.4 Cancelled bet renders as voided (not pending) in UI
- [ ] 4.5 No regression in my-bets stats display
