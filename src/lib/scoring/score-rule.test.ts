import { describe, it, expect } from "vitest";
import { pointsForBet, POINTS_FOR_CORRECT_BET, type ScoreRuleOutcome } from "./score-rule";

// ORACLE: the agreed rule (2026-06-18 decision, recorded in test-plan.md §2/§6.1
// and change `testing-scoring-bet-lock-core`) is 3 points for a correct outcome,
// 0 otherwise. The expected values below come from that decision — they are NOT
// echoed from the implementation under test (no `toBe(POINTS_FOR_CORRECT_BET)`
// for the award cases).
describe("score-rule / pointsForBet", () => {
  const OUTCOMES: ScoreRuleOutcome[] = ["HOME_WIN", "DRAW", "AWAY_WIN"];

  it("awards 3 points for each correct outcome", () => {
    for (const outcome of OUTCOMES) {
      expect(pointsForBet(outcome, outcome)).toBe(3);
    }
  });

  it("awards 0 points for a wrong pick", () => {
    expect(pointsForBet("HOME_WIN", "AWAY_WIN")).toBe(0);
    expect(pointsForBet("DRAW", "HOME_WIN")).toBe(0);
    expect(pointsForBet("AWAY_WIN", "DRAW")).toBe(0);
  });

  it("awards 0 points when the match has no result yet (result === null)", () => {
    for (const outcome of OUTCOMES) {
      expect(pointsForBet(outcome, null)).toBe(0);
    }
  });

  it("pins the agreed constant at 3 (oracle value, not a code echo)", () => {
    expect(POINTS_FOR_CORRECT_BET).toBe(3);
  });
});
