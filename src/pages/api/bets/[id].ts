import type { APIRoute } from "astro";
import { z } from "zod";
import { BetService } from "@/lib/services/bet.service";
import { updateBetSchema, betIdSchema } from "@/lib/validation/bet.validation";
import type { ApiResponse, BetEntity, ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * PUT /api/bets/:id
 * Updates an existing bet for the authenticated user
 *
 * URL Parameters:
 * - id: number (positive integer) - The bet ID to update
 *
 * Request Body:
 * - picked_result: "HOME_WIN" | "DRAW" | "AWAY_WIN"
 *
 * Response:
 * - 200 OK: Bet successfully updated
 * - 400 Bad Request: Invalid request body or bet ID
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Cannot modify bet (match started or starts in less than 5 minutes)
 * - 404 Not Found: Bet does not exist or doesn't belong to user
 * - 500 Internal Server Error: Unexpected error
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Check authentication
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

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

    // Step 2: Validate bet ID parameter
    let betId: number;
    try {
      betId = betIdSchema.parse(params.id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid bet ID",
            details: error.issues.map((issue) => ({
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
      throw error;
    }

    // Step 3: Parse request body
    let body: unknown;
    try {
      body = await request.json();
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

    // Step 4: Validate request body
    let validatedData: { picked_result: "HOME_WIN" | "DRAW" | "AWAY_WIN" };
    try {
      validatedData = updateBetSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body",
            details: error.issues.map((issue) => ({
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
      throw error;
    }

    // Step 5: Update bet via service
    const betService = new BetService(locals.supabase);
    const result = await betService.updateBet(betId, user.id, validatedData);

    // Step 6: Handle result
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error,
          ...(result.reason && { reason: result.reason }),
        } satisfies ApiErrorResponse),
        {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        data: result.data,
      } satisfies ApiResponse<BetEntity>),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Unexpected error
    // eslint-disable-next-line no-console
    console.error("Unexpected error in PUT /api/bets/:id:", error);
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

/**
 * DELETE /api/bets/:id
 * Deletes an existing bet for the authenticated user
 *
 * URL Parameters:
 * - id: number (positive integer) - The bet ID to delete
 *
 * Response:
 * - 200 OK: Bet successfully deleted
 * - 400 Bad Request: Invalid bet ID
 * - 401 Unauthorized: User not authenticated
 * - 403 Forbidden: Cannot delete bet (match started or starts in less than 5 minutes)
 * - 404 Not Found: Bet does not exist or doesn't belong to user
 * - 500 Internal Server Error: Unexpected error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Check authentication
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

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

    // Step 2: Validate bet ID parameter
    let betId: number;
    try {
      betId = betIdSchema.parse(params.id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid bet ID",
            details: error.issues.map((issue) => ({
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
      throw error;
    }

    // Step 3: Delete bet via service
    const betService = new BetService(locals.supabase);
    const result = await betService.deleteBet(betId, user.id);

    // Step 4: Handle result
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.error,
          ...(result.reason && { reason: result.reason }),
        } satisfies ApiErrorResponse),
        {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        data: { deleted: true },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Unexpected error
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/bets/:id:", error);
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
