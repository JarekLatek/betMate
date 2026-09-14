---
date: 2026-09-14T15:32:48+02:00
researcher: Jarosław Latek
git_commit: 466c7c2af2c955e8525f225e75ca25194165e1f0
branch: 10xArchitect_cert
repository: betMate
topic: "Refactor opportunities in the finished-match → scoring → leaderboard flow"
tags: [research, refactor-opportunities, scoring, sync-matches, leaderboard, supabase]
status: complete
last_updated: 2026-09-14
last_updated_by: Jarosław Latek
---

# Research: Refactor opportunities in the scoring flow

**Date**: 2026-09-14T15:32:48+02:00

**Researcher**: Jarosław Latek

**Git Commit**: `466c7c2af2c955e8525f225e75ca25194165e1f0`

**Branch**: `10xArchitect_cert`

**Repository**: `betMate`

## Research Question

Which of the problems recorded in `context/changes/scoring-flow-analysis/research.md`
are worth fixing, in what target shape and in what order? Each recorded problem is
explored in code and history, then ordered as refactor opportunities. This is an
exploration-only step: no refactor is performed and no decision is taken here. The
ranking at the end is a proposal for a separate planning session.

Priors read: `scoring-flow-analysis/research.md` (including its `Decision gate
outcome`), `context/map/repo-map.md`, `context/foundation/test-plan.md`,
`context/changes/testing-scoring-bet-lock-core/{change,research,plan,plan-brief}.md`.
There is no `context/foundation/lessons.md`. Source code under `src/`, `supabase/` and
`tests/` is unchanged between the prior research commit `c323606` and this commit, so
its `file:line` references remain valid.

Binding owner decisions from the prior gate: (1) flow boundary confirmed; (2) the
manual `POST /api/admin/score-matches` path is **diagnostic**, the Edge Function is the
only production scoring orchestration; (3) zero-point bettors **should** appear in the
leaderboard; (4) **three** points per correct 1X2 result.

## Candidate enumeration and classification

Every problem the prior report records, regardless of its label (TD, inference,
unknown, evidence-level observation), plus problems surfaced by this exploration
(marked _new_). **Candidate** = fixing it would change code structure. Everything else is
kept as input to feasibility and cost.

| #   | Problem                                                                                                         | Source in prior report               | Classification                              |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- |
| P1  | Scoring orchestration implemented twice (Node service, Deno Edge)                                               | TD1                                  | **Candidate → C1**                          |
| P2  | Shared `pointsForBet` never called in production; only the constant is shared                                   | §4, verification table               | **Candidate → C1** (same root)              |
| P3  | Read-add-UPSERT accumulation is not atomic (lost update / double award under concurrency)                       | TD2                                  | **Candidate → C2**                          |
| P4  | Points awarded before the separate `is_scored` flag (retry after flag failure double-awards)                    | TD2                                  | **Candidate → C2**                          |
| P5  | _new_ Score-read error ignored → total treated as 0 → UPSERT overwrites accumulated points with 3               | —                                    | **Candidate → C2** (same write path)        |
| P6  | Edge continues after a failed UPSERT and still marks the match scored (award lost permanently)                  | TD3                                  | **Candidate → C3**                          |
| P7  | Manual endpoint checks authentication only, no admin authority                                                  | TD4                                  | **Candidate → C4**                          |
| P8  | Manual endpoint runs a privileged batch through the RLS-scoped session client                                   | TD4, §3                              | **Candidate → C4**                          |
| P9  | Rank computed in memory after DB pagination; page 2+ restarts at rank 1; cross-page ties lost                   | TD5                                  | **Candidate → C5**                          |
| P10 | Sticky user row (and participant count) derived only from client-loaded entries                                 | §5                                   | **Candidate → C5** (same root)              |
| P11 | Leaderboard participant = `scores` row; zero-point bettors absent (owner: should be visible)                    | TD6                                  | **Candidate → C6** (business-concept check) |
| P12 | Outcome/status vocabulary repeated across SQL, generated types, Edge, rule, validation                          | §4                                   | **Candidate → C7**                          |
| P13 | Critical-path test imbalance: Node path tested, production Edge path, RLS, concurrency and ranking untested     | TD7                                  | Input — feasibility/cost                    |
| P14 | Leaderboard E2E passes without asserting points or rank                                                         | Test coverage                        | Input — feasibility/cost                    |
| P15 | Unknown provider status silently maps to `SCHEDULED`                                                            | §1 (evidence)                        | Input — belongs to ACL analysis (M4L5)      |
| P16 | Desired behavior when the provider corrects a result after scoring is undefined                                 | Unknowns                             | Not a candidate — business rule undecided   |
| P17 | Cancelled/postponed handling (PRD FR-010); _new_: a stored `POSTPONED` match is never re-polled                 | Decision outcome "still open"        | Not a candidate — business-concept redesign |
| P18 | Deployed migrations/RLS/secrets, scheduler, gateway and Edge bundle state unknown                               | Unknowns                             | Input — feasibility risk                    |
| P19 | Documentation/config drift (1-point rule in README, api-plan, ui-plan; `TOURNAMENT_IDS` vs PRD; stale statuses) | repo-map risk zone; Decision outcome | Input — documentation, not structure        |
| P20 | _new_ Scoring selects are unpaginated; local `max_rows = 1000` can silently truncate matches or bets            | —                                    | Input — folds into C2 feasibility           |

