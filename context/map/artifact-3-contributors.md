# Artifact 3 — Contributors (git)

Window: last 12 months. Bots/agents (github-actions, Claude/Codex/Copilot) filtered.

## Reality: effectively a solo repo

| Author | Commits (12mo) | Scope |
|--------|----------------|-------|
| Jarosław Latek | 130 | **everything** — sole author of all features, tests, CI |
| psmyrdek | 1 | starter/template seed (`10x-astro-starter` author) |
| “mkczarkowski” | 0 (older) | template-era only |

## "Who to ask" per area

There is no team to route questions to — **Jarek owns every area** (`my-bets`, `matches`, `auth`, `leaderboard`, `sync-matches`, CI). The course's contributor-mapping step does not produce useful routing here.

The practical substitute for tribal knowledge is the in-repo documentation, which is unusually rich for a solo project:
- `.ai/` — PRD, db-plan, api-plan, tech-stack, per-endpoint & per-view implementation plans
- `.planning/` — architecture/db/UI planning sessions, workflows, status summaries (`.statusy-i-podsumowania`)
- `CLAUDE.md` — architecture rules of record
- `~/.claude/.../memory/project-betmate-status.md` — current status snapshot

**Onboarding handoff:** for any area, read the matching `.ai/*-implementation-plan.md` instead of looking for a person.

## Limits

Solo authorship means git "ownership" carries no division-of-labor signal. `psmyrdek`/`mkczarkowski` are template provenance, not active contributors.
