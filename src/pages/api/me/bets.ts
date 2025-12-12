import type { APIRoute } from "astro";
import { BetService } from "@/lib/services/bet.service";
import { getUserBetsQuerySchema } from "@/lib/validation/bet.validation";
import type { BetWithMatchDTO, PaginatedResponseDTO, ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/me/bets
 * Retrieves all bets for the authenticated user with optional filters
 *
 * Query Parameters:
 * - tournament_id?: number (positive integer) - Filter by tournament
 * - match_id?: number (positive integer) - Filter by specific match
 * - limit?: number (1-100, default: 50) - Number of results per page
 * - offset?: number (min: 0, default: 0) - Number of records to skip
 *
 * Response:
 * - 200 OK: List of bets with pagination metadata
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
  // Filter out null values to prevent Zod coercion issues (Number(null) = 0 fails .positive())
  const rawParams = Object.fromEntries(
    Object.entries({
      tournament_id: url.searchParams.get("tournament_id"),
      match_id: url.searchParams.get("match_id"),
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    }).filter(([, v]) => v !== null)
  );

  const validationResult = getUserBetsQuerySchema.safeParse(rawParams);

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

  // 3. Fetch user bets via service
  const betService = new BetService(context.locals.supabase);

  try {
    const result = await betService.getUserBets(user.id, validationResult.data);

    // 4. Return success response
    return new Response(JSON.stringify(result satisfies PaginatedResponseDTO<BetWithMatchDTO>), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle errors
    // eslint-disable-next-line no-console
    console.error("GET /api/me/bets endpoint error:", {
      userId: user.id,
      params: validationResult.data,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

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
