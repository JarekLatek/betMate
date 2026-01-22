import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model for the Leaderboard/Ranking page
 * Encapsulates interactions with the tournament leaderboard
 */
export class LeaderboardPage {
  readonly page: Page;
  readonly leaderboardTable: Locator;
  readonly errorMessage: Locator;
  readonly refreshButton: Locator;
  readonly noTournamentsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.leaderboardTable = page.getByTestId("leaderboard-table");
    this.errorMessage = page.getByTestId("leaderboard-error");
    this.refreshButton = page.getByTestId("leaderboard-refresh-button");
    this.noTournamentsMessage = page.getByTestId("no-tournaments");
  }

  /**
   * Navigate to the leaderboard page
   */
  async goto(tournamentId?: number) {
    const url = tournamentId ? `/leaderboard?tournamentId=${tournamentId}` : "/leaderboard";
    await this.page.goto(url);
  }

  /**
   * Wait for the leaderboard table to load
   */
  async waitForLeaderboardToLoad() {
    await this.leaderboardTable.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Check if the leaderboard table is visible
   */
  async isLeaderboardVisible(): Promise<boolean> {
    return await this.leaderboardTable.isVisible();
  }

  /**
   * Check if an error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Click the refresh button (shown on error)
   */
  async clickRefresh() {
    await this.refreshButton.click();
  }

  /**
   * Check if "no tournaments" message is displayed
   */
  async hasNoTournaments(): Promise<boolean> {
    return await this.noTournamentsMessage.isVisible();
  }

  /**
   * Get all leaderboard rows (excluding header)
   */
  getLeaderboardRows(): Locator {
    return this.leaderboardTable.locator("tbody tr");
  }

  /**
   * Get the count of participants in the leaderboard
   */
  async getParticipantCount(): Promise<number> {
    return await this.getLeaderboardRows().count();
  }

  /**
   * Get leaderboard entry by position/rank
   */
  async getEntryByRank(rank: number): Promise<{
    username: string;
    points: string;
  }> {
    const row = this.getLeaderboardRows().nth(rank - 1);
    const username = (await row.locator("td").nth(1).textContent()) || "";
    const points = (await row.locator("td").nth(2).textContent()) || "";

    return { username, points };
  }
}