Out of this flow and not examined here: bet-lock clock duplication and bet ownership
(repo-map risk zone; M4L5 invariant candidate), missing `GET /api/matches/[id]` route.

## Summary

Seven structural candidates were explored through three read-only lenses (current
shape, history/intentionality, migration feasibility).

- **History reverses the "legacy constraint" reading for almost everything.** The
  design documents specified the _correct_ shape: atomic
  `DO UPDATE SET points = scores.points + points_to_add` in per-match transactions,
  `RANK()` in SQL before `LIMIT/OFFSET`, an UPSERT for every bet (which would create
  zero-point rows), a service-role-only manual trigger, and "is_scored still FALSE" on
  failure (`.ai/api-plan.md:663-665,791,1014-1037,1041-1068,1140`). The implementation in
  December 2025 departed from each point without a recorded reason. The two scoring copies
  were created in the same bugfix session (`7844bcb`, `ce0e569`), in response to an empty
  leaderboard. Only two shapes are conscious constraints: the denormalized `scores`
  aggregate (`.ai/db-plan.md:135,398`) and the inlined outcome union in `score-rule.ts`
  (Deno import-cleanliness, `score-rule.ts:7-9`). The non-atomic accumulation and the
  orchestration duplication are **explicitly deferred known debt**
  (`testing-scoring-bet-lock-core/plan.md:100-103`).
- **The exploration sharpened the prior diagnosis.** The two runtimes fail in
  _opposite_ ways (Edge loses an award, Node double-awards on retry); an ignored read
  error can overwrite accumulated points; the page-2 rank reset is rendered by the
  shipped UI after "Załaduj więcej"; the manual endpoint's flag write fails silently with
  zero rows; a stored `POSTPONED` match is never re-polled.
- **The safety net is thin exactly where the risk is.** CI runs only on pull requests to
  `main` and has lint, unit coverage and E2E but no typecheck, build, `deno check`,
  migration or Edge deploy step; Vitest collects only `src/**`; there is no local
  Supabase integration harness (test-plan §3 Phase 2 is "not started").

Proposed ranking: **(1)** one tested production scoring orchestration: extract the Edge
scoring into an importable module under characterization tests and retire the diagnostic
Node path (C1 + C4); **(2)** a DB-side atomic, idempotent scoring unit (C2, subsuming
C3); **(3)** a database-consistent rank before pagination (C5). C6 stops at a residual
business definition, C7 gets a guard instead of a rebuild, and C3 alone is rejected as
unsafe without C2.

## Candidate analysis

### C1 — Duplicated scoring orchestration (P1, P2)

**Current shape**

- **Evidence:** the same transaction script exists in Node `scoreMatches`
  (`src/lib/services/scoring.service.ts:100-146`, exported) and Deno
  `scoreFinishedMatches` (`supabase/functions/sync-matches/index.ts:165-256`,
  module-private). Both re-declare `UnscoredMatch` and `BetToScore`
  (`scoring.service.ts:6-16`; `index.ts:118-128`) and use the identical comparison
  `bet.picked_result === match.result` with the shared constant
  (`scoring.service.ts:125-127`; `index.ts:208,217`).
- **Evidence:** the error semantics diverge. A match-fetch error throws in Node (route
  returns 500) but returns early in Edge with HTTP 200. An UPSERT error aborts the match
  and leaves it unflagged in Node (`:80-82,139-142`), while Edge continues and flags it
  (`index.ts:229-247`). Only Node has `dry_run`. `updated_scores` means "correct bets
  counted" in Node and "successful UPSERTs" in Edge. Return shapes differ (`errors:
