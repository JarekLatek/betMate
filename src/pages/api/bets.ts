import type { APIRoute } from "astro";
import type { PostgrestError } from "@supabase/supabase-js";
import { BetService } from "@/lib/services/bet.service";
import { createBetSchema } from "@/lib/validation/bet.validation";
import { mapDatabaseError } from "@/lib/utils/error-mapper";
import type { ApiResponse, BetEntity, ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * POST /api/bets
 * Creates a new bet for the authenticated user
 *
 * Request Body:
 * - match_id: number (positive integer)
 * - picked_result: "HOME_WIN" | "DRAW" | "AWAY_WIN"
 *
 * Response:
 * - 201 Created: Bet successfully created
 * - 400 Bad Request: Invalid request body
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Cannot bet on this match (RLS policy violation)
 * - 404 Not Found: Match does not exist
 * - 409 Conflict: Bet already exists for this match
 * - 500 Internal Server Error: Unexpected error
 */
export const POST: APIRoute = async (context) => {
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

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON in request body",
      } satisfies ApiErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const validationResult = createBetSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
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

  // 3. Create bet via service
  const betService = new BetService(context.locals.supabase);

  try {
    const bet = await betService.createBet(user.id, validationResult.data);

    // 4. Return success response with Location header
    return new Response(
      JSON.stringify({
        data: bet,
      } satisfies ApiResponse<BetEntity>),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          Location: `/api/bets/${bet.id}`,
        },
      }
    );
  } catch (error) {
    // 5. Handle database errors
    // eslint-disable-next-line no-console
    console.error("[POST /api/bets]", {
      error,
      user_id: user.id,
      match_id: validationResult.data.match_id,
      timestamp: new Date().toISOString(),
    });

    const apiError = mapDatabaseError(error as PostgrestError);

    return new Response(
      JSON.stringify({
        error: apiError.error,
        ...(apiError.reason && { reason: apiError.reason }),
      } satisfies ApiErrorResponse),
      {
        status: apiError.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
