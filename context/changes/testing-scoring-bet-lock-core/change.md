---
change_id: testing-scoring-bet-lock-core
title: Testing scoring bet lock core
status: implementing
created: 2026-06-18
updated: 2026-06-18
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

**Scoring oracle decision (2026-06-18):** The agreed rule is **3 points for a correct
outcome, 0 for wrong** — the current code is correct. There is no `prd.md` on disk, so
this decision (not a PRD line) is the oracle for all scoring tests. The richer "Toto"
model (exact scoreline = 3, correct outcome only = 1, wrong = 0) is a **deferred future
enhancement** — it requires predicted-goals columns in `bets`, a scoreline entry UI, and
a scoring rewrite, none of which exist today.
