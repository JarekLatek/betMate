import type { APIRoute } from "astro";
import { TournamentService } from "@/lib/services/tournament.service";
import type { ApiResponse, TournamentDTO, ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/tournaments
 * Retrieves all available tournaments
 *
 * Response:
 * - 200 OK: Successfully retrieved tournaments list
 * - 401 Unauthorized: User not authenticated
 * - 500 Internal Server Error: Unexpected error
 */
export const GET: APIRoute = async (context) => {
  // 1. Authentication check (guard clause)
  const {
    data: { user },
    error: authError,
  } = await context.locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
      } satisfies ApiErrorResponse),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Fetch tournaments (happy path)
  try {
    const tournamentService = new TournamentService(context.locals.supabase);
    const tournaments = await tournamentService.getAllTournaments();

    return new Response(
      JSON.stringify({
        data: tournaments,
      } satisfies ApiResponse<TournamentDTO[]>),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // 1 hour cache
        },
      }
    );
  } catch (error) {
    // 3. Handle unexpected errors
    // eslint-disable-next-line no-console
    console.error("Error fetching tournaments:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
