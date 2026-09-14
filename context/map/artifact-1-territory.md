# Artifact 1 — Territory (Git history)

Analysis date: **2026-09-14**

Window: **2025-09-14 → 2026-09-14**

Baseline commit: `c323606243a04008a0a925ff2335d5a496af6dd1` (`10xArchitect_cert`)

## Method and filters

Evidence comes from `git log --since=2025-09-14 --name-only`. A file is counted at
most once per commit. The activity ranking excludes dependency locks, generated build
and test output, environment files, course/context documentation, agent configuration,
CI configuration and root tool configuration. CI is discussed separately because it
is operationally relevant but would otherwise dominate the application map.

The window contains **137 commits**: 136 authored by Jarosław Latek and one by
`github-actions[bot]`.

## Active territory

`Commit touches` counts commits that touched an area. `Changed-file events` sums the
files changed in that area across those commits; the latter exposes broad feature
commits such as the my-bets implementation.

| Area                     | Commit touches | Changed-file events | Interpretation                                            |
| ------------------------ | -------------: | ------------------: | --------------------------------------------------------- |
| `src/pages`              |             10 |                  16 | Astro composition and route entry points                  |
| `src/lib/services`       |              8 |                  13 | Server-side business logic; high responsibility           |
| `src/components/matches` |              8 |                  18 | Core match and betting interaction UI                     |
| `supabase/functions`     |              7 |                   9 | External-data ingestion and production scoring runtime    |
| `src/db`                 |              7 |                   9 | Supabase clients and generated DB contract                |
| `tests/e2e`              |              6 |                  36 | Broad test-hardening campaign in Q1 2026                  |
| `src/components/ui`      |              6 |                  15 | Reused presentation primitives, mostly shallow            |
| `src/components/auth`    |              6 |                  12 | Cross-cutting authentication UI                           |
| `src/pages/api`          |              5 |                  11 | HTTP entry points into services                           |
| `src/components/my-bets` |              5 |                  25 | Broad feature commits; hottest UI by file spread          |
| `src/lib/validation`     |              4 |                   6 | API input contracts                                       |
| `src/lib/api`            |              4 |                   4 | Browser-side fetch adapters                               |
| `src/types.ts`           |              3 |                   3 | Shared DTO contract; small churn but large current fan-in |

### Top current files

| Touches | File                                       | Why it matters                                      |
| ------: | ------------------------------------------ | --------------------------------------------------- |
|       6 | `src/pages/index.astro`                    | Main match-list entry point                         |
|       5 | `supabase/functions/sync-matches/index.ts` | Live data ingestion plus one scoring implementation |
|       5 | `src/components/auth/auth-form.tsx`        | Main registration/login UI                          |
|       4 | `src/components/my-bets/BetList.tsx`       | Bet-history orchestration                           |
|       4 | `src/components/my-bets/BetCard.tsx`       | Bet-history item behavior                           |
|       4 | `src/components/matches/MatchesView.tsx`   | Match-list orchestration                            |
|       4 | `src/components/matches/MatchCard.tsx`     | Match display and betting interaction               |
|       3 | `src/types.ts`                             | Shared types used throughout the graph              |
|       3 | `src/middleware/index.ts`                  | Request-scoped session initialization               |
|       3 | `src/db/database.types.ts`                 | Generated database schema contract                  |

Historical-hot-file verification found two ghosts that must not be treated as current
centres: `tests/e2e/pages/MatchCard.ts` and `supabase/functions/deno.lock` were each
touched multiple times but no longer exist at the baseline commit.

## Activity over time

| Quarter          | Commits | Dominant signal                                                          |
| ---------------- | ------: | ------------------------------------------------------------------------ |
| 2025 Q4          |      95 | MVP feature build: pages, matches, my-bets, UI, services, API and schema |
| 2026 Q1          |      33 | E2E/Page Object campaign, followed by CI and environment stabilization   |
| 2026 Q2          |       7 | CI upkeep plus one focused scoring-rule extraction (`2956e01`)           |
| 2026 Q3 to 09-14 |       2 | Documentation/course preparation only; no production-code changes        |

**Inference:** the repository is seasonal rather than continuously volatile. Product
construction peaked in Q4 2025, test/CI hardening dominated Q1 2026, and feature work
then largely stopped. This says where work occurred, not whether those areas are
correct.

## Co-change evidence

The strongest pairs after grouping each commit into architectural areas are:

| Commits | Areas changing together                                             | Evidence-backed reading                                                          |
| ------: | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
|       3 | `components/matches` ↔ `lib/api`                                   | Match UI and its browser HTTP adapter form one change corridor                   |
|       3 | `lib/services` ↔ `pages/api`                                       | Thin API routes and service behavior are maintained together                     |
|       3 | `components/ui` ↔ `pages`                                          | Page composition reused/adjusted UI primitives during MVP work                   |
|       2 | `lib/services` ↔ `supabase/functions`                              | Scoring behavior spans two runtimes; one co-change is the shared-rule extraction |
|       2 | `components/auth` ↔ each of `db`, `validation`, `pages`, `my-bets` | Auth/session changes cross multiple layers                                       |

Only one three-area combination recurred twice:
`lib/services + pages + pages/api`. Counts are low, so they are routing signals rather
than proof of architectural defects.

### Cross-cutting files

- `src/types.ts` changed with match components/API in `901740f` and with match-page
  composition in `ab18f59`; current dependency metrics show **29 incoming modules**.
- `src/db/database.types.ts` is generated schema vocabulary. Its historical changes
  accompany migrations/endpoints (`e84b4bc`, `04d6282`, `3cf4931`), so this is mostly
  **generated/contract coupling**, not ordinary hand-edited utility coupling.
- `supabase/functions/sync-matches/index.ts` changed with leaderboard/scoring
  (`7844bcb`), my-bets/API (`218215e`) and the shared scoring rule (`2956e01`).
- `src/middleware/index.ts` changed with auth, database clients and match-page work;
  its cross-cutting role is also visible at runtime because it initializes Supabase
  locals for every request.

## Limits and unknowns

- Git history measures activity, not correctness, importance or intended ownership.
- Several feature commits are broad, so changed-file-event counts can overstate
  coupling created by one implementation batch.
- The repository is effectively single-author; co-change reflects one person's commit
  style as well as system boundaries.
- Runtime coupling through Supabase tables, RLS, cron and external API payloads is not
  visible in Git co-change alone and must be combined with the structure report.
