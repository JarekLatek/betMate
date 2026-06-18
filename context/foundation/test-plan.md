# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-18

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic diff that already catches the
   regression.
2. **User concerns are first-class evidence.** Risks anchored in "the team
   is worried about X, and the failure would surface somewhere in <area>"
   carry the same weight as PRD lines or hot-spot data. For betMate this is
   load-bearing: the goal is to run live during FIFA World Cup 2026, so
   correctness of scoring and live match sync outranks coverage percentage.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is produced
   by `/10x-research` during each rollout phase. If the plan and research
   disagree about where the failure lives, research is the ground truth.

Hot-spot scope used for likelihood weighting: `src/components/my-bets`,
`src/components/matches`, `src/lib/services`, `supabase/functions/sync-matches`,
`src/components/auth`, `src/middleware`. (12-month window — last 30 days had
only 4 commits, insufficient for short-window churn; likelihood leans on the
12-month territory map, PRD, and the Phase 2 interview.)

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|--------------------------|--------|------------|--------------------------------|
| 1 | Scoring awards wrong points or silently corrupts the leaderboard mid-tournament (wrong W/D/W credit, double-scoring on re-run, accumulation error) | High | High | PRD US-008 / FR-006; interview Q1 + Q3; **oracle conflict: PRD states 1 pt per correct bet, implementation uses 3 pts** |
| 2 | `sync-matches` drifts or fails silently on an api-football response-shape change → fixtures/results/status go stale or wrong with no signal | High | High | interview Q2 (lived burn: external API shape) + Q1; PRD FR-002 / FR-006 |
| 3 | 5-minute bet lock bypassed via timezone/clock handling → a bet is placed or edited after kickoff, breaking fairness | High | Medium | PRD FR-004 / FR-005, US-004 / US-005; interview Q1 |
| 4 | IDOR — a user edits or deletes another user's bet because authorization checks login but not ownership | High | Medium | interview Q1; abuse lens; PRD auth/RLS rules (US-002, FR-001) |
| 5 | Cancelled or postponed match mishandled → points wrongly awarded, or bets not voided and still counted in stats | Medium | Medium | PRD US-010 / FR-010; interview Q1 |
| 6 | Auth/session middleware regression → mass 401 lockout, or a protected endpoint left unprotected | High | Medium | interview Q3; structure map: middleware cross-cuts every authed route |
| 7 | Leaderboard tie-rank or sort incorrect (equal points should share rank; next rank skipped) | Medium | Medium | PRD US-006; interview Q3 |

**Impact × Likelihood rubric.** High impact = user loses access/data or the
failure is publicly visible during the tournament. High likelihood = area
changes often or we have already been burned (R2). Rows are ordered by
impact × likelihood; R1 and R2 are High × High and are defended first.

**Abuse / security lens.** betMate has auth and accepts user input, so the
map includes R4 (IDOR — ownership, not just authentication). Server-side
input-validation parity (Zod) is folded into Phase 2 endpoint integration.
Resource abuse (username-enumeration via `check-username`, magic-link/reset
flooding) is noted but below the top-7 cut — revisit if abuse is observed.

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Correct points per W/D/W vs the agreed rule; correct accumulation across matches; re-running scoring does not double-count | "the code's `3 pts` constant is the rule" — the oracle must come from the agreed spec, not the implementation | scoring entry point, `is_scored` idempotency, points accumulation path | unit (extend existing service tests) | **oracle problem** — asserting the code's own constant back at itself |
| #2 | A changed/partial api-football payload is rejected or flagged, never written to the DB as if valid | "HTTP 200 means the payload is well-formed" | external boundary parse step; what gets persisted on a malformed shape | contract + integration (mock api-football) | happy-path-only fixture that never mutates shape |
| #3 | The lock holds at the boundary in a real non-UTC timezone, for both create and edit | "a UTC service unit test proves the lock" | how `match_datetime` is compared to "now"; timezone source of truth | integration / e2e in a real timezone | testing the boundary only in UTC |
| #4 | A cross-user edit/delete returns 403/404 and changes no data | "RLS hides the row, so we're safe" (distinguish a real deny from a silent allow) | ownership enforcement path; PGRST116 → 404 mapping | integration (two distinct users) | only exercising the own-user happy path |
| #5 | A voided match awards 0 points, marks its bets cancelled, and is excluded from hit-rate stats | "FINISHED is the only terminal status that matters" | cancelled/postponed status flow into the scoring cycle | integration | ignoring non-FINISHED terminal states |
| #6 | A protected route returns 401 without a session; a valid session passes; no global lockout | "auth works because login works" | middleware session shape; how `locals` propagates to routes | integration + e2e | happy-path login only, no negative case |
| #7 | Equal-point users share a rank and the following rank is skipped correctly | "DB ORDER BY equals correct competition rank" | tie-rank algorithm and its boundary | unit / integration | a snapshot with no tie case in the fixture |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Scoring & bet-lock core | Lock the deterministic, highest-stakes logic with the oracle taken from agreed rules | #1, #3, #5 | unit + boundary/edge | not started | — |
| 2 | Integration: sync, authz & scoring | Survive api-football shape changes; enforce bet ownership; score against a real DB | #2, #4, #6, #1/#5 | contract + integration (mock external, local Supabase) | not started | — |
| 3 | E2E critical paths | Prove fairness lock and access control in a real session/timezone across bet → score → leaderboard | #3, #4, #6, #7 | e2e (Playwright, extend suite) | not started | — |
| 4 | Quality gates | Keep the floor: scoped pre-commit tests on services, CI gate, coverage on `lib/services` | cross-cutting (regression floor) | gates | not started | — |

