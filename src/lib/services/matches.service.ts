import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { MatchDTO, PaginatedResponseDTO } from "@/types";
import type { GetMatchesQuery } from "@/lib/validation/matches.validation";

/**
 * Service class for match-related database operations
 * Handles fetching matches with optional filtering and pagination
 */
export class MatchesService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves a paginated list of matches with optional filtering
   * Includes user's bets for each match (if exists)
   *
   * @param userId - The authenticated user's ID
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated response with matches and user bets
   * @throws PostgrestError if database operation fails
   */
  async getMatches(userId: string, query: GetMatchesQuery): Promise<PaginatedResponseDTO<MatchDTO>> {
    // Build query with filters
    let matchesQuery = this.supabase.from("matches").select(
      `
        *,
        user_bet:bets!left(id, picked_result, created_at, updated_at)
      `,
      { count: "exact" }
    );

    // Filter bets to only include current user's bets (LEFT JOIN condition)
    matchesQuery = matchesQuery.or(`user_id.eq.${userId},user_id.is.null`, {
      foreignTable: "bets",
    });

    // Apply filters
    if (query.tournament_id) {
      matchesQuery = matchesQuery.eq("tournament_id", query.tournament_id);
    }

    if (query.status) {
      matchesQuery = matchesQuery.eq("status", query.status as Database["public"]["Enums"]["match_status"]);
    }

    if (query.from_date) {
      matchesQuery = matchesQuery.gte("match_datetime", query.from_date);
    }

    if (query.to_date) {
      matchesQuery = matchesQuery.lte("match_datetime", query.to_date);
    }

    // Apply ordering and pagination
    matchesQuery = matchesQuery
      .order("match_datetime", { ascending: true })
      .range(query.offset, query.offset + query.limit - 1);

    // Execute query
    const { data, error, count } = await matchesQuery;

    if (error) {
      throw error;
    }

    // Transform data to MatchDTO[]
    // Note: Supabase returns bets as an array even with left join, we need to extract first element
    const matches: MatchDTO[] = (data || []).map((match) => ({
      ...match,
      user_bet: Array.isArray(match.user_bet) && match.user_bet.length > 0 ? match.user_bet[0] : null,
    }));

    // Calculate pagination metadata
    const total = count || 0;
    const has_more = query.offset + query.limit < total;

    return {
      data: matches,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        has_more,
      },
    };
  }
}
