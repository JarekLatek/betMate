# Artifact 3 — Contributor context (Git)

Analysis date: **2026-09-14**

Window: **2025-09-14 → 2026-09-14**

## Result: single-author knowledge concentration

After filtering automation, every one of the **136 human-authored commits** in the
window belongs to **Jarosław Latek**. One additional commit belongs to
`github-actions[bot]`. Older template authors do not occur in the analyzed 12-month
window and are not current support candidates.

Git therefore cannot route questions between specialists in this repository. It does
show which commits and documents preserve context for each risky area, while the
architectural decisions still require confirmation from Jarek.

## Areas that require contributor context

| Area                          | Contributor    | Repeated themes in history                                                     | Useful evidence before a change                                                              |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Scoring and match sync        | Jarosław Latek | API-Football sync, leaderboard scoring, shared points rule                     | `cf1ef10`, `7844bcb`, `3f2c890`, `2956e01`; `context/changes/testing-scoring-bet-lock-core/` |
| Bets and five-minute lock     | Jarosław Latek | API CRUD, database/RLS policies, deletion and score display                    | `f84bfd0`, `04d6282`, `829f817`, `39f1cc9`; `.ai/post-api-bets-implementation-plan.md`       |
| Authentication and session    | Jarosław Latek | Supabase client generation, auth plan, forms, password recovery, E2E selectors | `e84b4bc`, `338dfbe`, `0ff1e28`, `9058bb`, `a77254b`; `.ai/auth-spec.md`                     |
| Database and shared contracts | Jarosław Latek | migrations, generated DB types, DTO generation, exact-score fields             | `f84bfd0`, `abc90b8`, `04d6282`, `829f817`, `3cf4931`; `.ai/db-plan.md`, `.ai/api-plan.md`   |
| E2E and CI/operations         | Jarosław Latek | Playwright suite, test environment/secrets, Supabase keep-alive workflow       | `5b106ff`, `7364d46`, `675cd36`, `2a7e83f`, `865df24`, `437cc0a`; `tests/e2e/E2E-README.md`  |

## Knowledge-routing implications

- **Person to ask:** Jarek for every high-risk zone. Git does not support a more
  granular ownership claim.
- **Scoring decisions:** use the explicit decision notes in
  `context/changes/testing-scoring-bet-lock-core/change.md`, but reconcile them with
  `.ai/prd.md`, which still specifies one point rather than three.
- **Original product intent:** `.ai/prd.md`, `.ai/api-plan.md`, `.ai/db-plan.md` and the
  feature implementation plans are the best local substitute for missing reviewers.
- **Current truth:** code, migrations and executable tests outrank old plans when they
  describe what the system does now.
- **External personal memory is not a repository dependency:** the prior artifact's
  reference to a file under `~/.claude` was removed because another developer or agent
  cannot rely on it during onboarding.

## Limits and unknowns

- Commit authorship is not the same as deliberate architectural ownership or approval.
- Broad commits and generic subjects reduce the precision of topic classification.
- The map cannot reveal uncommitted decisions, operational knowledge or whether the
  sole contributor still endorses an older plan; these require a user decision gate.
- No pull-request discussion or external issue tracker was analyzed.
