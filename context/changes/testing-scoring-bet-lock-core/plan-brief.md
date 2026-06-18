# Scoring & Bet-Lock Core — Plan Brief

> Full plan: `context/changes/testing-scoring-bet-lock-core/plan.md`
> Research: `context/changes/testing-scoring-bet-lock-core/research.md`

## What & Why

Phase 1 of the test rollout (`test-plan.md` §3): lock the project's highest-stakes,
deterministic logic — scoring, the 5-minute bet lock, and cancelled-match stats — with
unit + boundary tests whose expected values come from the **agreed spec**, not from the
code under test. betMate aims to run live during World Cup 2026, so correctness here
outranks coverage percentage.

## Starting Point

8 test files exist; most of the codebase is untested. Scoring lives in **two copies**
(TS service + a copy-pasted Deno edge function), each with its own `3pt` constant. The
bet lock is enforced authoritatively by DB RLS but only tested in UTC. Cancelled bets
display as "pending" forever. The earlier "PRD says 1pt vs code 3pt" conflict had no
`prd.md` to point to.

## Desired End State

The scoring rule (constant + correct/incorrect decision) lives in one shared pure module
both runtimes import. Tests assert 3pt from a recorded decision, cover accumulation, the
clean re-run guard, and pin the non-transactional double-count window as a known bug.
Bet-lock tests run in a non-UTC timezone across offset/offset-less dates. Cancelled bets
get a distinct **void** status and stay out of the hit-rate. `npm test` is green.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Scoring oracle (1 vs 3) | **3pt** for correct outcome; code is right | User decision; PRD has no file — recorded in test-plan/change.md | Plan |
| Future "Toto" model (exact=3 / outcome=1) | Documented, deferred | Needs predicted-goals in schema+UI+scoring rewrite; unbuildable today | Plan |
| Scoring duplication | **Collapse the rule only** (shared pure module) | Single oracle source without the edge-deploy risk of a full refactor | Plan |
| Risk #5 (cancelled bets) | **Fix bet-utils** + test desired | Pure functions, cheap; add a distinct `void` status | Plan |
| Timezone proof | **Non-UTC `TZ` + offset/offset-less** fixtures | Verifies the assumption research flagged (UTC-only today) | Plan |
| Idempotency | **Mock-simulate flag-fail** | Exposes the double-count window cheaply; real fix is Phase 2 | Plan |

## Scope

**In scope:** shared scoring-rule module + both-runtime wiring; oracle decision record;
unit tests for rule/accumulation/idempotency-window; bet-lock timezone boundary tests;
bet-utils void-status fix + tests.

**Out of scope:** the Toto exact-score model; collapsing scoring *orchestration*; DB
transactions / atomic accumulation; a `bet_status` column or server-side void path; IDOR,
sync-contract, auth, tie-rank (Phases 2/3); testing the Deno orchestration directly.

## Architecture / Approach

New `src/lib/scoring/score-rule.ts` (pure, dependency-free, Deno-import-clean) owns
`POINTS_FOR_CORRECT_BET` + `pointsForBet()`. `scoring.service.ts` and the Deno edge
function both import it; DB orchestration stays per-runtime. Tests extend the existing
co-located Vitest suites (inline chained Supabase mock); a non-UTC `TZ` is set
process-wide for the run. `bet-utils.ts` gains a `void` display status.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Rule collapse + oracle | Shared rule module, both runtimes wired, decision recorded, rule unit-tested | Deno cross-dir import / edge-deploy bundling |
| 2. Scoring service correctness | Accumulation + idempotency-window tests | Mock-only signal; real txn fix is Phase 2 |
| 3. Bet-lock timezone | Non-UTC + offset/offset-less boundary tests | Vitest honoring `TZ` for offset-less parsing |
| 4. Cancelled handling | `void` status + void-excluded hit-rate tests | Touching shared UI util — watch my-bets regressions |

**Prerequisites:** none beyond the existing Vitest setup; Supabase CLI/Deno only for the
Phase 1 manual edge-deploy check.
**Estimated effort:** ~1–2 sessions across 4 phases (mostly test code + 3 small edits).

## Open Risks & Assumptions

- Deno may reject importing `src/lib/scoring/score-rule.ts` across directories at deploy —
  documented fallback: re-declare the constant in the edge file with a "MUST equal" comment.
- Vitest must honor a process-wide `TZ` so offset-less dates shift; verified by a sanity
  assertion (Critical Implementation Details).
- The idempotency double-count is only *documented* here; the real atomic fix is Phase 2.

## Success Criteria (Summary)

- `npm test` green; new coverage on `score-rule`, `scoring.service`, `bet.service`, `bet-utils`.
- Scoring rule single-sourced; a correct bet pays 3 in both runtimes.
- Bet lock proven at the boundary in a non-UTC timezone; cancelled bets show as voided.
