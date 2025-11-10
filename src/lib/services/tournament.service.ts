import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { TournamentDTO } from "@/types";

/**
 * Service class for tournament-related database operations
 * Handles all business logic for retrieving tournament data
 */
export class TournamentService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieve all available tournaments
   *
   * Returns tournaments ordered alphabetically by name.
   * Access is controlled by RLS policy (authenticated users only).
   *
   * @returns Array of all tournaments
   * @throws Error if database query fails
   */
  async getAllTournaments(): Promise<TournamentDTO[]> {
    const { data, error } = await this.supabase
      .from("tournaments")
      .select("id, name, api_tournament_id")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  }
}
