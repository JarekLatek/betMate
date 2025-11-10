import type { APIRoute } from "astro";
import { getMatchesQuerySchema } from "@/lib/validation/matches.validation";
import { MatchesService } from "@/lib/services/matches.service";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/matches
 * Retrieves a paginated list of matches with optional filtering
 * Includes user's bets for each match (if exists)
 *
 * Query Parameters:
 * - tournament_id?: number (positive integer)
 * - status?: "SCHEDULED" | "IN_PLAY" | "FINISHED" | "POSTPONED" | "CANCELED"
 * - from_date?: string (ISO 8601 datetime)
 * - to_date?: string (ISO 8601 datetime)
 * - limit?: number (1-100, default: 50)
 * - offset?: number (min: 0, default: 0)
 *
 * Response:
 * - 200 OK: Matches retrieved successfully
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: User not authenticated
 * - 500 Internal Server Error: Unexpected error
 */
export const GET: APIRoute = async (context) => {
  // 1. Authentication check
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

  // 2. Parse and validate query parameters
  const url = new URL(context.request.url);
  const queryParams = Object.fromEntries(url.searchParams);

  const validationResult = getMatchesQuerySchema.safeParse(queryParams);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: validationResult.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
        })),
      } satisfies ApiErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Fetch matches via service
  const matchesService = new MatchesService(context.locals.supabase);

  try {
    const result = await matchesService.getMatches(user.id, validationResult.data);

    // 4. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle database errors
    // eslint-disable-next-line no-console
    console.error("[GET /api/matches]", {
      error,
      user_id: user.id,
      query: validationResult.data,
      timestamp: new Date().toISOString(),
    });

    // For unexpected errors, return 500
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
