/**
 * Shared pure scoring rule — the single source of truth for the points awarded
 * for a correct bet. Imported by BOTH runtimes:
 *   - Node/Astro: `src/lib/services/scoring.service.ts` (via `@/lib/scoring/score-rule`)
 *   - Deno edge:  `supabase/functions/sync-matches/index.ts` (via relative path)
 *
 * MUST stay dependency-free and import-clean for Deno: no `@/` path-alias
 * imports, no Node built-ins. The outcome union is inlined (not imported from
 * `@/types`) so the Deno edge function can import this file by relative path.
 *
 * ORACLE (2026-06-18 decision): the agreed rule is **3 points for a correct
 * outcome, 0 for a wrong pick or an unresolved match**. There is no `prd.md` on
 * disk; this decision — recorded in `context/foundation/test-plan.md` §2/§6.1
 * and change `testing-scoring-bet-lock-core` — is the oracle for all scoring
 * tests. A richer future "Toto" model (exact scoreline = 3, correct outcome
 * only = 1, wrong = 0) is a DEFERRED enhancement: it needs predicted-goals
 * columns in `bets`, a scoreline-entry UI, and a scoring rewrite, none of which
 * exist today. Do not encode it here until that change lands.
 */

/** Match outcome enum, inlined to keep this module Deno-import-clean. */
export type ScoreRuleOutcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";

/** Points awarded for a correct outcome pick. Single source of truth. */
export const POINTS_FOR_CORRECT_BET = 3;

/**
 * Pure points rule: returns `POINTS_FOR_CORRECT_BET` when the pick matches the
 * resolved result, otherwise `0` (including when the match has no result yet).
 */
export function pointsForBet(picked: ScoreRuleOutcome, result: ScoreRuleOutcome | null): number {
  if (result !== null && picked === result) {
    return POINTS_FOR_CORRECT_BET;
  }
  return 0;
}
