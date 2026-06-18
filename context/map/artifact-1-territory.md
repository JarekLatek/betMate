# Artifact 1 — Territory (git history)

Window: last 12 months (≈2025-04 → 2026-06). 135 commits total; 132 in the analyzed window.
Noise filtered: lockfiles, `dist/`, `.astro/`, `node_modules/`, `.env*`, `test-results/`.

## Where the project was actually touched (TOP files)

| Count | File | Read |
|------|------|------|
| 13 | `package.json` | dependency/scripts churn — normal |
| 7 | `.github/workflows/keep-supabase-alive.yml` | CI heartbeat — much recent fiddling |
| 6 | `src/pages/index.astro` | home/matches entry page |
| 6 | `CLAUDE.md` | agent instructions evolving |
| 5 | `src/components/auth/auth-form.tsx` | core auth UI |
| 5 | `.github/workflows/pull-request.yml` | CI pipeline |
| 4 | `supabase/functions/sync-matches/index.ts` | **match sync Edge Function — the data spine** |
| 4 | `src/components/my-bets/{BetList,BetCard}.tsx` | betting UI |
| 4 | `src/components/matches/{MatchesView,MatchCard}.tsx` | matches UI |

## TOP areas (directories)

1. `src/components/my-bets` (25) — betting UI, hottest feature area
2. `src/components/matches` (18) — match listing/cards
3. `tests/e2e/pages` (15) + `tests/e2e/specs` (12) — Page Object Model E2E suite
4. `src/pages` (15) — Astro routes
5. `src/components/ui` (15) — Shadcn primitives
6. `src/lib/services` (12), `src/components/auth` (12), `.github/workflows` (12)
7. `src/db` (9), `src/components/leaderboard` (9)

## Activity over time (where the emphasis moved)

| Period | Commits | Focus |
|--------|---------|-------|
| 2025-10 | 26 | feature build kickoff |
| 2025-11 | 7 | — |
| **2025-12** | **62** | peak feature build: my-bets, matches, auth, pages, planning docs |
| 2026-01 | 28 | E2E tests + CI/CD |
| 2026-02 | 5 | CI stabilization |
| 2026-06 | 3 | CI keep-alive / heartbeat |

**Shift:** Oct–Dec 2025 = feature construction (`src/components/*`, `.planning`, `.ai`). Last ~6 months (Jan–Jun 2026) = E2E hardening + CI/CD (`tests/e2e/*`, `.github/workflows`). Feature development has **tapered**; the repo is in a stabilization phase, not active feature growth.

## Co-changes (what moves together)

- **E2E suite is internally cohesive**: `tests/e2e/{fixtures,pages,specs}` always change together (3×) — expected POM pattern.
- **`src/components/matches` ↔ `src/lib/api`** (3×) — match UI is coupled to the match API layer.
- **`src/components/ui` ↔ `src/pages`** (3×) — pages compose UI primitives.
- **auth spreads wide**: `src/components/auth` co-changes with `my-bets`, `db`, `pages`, `lib/validation` — auth touches many areas (session is cross-cutting).
- `.github/actions/setup ↔ .github/workflows` (2×) — composite action wired into CI.

## Cross-cutting "common denominator" files

Files coupled to many distinct areas (the connectors — change with care):

- `supabase/functions/sync-matches/index.ts` — the data ingestion spine (feeds all match/bet/score features).
- `src/types.ts` — shared Entities/DTOs.
- `src/middleware/index.ts` — request/session middleware (every authed route).
- `src/db/database.types.ts`, `src/db/supabase.browser.ts` — DB type + client surface.

All confirmed still present in the repo (not historical ghosts).

## Limits

12-month activity window only. This is *where work happened*, not *what is correct*. Solo-author repo, so co-change signal reflects one person's workflow, not team boundaries.