string[]` vs `errors: number`).
- **Evidence:** `pointsForBet` (`src/lib/scoring/score-rule.ts:31-36`) is called only in
  `score-rule.test.ts`. `POINTS_FOR_CORRECT_BET` is imported by both runtimes
  (`scoring.service.ts:4`; `index.ts:19`, relative cross-directory path).
- **Evidence:** Edge scoring takes only a client parameter and uses no ingestion state
  (`index.ts:165-167`), but always runs after `syncFullMode`/`syncLiveMode` in one
  handler (`:525-532`). The file has no exports and calls `Deno.serve` at top level
  (`:492`).
- **Inference:** the Edge scoring already has a function boundary but is not importable
  or testable in place.

**Intentionality — accidental complexity, then deferral of known debt**

- **Evidence:** the design called for one Edge Function plus a thin manual trigger:
  "Manually trigger the scoring function… (primarily for testing; normally runs via Edge
  Function cron job)" (`.ai/api-plan.md:789`; BL-3 `:1041-1060`).
- **Evidence:** both copies appeared minutes apart in one session: `7844bcb` (Edge
  scoring) and `ce0e569` (Node service and route). The status file names the trigger as
  "Pusty ranking… brakowało mechanizmu punktacji"
  (`.planning/.statusy-i-podsumowania/.leaderboard-view-status.md:82-88`).
- **Unknown:** which copy was authored first; commit order does not show authoring
  order.
- **Evidence:** collapsing the orchestration was explicitly deferred: "The edge-deploy
  toolchain risk is not worth it mid-tournament"
  (`testing-scoring-bet-lock-core/plan.md:100-101`).
- **Evidence:** wiring only the constant was an allowed option (`plan.md:164-165`) but
  contradicts the stated end state "correct/incorrect decision… both runtimes import it"
  (`plan.md:63-64`, `plan-brief.md:24-25`). Commit `2956e01` left both comparison lines
  untouched.

**Feasibility**

- **Evidence:** 19 of the 49 unit tests target the Node copy
  (`scoring.service.test.ts`). The Edge copy has none.
- **Evidence:** Vitest `include` is `src/**` only (`vitest.config.ts:8`).
- **Evidence:** `tsconfig` allows `.ts` extension imports
  (`astro/tsconfigs/base.json:10`, via the project `tsconfig.json`).
- **Evidence:** `deno check --no-lock` on `sync-matches/index.ts` passes, including the
  cross-directory import.
- **Unknown:** whether `supabase functions deploy` bundles `../../../src/...`. No deploy
  was recorded (`plan.md:211,460`), and no workflow deploys the function.
- **Existing vs new abstraction:** retiring the Node path needs none. Making the Edge
  scoring testable needs only a module split within `supabase/functions/`, not a new
  abstraction. Sharing orchestration across both runtimes would need a new
  client-injected shared module.
- **Target shape:** a single production scoring orchestration (Edge) as an importable,
  tested module; the diagnostic Node copy retired.
- **Cost:** S (retire + extract), M (share across runtimes; likely wasted if C2 moves the
  logic into the DB).

### C2 — Non-atomic accumulation and award-before-flag (P3, P4, P5)

**Current shape**

- **Evidence:** both runtimes use separate PostgREST calls, with no `.rpc(` anywhere.
  The sequence is: select unscored FINISHED matches → select bets per match → for each
  correct bet, `SELECT scores.points … .single()` → compute `existing + 3` in JS → UPSERT
  the absolute total → after all bets, `UPDATE matches SET is_scored = true WHERE id`.
  Sources: `scoring.service.ts:22-27,40,59-78,89`; `index.ts:171-176,195-198,210-227,240`.
- **Evidence:** the flag update filters on `id` only, not `is_scored = false`, so it is
  not a compare-and-set (`scoring.service.ts:89`; `index.ts:240`).
- **Evidence:** schema facts:
  - `scores` has PK `(user_id, tournament_id)` and `points int not null default 0 check
(points >= 0)` (`20251028120000_initial_schema.sql:153-159`).
  - `matches.is_scored` is `boolean not null default false` with a single-column index
    (`:95,104`).
  - There is no scoring SQL function, ledger table or per-bet award column. The only
    functions are `handle_new_user` and `handle_updated_at`
    (`initial_schema.sql:329-378`; `database.types.ts:202-207` shows `Functions: never`).
- **Evidence:** the installed `postgrest-js` returns, rather than throws, an error for
  `.single()` with 0 rows and for network failures
  (`node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js:119-170`). Both
  runtimes discard that `error` (`scoring.service.ts:59`; `index.ts:210`).
- **Inference:** any failed read, not only "no row", yields `newPoints = 3` and the UPSERT
  overwrites an accumulated total. The unit test mocks a missing row as
  `{data: null, error: null}` (`scoring.service.test.ts:130`), not as the real PGRST116
  error. Not reproduced against a database.
- **Evidence:** local `supabase/config.toml:18` sets `max_rows = 1000`, and neither
  scoring select paginates. **Unknown:** the deployed `max_rows`.

**Intentionality — aggregate is a conscious constraint; non-atomicity is deferral of known debt**

- **Evidence:** the denormalized aggregate is deliberate: "Zdenormalizowana tabela…"
  (`.ai/db-plan.md:135,398,426`); "Denormalized user points per tournament for efficient
  rankings" (`initial_schema.sql:165`).
- **Evidence:** the design specified atomic, transactional accumulation: `ON CONFLICT …
DO UPDATE SET points = scores.points + points_to_add`; "Each match processed in separate
  transaction"; "Scoring function uses explicit transactions for atomicity"
  (`.ai/api-plan.md:1056-1059,1066,1140`).
- **Inference:** supabase-js has no client transactions, so the designed SQL needed an
  RPC; nothing records that trade-off.
- **Evidence:** the fix was explicitly deferred to "Phase 2 (real Supabase)"
  (`testing-scoring-bet-lock-core/plan.md:89-90,102-103`). test-plan §3 Phase 2
  "Integration: sync, authz & scoring" is "not started"
  (`context/foundation/test-plan.md:87`). The change's own Phase 2 items (pinning the
  double-count window) are unchecked (`plan.md:466-475`).

**Feasibility**

- **Evidence:** only mock tests exist ("should add points to existing user score",
  "should collect error when markMatchAsScored fails"); none asserts a re-run double
  award or a concurrent run.
- **Evidence:** local Supabase is configured (PG 17, migrations enabled, Supabase CLI
  2.72.7, linked project), but there is no `seed.sql`, no `supabase/tests`, no
  type-generation script, and no CI job for DB tests.
- **Inference:** the hosted `integration` E2E database is unsuitable for this, because
  E2E teardown deletes **all** bets (`tests/e2e/global-teardown.ts:62-67`).
- **Evidence:** the Edge client is untyped (`index.ts:522`), so a DB function can be
  called from Edge without regenerating types.
- **Existing vs new abstraction:** new. It needs a migration adding a DB-side function
  with `service_role`-only grants.
- **Target shape:** a DB-side transactional per-match scoring unit that claims the match
  and increments points in place.
- **Cost:** L. It needs a new integration harness, a migration with correct grants, an
  Edge redeploy, and possible reconciliation of historical drift (no ledger exists to
  detect past double awards).

### C3 — Edge marks the match scored after a failed UPSERT (P6)

**Current shape**

- **Evidence:** the Edge error paths and whether each flags the match:
  - Match select error: returns, not flagged, HTTP 200 (`index.ts:178-182,541`).
  - Bet select error: `continue`, not flagged (`:200-204`).
  - Score read error: ignored; overwrite 0 + 3; **flagged** (`:210-217,240`).
  - UPSERT error for one bet: other bets still awarded; **flagged** (`:229-240`).
  - Flag error: awards persisted, not flagged; the next run re-awards (`:242-244`).
  - Error counters are only logged and returned; no error status reaches the caller
    (`:534-544`).

**Intentionality — accidental complexity**

- **Evidence:** the behavior is original to `7844bcb` and no later commit touched it.
- **Evidence:** the design intent is the opposite: "Failed match scoring logged but
  doesn't block other matches — Retried on next cron run (is_scored still FALSE)"
  (`.ai/api-plan.md:1067-1068`).
- **Evidence:** the Node sibling from the same session does not flag on UPSERT failure
  (`ce0e569`; `scoring.service.ts:80-82,133-142`).

**Feasibility**

- **Evidence:** there is no test. The function is not importable (top-level
  `Deno.serve`, `index.ts:492`).
- **Inference:** a guard alone ("do not flag if any award failed") converts a permanent
  under-award into a **double award** on retry for co-bettors whose UPSERT already
  succeeded. Without C2's single unit of work, neither behavior is correct.
- **Target shape:** the match is flagged only if all its awards succeed. It is fully
  achievable only inside C2's transaction.
- **Cost:** S as a guard, but unsafe standalone (see rejected).

### C4 — Manual endpoint authority (P7, P8)

**Current shape**

- **Evidence:** the route checks only `locals.supabase.auth.getUser()`
  (`src/pages/api/admin/score-matches.ts:12-23`) and passes the request client to
  `scoreMatches` (`:52`).
- **Evidence:** middleware has no path protection (`src/middleware/index.ts:5-17`). The
  only Node client factory is the cookie session client
  (`src/db/supabase.server.ts:34-47`). The schema has no admin/role concept (`profiles`:
  id, username, created_at; `initial_schema.sql:44-48`).
- **Evidence:** RLS on the tables the route touches (under checked-in policies):
  - `bets` SELECT is own-only (`20251028120200_fix_performance_warnings.sql:84-87`).
  - `scores` has no INSERT/UPDATE policy (`initial_schema.sql:304-313`).
  - `matches` has no UPDATE policy (`:219-228`).
- **Evidence:** supabase-js sends the session access token when a session exists
  (`node_modules/@supabase/supabase-js/dist/main/SupabaseClient.js:166-172`).
- **Inference (effect for an authenticated caller):**
  - The caller reads only their own bets.
  - The scores UPSERT fails with an RLS error.
  - The `matches` update affects 0 rows **without an error**, so the match is counted
    as processed but stays unscored.
  - **Unknown:** whether deployed `SUPABASE_KEY` is anon or service-role; it does not
    change the per-session role.

**Intentionality — accidental complexity**

- **Evidence:** the endpoint was planned as "Admin Endpoints (Service Role Only)…
  Authentication: Service Role Required" (`.ai/api-plan.md:663-665,791`). It was built
  auth-only in `ce0e569` and has one commit.
- **Evidence:** the manual scoring run in December was actually performed through the
  Edge Function ("Uruchomienie przez edge function (wykonane)",
  `.leaderboard-view-status.md:92-99`).
- **Inference:** the comment "Using service_role via server client"
  (`src/pages/api/auth/check-username.ts:74`, `9058bb3`) suggests a belief that the
  server client was privileged.
- **Evidence:** the owner's "diagnostic" decision matches the original "primarily for
  testing" intent.

**Feasibility**

- **Evidence:** there is no UI, workflow or scheduler caller in the repo (pre-gate `rg`).
  **Unknown:** external or ops callers in deployment logs.
- **Evidence:** the blast radius is the route, `scoring.service.ts` and its 19 tests,
  `ScoreMatchesCommand`/`ScoreMatchesResponseDTO` (`src/types.ts:380-409`), and the
  `.ai`/`.planning` docs.
- **Inference:** a real admin check would introduce a new authorization concept, which is
  not warranted for a diagnostic path. Retiring or production-gating the route needs no
  abstraction.
- **Target shape:** no production-reachable manual scoring route. A read-only drift check
  can replace `dry_run` as the diagnostic.
- **Cost:** S. The main risk is losing the only tested orchestration unless C1's
  extraction and test port happen first.

### C5 — Rank computed after pagination; client-derived sticky row (P9, P10)

**Current shape**

- **Evidence:** the service counts `scores` rows, fetches one page ordered `points desc,
user_id asc` with `.range(offset, offset + limit - 1)`, then ranks that page from 1
  (`src/lib/services/leaderboard.service.ts:25-36,42-65,88-109`). `limit` defaults to
  100 with a maximum of 500 (`src/lib/validation/leaderboard.validation.ts:15-23`).
- **Evidence:** the shipped UI loads further pages. `loadMore` appends `response.data`
  unchanged (`src/components/hooks/useLeaderboard.ts:72-76,92-95`), `LoadMoreButton`
  renders while `has_more`, and `LeaderboardRow` renders `entry.rank` verbatim
  (`LeaderboardRow.tsx:10`).
- **Inference:** after "Załaduj więcej" in a tournament with more than 100 score rows,
  row 101 displays rank 1.
- **Evidence:** the sticky row is `entries.find(user_id === currentUserId)` over loaded
  entries only (`useLeaderboard.ts:41`). The header shows `entries.length` as the
  participant count, not `pagination.total` (`LeaderboardView.tsx:121`). There is no
  "my rank" endpoint; `ProfileStatsDTO.rank` is declared but unused (`src/types.ts`).
- **Unknown:** current production row counts per tournament, so whether the defect is
  reachable today.

**Intentionality — accidental complexity (tie-breaker switch conscious)**

- **Evidence:** PRD requires shared positions for ties (`.ai/prd.md:88`). api-plan
  specified `RANK() OVER (ORDER BY s.points DESC)` with `LIMIT/OFFSET`
  (`.ai/api-plan.md:1014-1037`).
- **Evidence:** the endpoint plan replaced this with "Algorytm rankingu (post-processing
  w kodzie)" on a paginated query, without a stated reason
  (`.ai/get-tournaments-id-leaderboard-implementation-plan.md:233-252`, `d3d1f8d`). Its
  own step list computes ranks _before_ pagination (`:205-206`). `04d6282` implemented
  the plan's sample code.
- **Evidence:** the secondary sort `user_id` replaced `profiles.username` after a runtime
  error ("Supabase nie obsługuje sortowania po polach z joinowanych tabel",
  `.leaderboard-view-status.md:72-80`, `7844bcb`). That switch was conscious.
- **Evidence:** cross-page rank consistency was a planned but never executed test
  (`.ai/test-plan.md:764-770`). Tie-rank is test-plan risk #7, owned by §3 Phase 3, "not
  started" (`context/foundation/test-plan.md:53,88`).

**Feasibility**

- **Evidence:** there is no test. `calculateRanks` is pure but not exported
  (`leaderboard.service.ts:42`); the existing mock-client pattern could test
  `getLeaderboard`.
- **Inference:** a no-migration option exists: the rank of the first row on a page is `1
  - count(points > firstRow.points)`, using the same `count: exact, head`style already at`:26-29`. The user's own rank for the sticky row can be derived the same way. A SQL view
or RPC with `RANK()` would need a migration and type regeneration.
- **Target shape:** rank established by the database over the whole tournament before
  pagination, plus a server-provided current-user rank.
- **Cost:** S (count-based offset), M (view/RPC). The blast radius is the leaderboard
  service, route, `LeaderboardEntryDTO.rank`, hook, row and sticky row.

### C6 — Participant model: zero-point bettors absent (P11)

**Current shape**

- **Evidence:** a participant is a `scores` row joined `!inner` to `profiles`, both for
  the count and for the page (`leaderboard.service.ts:25-29,88-91`). The only `scores`
  writers are the two scoring UPSERTs, each inside the correct-pick branch
  (`index.ts:208,219`; `scoring.service.ts:68,125`), plus the E2E seed
  (`tests/e2e/global-setup.ts:113-117`).
- **Evidence:** `bets` has no `tournament_id`, so participation from bets needs a join
  through `matches`. There is no membership table. `bets` SELECT RLS is own-only, so the
  session client cannot derive other participants from bets.

**Intentionality — accidental complexity**

- **Evidence:** api-plan BL-3 UPSERTs for **every** bet with `points_to_add = 0` for a
  wrong pick, which would create a row per bettor (`.ai/api-plan.md:1052-1059`). Both
  implementations moved the UPSERT inside the correct-pick branch (`7844bcb`,
  `ce0e569`) with no recorded reason.

**Feasibility and business-concept boundary**

- **Inference:** the structural part is known. Either scoring creates 0-point rows plus a
  backfill migration, or a read-side security-definer view/RPC is added. Both need
  migrations and the integration harness from C2.
- **Unknown — residual business definition:** decision (3) says zero-point bettors are
  visible, but not **when a user becomes a participant**: at the first bet in the
  tournament, or at the first _scored_ bet? Do bets on cancelled or postponed matches
  count? The two structural options give different answers. Per the exploration
  contract, **the analysis stops here**. Defining the participant concept belongs to the
  later domain analysis (M4L5), not to a structural refactor.
- **Cost:** M once defined. It needs a migration and backfill, an Edge change, and E2E
  fixture updates (the seed masks the gap).

### C7 — Repeated outcome/status vocabulary (P12)

**Current shape**

- **Evidence:** SQL enums are the source (`initial_schema.sql:26,30`). The generated
  mirror is `src/db/database.types.ts:208-216,345-353` (`Constants`). `src/types.ts:50,55`
  are **aliases** of the generated enums, not copies.
  `src/lib/validation/matches.validation.ts:2-4,13` derives from `Constants`.
- **Evidence:** hand-written copies:
  - Edge unions and status map (`index.ts:29-61`).
  - `score-rule.ts:22` (documented).
  - zod literals (`bet.validation.ts:11-13,29-31`).
  - Inline unions (`src/lib/api/matches.api.ts:115`, `src/pages/api/bets/[id].ts:87`).
  - UI label tables (`BettingControls.tsx:15-17`, `bet-utils.ts:15-38`, `MatchCard.tsx`).

**Intentionality — mixed**

- **Evidence:** the SQL source, derived `src/types.ts` (`abc90b8`) and the `score-rule.ts`
  inlining (`score-rule.ts:7-9`; `testing-scoring-bet-lock-core/plan.md:119-121`) are
  conscious.
- **Evidence:** the Edge-local unions are undocumented (`cf1ef10`).
- **Evidence:** the zod literals depart from the plan, which prescribed
  `z.enum(Constants.public.Enums.match_outcome)`
  (`.ai/post-api-bets-implementation-plan.md:70-76` vs `04d6282`).

**Feasibility**

- **Evidence:** Deno can import `src/db/database.types.ts`, which has no imports (probe
  passed). It cannot import `src/types.ts`, because the `@/` alias is not mapped in
  `supabase/functions/deno.json`.
- **Inference:** a Vitest guard asserting that the hand-written sets equal
  `Constants.public.Enums.*` is cheap and deterministic.
- **Inference:** enum changes are rare and require a migration, so structural
  single-sourcing has low value.
- **Target shape:** generated DB enum constants as the vocabulary source, enforced by a
  guard test.
- **Cost:** S.

## Corrections to the prior report

- **TD3 / §3:** the runtimes do not share failure semantics. On UPSERT failure Edge flags
  the match (award lost), while Node leaves it unflagged (earlier awards in that match are
  repeated on retry).
- **TD2:** add a non-concurrent overwrite path. An ignored score-read error resets the
  total to 3 (P5).
- **TD4:** the manual flag write does not fail visibly under RLS. It updates 0 rows
  without an error and the match is still counted as processed.
- **TD5:** the page-2 rank reset is not only an API-consumer risk. The shipped UI renders
  it after "Załaduj więcej", and the participant count shows the loaded entries.
- **§4 vocabulary list:** `src/types.ts:47-55` are generated-type aliases, not copies.
  The list omits `matches.api.ts:115`, `bets/[id].ts:87`, `BettingControls.tsx`,
  `bet-utils.ts`, `MatchCard.tsx` and the `Constants`-derived status schema.
- **Priors outside the report:**
  - `testing-scoring-bet-lock-core` Phase 3 (timezone) and Phase 4 (`void` bet status)
    were never implemented: `bet-utils.ts` contains no `void`, and `vitest.config.ts` sets
    no `TZ`.
  - `context/foundation/test-plan.md:86` still marks Phase 1 as "not started" although
    `2956e01` completed it.
  - The claim "no `prd.md` on disk" (`plan.md:31-33`, `score-rule.ts:12`) was wrong:
    `.ai/prd.md` has been tracked since `a6b9158`.

## Safety-net inventory

- **CI** (`.github/workflows/pull-request.yml`):
  - **Evidence:** runs only on `pull_request` to `main` (`:3-5`). Jobs are `npm run lint`
    (`:18`), `npm run test:coverage` (`:31`) and `npm run test:e2e` against a hosted
    `integration` environment (`:82`).
  - **Evidence:** it has no typecheck, build, `deno check`/`deno test`, migration or Edge
    deploy step, although the workflow is named "Test & build main".
  - **Evidence:** `keep-supabase-alive.yml` is a daily ping only.
  - **Unknown:** branch protection and whether jobs block merges.
- **Unit tests:**
  - **Evidence:** 49/49 pass in 3 files (`score-rule` 4, `scoring.service` 19,
    `bet.service` 26).
  - **Evidence:** v8 coverage thresholds are 70/60/80/70 (`vitest.config.ts:16-21`).
  - **Evidence:** the scoring mock returns responses by call order, so it is coupled to
    the exact query sequence (`scoring.service.test.ts:59-84`).
  - **Evidence:** MSW is installed but unused.
- **E2E:**
  - **Evidence:** Playwright runs with `workers: 1` against a real Supabase using the
    service-role key.
  - **Evidence:** setup seeds a 10-point `scores` row, masking C6, and checks existence by
    selecting a non-existent `scores.id` (`global-setup.ts:104-117`).
  - **Evidence:** teardown deletes all `bets` (`global-teardown.ts:62-67`).
  - **Evidence:** leaderboard specs assert neither points nor rank.
- **Deno and local Supabase:**
  - **Evidence:** `deno check` passes locally, but there is no Deno test task.
  - **Evidence:** local Supabase is configured, but has no seed, no DB tests and no
    type-generation script. The owning test-plan phase (§3 Phase 2) is "not started".

## Cross-candidate dependencies

- **Inference:** C4 is the removal half of C1's target. Retiring the diagnostic path
  leaves one runtime for C2, C3, C6 and C7 to touch.
- **Inference:** extracting `scoreFinishedMatches` into an importable module and adding
  `supabase/functions/**/*.test.ts` to Vitest is the shared first step. It unblocks C3
  tests, mock-level C2 characterization, a C7 status-map guard, and preserves test signal
  before C4 deletes the Node tests.
- **Inference:** C2 subsumes C3. C2 and C6 share a vehicle: the DB scoring unit can create
  0-point rows, and both need the same missing integration harness.
- **Inference:** C6 increases leaderboard row counts, which makes C5's latent page-2
  defect reachable sooner.
- **Inference:** a derived aggregate (leaderboard computed from bets × matches instead of
  an accumulated counter) would collapse C2, C5 and C6. It depends on the undecided
  result-correction rule (P16) and is a data-model redesign, not an incremental refactor.
  It is named here only.

## Refactor opportunities (ranked)

### 1. One tested production scoring orchestration (C1 + C4)

- **Current → target shape:** a transaction script duplicated across Node (diagnostic,
  tested) and Deno (production, untested, not importable), with diverging failure
  semantics → a single Edge scoring module that is importable and characterized by tests,
  with the diagnostic Node route, service and DTOs retired.
- **Why this position (cost of debt vs cost of change):**
  - **Evidence:** today every scoring fix must be made twice or the copies drift further.
    Commit `2956e01` already had to touch both.
  - **Evidence:** 19 of 49 unit tests protect the non-production path (TD7).
  - **Inference:** a broadly triggerable endpoint silently reports unscored matches as
    processed.
  - **Evidence:** the change is S, needs no migration, and each step is a plain revert.
  - **Inference:** it is the Mikado leaf for #2. The atomicity fix then lands once, on the
    tested production path, instead of twice.
  - **Evidence:** it realizes the original design ("the manual trigger calls the scoring
    function", `.ai/api-plan.md:789`) and resolves the explicitly deferred debt
    (`plan.md:100-101`), not a load-bearing decision.
- **Blast radius:**
  - `supabase/functions/sync-matches/index.ts` (scoring block and handler wiring).
  - The new sibling module and its tests.
  - `vitest.config.ts` include.
  - `src/pages/api/admin/score-matches.ts`, `src/lib/services/scoring.service.ts` and its
    test file.
  - `ScoreMatchesCommand`/`ScoreMatchesResponseDTO` in `src/types.ts`.
  - Docs `.ai/api-plan.md`, `.ai/test-plan.md` and the `CLAUDE.md` sync-matches section.
  - Database: none.
- **Incremental path sketch:**
  1. Extract Edge scoring into a sibling module (behavior-preserving; `index.ts` keeps
     calling it).
  2. Characterization tests pin current Edge behavior, including "UPSERT error still
     flags" and "read error overwrites", as known-bug pins.
  3. Port the relevant Node test scenarios onto the Edge module.
  4. Production-gate, then delete the diagnostic route, service, tests and DTOs.
  5. Update docs.
- **First prerequisite step:** make Edge scoring importable by Vitest (module split plus
  the Vitest include change) and confirm one real deploy of `sync-matches` with the
  existing cross-directory import. Deploy bundling of `../../../src` is unverified, and
  every Edge-touching change inherits that risk.

### 2. DB-side atomic, idempotent scoring unit (C2, subsuming C3)

- **Current → target shape:** a stateless read-modify-write on a denormalized aggregate
  (awards before a separate, unconditional flag; ignored read errors; unpaginated
  selects) → a DB-side transactional per-match scoring unit that claims the match and
  increments points in place, executable only by `service_role`, called by the single
  Edge orchestration.
- **Why this position:**
  - **Evidence (interest on the debt):** highest of all candidates. Scoring correctness is
    test-plan risk #1 (High/High, `context/foundation/test-plan.md:47`). Three
    independent silent-corruption paths exist: concurrent lost update, retry double
    award, and read-error overwrite. There is also a permanent under-award path (C3). No
    ledger exists to detect past damage.
  - **Evidence:** the design already specified this shape (`.ai/api-plan.md:1056-1066,1140`),
    so it restores intent rather than inventing architecture. The fix was deferred
    explicitly, not rejected.
  - **Inference:** ranked second only because change cost is L. It needs a new local
    Supabase integration harness (none exists), a migration with correct grants (wrong
    grants would expose score mutation to `authenticated`), an Edge redeploy, and possible
    data reconciliation. It is also cheaper and safer after #1.
- **Blast radius:**
  - `supabase/migrations/` (new function and grants).
  - The Edge scoring module and handler.
  - `matches.is_scored` and `scores` semantics.
  - RLS/service role.
  - A new integration test location.
  - `database.types.ts`, only if a typed Node caller remains.
  - Deployed data (reconciliation).
  - The prior report's "Idempotency/accumulation" row applies in full.
- **Incremental path sketch:**
  1. Read-only drift query comparing `scores.points` with 3 × correct bets on scored
     matches (characterization oracle, safe against any DB).
  2. Local Supabase harness with integration tests that pin today's double-award and
     overwrite behavior.
  3. Additive migration introducing the DB function (unused).
  4. Switch the Edge call site. Rollback is redeploying the previous Edge; the function
     stays unused.
  5. Reconcile drift found in step 1 (owner decision).
- **First prerequisite step:** the local Supabase integration harness (test-plan §3
  Phase 2 infrastructure), isolated from the shared hosted `integration` database whose
  teardown deletes all bets.

### 3. Database-consistent rank before pagination (C5)

- **Current → target shape:** rank computed in memory per fetched page and trusted as
  absolute by the hook, rows and sticky row → rank established by the database over the
  whole tournament before pagination, plus a server-provided current-user rank.
- **Why this position:**
  - **Evidence:** it is a real, user-visible defect in shipped UI code (page 2+ restarts
    at 1; cross-page ties lost) against an explicit PRD rule (`.ai/prd.md:88`) and the
    original `RANK()` design.
  - **Evidence:** it is independent of #1/#2, and the count-based variant is S without a
    migration.
  - **Inference:** it ranks below #1 and #2 because it is latent until a tournament has
    more than 100 score rows and it corrupts presentation only, not stored points.
    **Unknown:** current row counts.
  - **Inference:** doing C6 later raises its urgency.
- **Blast radius:** `src/lib/services/leaderboard.service.ts`, the leaderboard route and
  validation, `LeaderboardEntryDTO.rank`, `useLeaderboard.ts`, `LeaderboardRow.tsx`,
  `StickyUserRow.tsx` and `LeaderboardView.tsx` (participant count). Database: none for
  the count-based variant.
- **Incremental path sketch:**
  1. Export `calculateRanks` and pin current behavior, including a tie across the page
     boundary.
  2. A `getLeaderboard` test with `offset > 0` pinning the reset to 1.
  3. Apply a count-of-higher-scores rank offset.
  4. Add a current-user rank for the sticky row.
  5. Show `pagination.total` as the participant count.
- **First prerequisite step:** characterization tests for `calculateRanks` and
  `getLeaderboard` with `offset > 0`, using the existing mock-client pattern.

### Considered and rejected

| Candidate                                            | Why not ranked                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C3** standalone guard                              | Cheap (S), but unsafe alone: "don't flag on failure" turns a permanent under-award into a double award for co-bettors on retry. The correct fix is the single unit of work in #2. It can be pinned as a known-bug characterization test within #1.                                                     |
| **C6** participant model                             | Structurally feasible (M), but it depends on a residual **business definition** of when a user becomes a participant and whether bets on cancelled or postponed matches count. Per the contract, stop: this belongs to domain analysis (M4L5). Its implementation would ride on #2's migration series. |
| **C7** vocabulary copies                             | Mostly conscious or derived. The remaining hand-written copies are low-value to restructure because enum changes are rare and need a migration. Right-sized answer: a cheap guard test (hand-written sets equal `Constants.public.Enums.*`), not a refactor. Worth adding regardless of the ranking.   |
| C1 variant: share orchestration across both runtimes | M, and likely wasted. After decision (2) there is no second production runtime to keep in sync, and #2 moves the core logic into the DB.                                                                                                                                                               |
| Derived aggregate instead of `scores` counter        | Would collapse C2, C5 and C6, but it reverses the conscious denormalization decision (`.ai/db-plan.md:135,398`) and depends on the undecided result-correction rule (P16). A data-model redesign, not an incremental refactor.                                                                         |
| P17 cancelled/postponed handling                     | Not structural. Voiding bets, re-polling postponed matches and reopening betting are business rules (PRD FR-010 is broader than db-plan/api-plan). The shape findings (postponed never re-polled; no `void` status) are recorded for M4L5.                                                             |
| P15 unknown status fallback                          | A provider-translation concern. It belongs to the anti-corruption-layer analysis (M4L5, `context/domain/03-anti-corruption-layer.md`).                                                                                                                                                                 |

## Code References

- `supabase/functions/sync-matches/index.ts:165-256` — production Edge scoring (private, untested)
- `supabase/functions/sync-matches/index.ts:492-544` — handler: ingestion then scoring, top-level `Deno.serve`
- `src/lib/services/scoring.service.ts:52-94,100-146` — diagnostic Node scoring copy
- `src/pages/api/admin/score-matches.ts:12-23,52` — auth-only manual route with session client
- `src/lib/scoring/score-rule.ts:7-9,22,25,31-36` — shared constant, inlined union, unused pure rule
- `src/lib/services/leaderboard.service.ts:25-36,42-65,88-109` — count, page, per-page rank
- `src/components/hooks/useLeaderboard.ts:5,41,72-80,92-95` — page append, client-derived sticky row
- `supabase/migrations/20251028120000_initial_schema.sql:95,104,153-165,219-228,304-313` — flag, `scores`, RLS
- `supabase/migrations/20251028120200_fix_performance_warnings.sql:84-87` — own-only bets SELECT
- `vitest.config.ts:8` — test include limited to `src/**`
- `.github/workflows/pull-request.yml:3-5,18,31,82` — CI triggers and gates
- `.ai/api-plan.md:663-665,789-791,1014-1068,1109,1140` — original design for trigger, rank, scoring, errors

## Historical Context (from prior changes)

- `context/changes/scoring-flow-analysis/research.md` — M4L3 flow trace, TD1–TD7, and decision gate outcome (input for this change).
- `context/changes/testing-scoring-bet-lock-core/plan.md:89-106` — explicit deferrals: orchestration collapse, atomic accumulation, void status, tie-rank.
- `context/changes/testing-scoring-bet-lock-core/plan-brief.md:22-39` — end state "rule + decision shared" not met by the constant-only wiring (`2956e01`).
- `context/foundation/test-plan.md:47,53,86-88` — risks #1 and #7; rollout phases (Phase 1 status stale, Phases 2–3 not started).
- `.planning/.statusy-i-podsumowania/.leaderboard-view-status.md:72-99` — origin of the scoring copies and the tie-breaker workaround.

## Related Research

- `context/changes/scoring-flow-analysis/research.md`
- `context/changes/testing-scoring-bet-lock-core/research.md`

## Open Questions

- Does `supabase functions deploy` bundle the cross-directory `score-rule.ts` import, and
  which commit is currently deployed?
- Deployed migration level, RLS, `max_rows`, and the value of `SUPABASE_KEY`.
- Are there external or ops callers of `POST /api/admin/score-matches`?
- Has historical points drift (double awards or overwrites) already occurred in
  production data?
- When does a user become a tournament participant (first bet vs first scored bet;
  cancelled or postponed bets)?
- What should happen when the provider corrects a result after scoring?
- Current score-row counts per tournament (reachability of the C5 defect).
- Is the hosted `integration` E2E project isolated from production?