**Status vocabulary** (fixed — parser literals): `not started` →
`change opened` → `researched` → `planned` → `implementing` → `complete`.

## 4. Stack

The classic test base for this project. Test base is currently **sparse**:
vitest + playwright are configured, but only 8 test files exist (unit tests
in `src/lib/services/` for bet + scoring; the rest is e2e). Most of the
codebase is untested — the rollout below closes that gap risk-first.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | (per package.json) | `node` environment; existing unit tests in `src/lib/services/` |
| API mocking | MSW | none yet — see Phase 2 | needed to mock api-football at the network edge for R2 |
| e2e | Playwright | (per package.json) | Page Object Model suite in `tests/e2e/`; workers: 1, not fully parallel |
| accessibility | axe-core | none yet | optional; not a top-7 risk |
| integration DB | Supabase local (CLI/Docker) | n/a | needed for Phase 2 against a real schema |

**Stack grounding tools (current session):**
- Docs: none — local `package.json`/configs were sufficient; not invoked; checked: 2026-06-18
- Search: none — no version/status question required research; checked: 2026-06-18
- Runtime/browser: Playwright (project-local, not MCP) — used as the e2e layer in Phase 3; checked: 2026-06-18
- Provider/platform: Supabase — relevant for Phase 2 (local DB integration) and future log-based quality gates; not invoked this session; checked: 2026-06-18

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required after §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is planned.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local (husky/lint-staged) + CI | required | syntactic / type drift |
| unit + boundary | local + CI | required after §3 Phase 1 | scoring + bet-lock logic regressions |
| integration (sync/authz/scoring) | CI on PR | required after §3 Phase 2 | API-shape drift, IDOR, DB-coupled regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 3 | broken bet → score → leaderboard path |
| scoped pre-commit tests on `services` | local (agent/git hook) | recommended after §3 Phase 4 | regressions at commit time in highest-risk modules |
| coverage floor on `lib/services` | CI on PR | optional after §3 Phase 4 | silent erosion of scoring/bet coverage |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once the
relevant rollout phase ships; before that, it reads "TBD — see §3 Phase N."

### 6.1 Adding a unit test

- **Location**: next to the unit under test in `src/lib/services/` (e.g.
  `bet.service.test.ts`).
- **Reference test**: `src/lib/services/scoring.service.test.ts`,
  `src/lib/services/bet.service.test.ts`.
- **Oracle rule**: take expected values from the agreed spec (PRD / this
  plan), never from the implementation under test — see §3 Phase 1 for the
  scoring 1pt-vs-3pt oracle conflict.
- **Run locally**: TBD — confirm in §3 Phase 1.

### 6.2 Adding an integration test

- **Mocking policy**: mock only at the network edge (api-football via MSW);
  run against a real local Supabase schema. Never mock internal services.
- TBD — see §3 Phase 2.

### 6.3 Adding an e2e test

- **Location**: `tests/e2e/specs/`, with page objects in `tests/e2e/pages/`.
- **Reference test**: `tests/e2e/specs/betting.spec.ts`.
- TBD (timezone/access patterns) — see §3 Phase 3.

### 6.4 Adding a test for a new API endpoint

- **Test type**: integration (preferred) — assert request → response shape
  AND DB side-effects; mock only the external HTTP edge.
- TBD — see §3 Phase 2.

### 6.5 Adding a test for a scoring/sync rule

- TBD — see §3 Phase 1 (scoring) and §3 Phase 2 (sync contract).

### 6.6 Per-rollout-phase notes

(Optional. After each phase lands, `/10x-implement` appends a 2–3 line note
here capturing anything surprising the phase taught.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q4/Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Shadcn/ui primitives (`src/components/ui/**`)** — tested by their authors;
  re-evaluate only if we fork/customize a primitive's behavior. (Source: Phase 2 interview.)
- **Static info / rules / marketing pages** — low blast radius, no logic;
  re-evaluate if a static page gains interactive behavior. (Source: Phase 2 interview.)
- **Generated `src/db/database.types.ts`** — the generator is the oracle.
- **Supabase and api-football internals** — mock at the boundary only; do not
  test third-party behavior.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-18
- Stack versions last verified: 2026-06-18
- AI-native tool references last verified: 2026-06-18

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
