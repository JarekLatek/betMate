import type { APIRoute } from "astro";

import { leaderboardParamsSchema, leaderboardQuerySchema } from "@/lib/validation/leaderboard.validation";
import { getLeaderboard } from "@/lib/services/leaderboard.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
  // Step 1: Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Step 2: Validate URL parameters
  const paramsValidation = leaderboardParamsSchema.safeParse({
    tournament_id: params.tournament_id,
  });

  if (!paramsValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid tournament_id",
        details: paramsValidation.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Validate query parameters
  const queryParams = {
    limit: url.searchParams.get("limit"),
    offset: url.searchParams.get("offset"),
  };

  const queryValidation = leaderboardQuerySchema.safeParse(queryParams);

  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: queryValidation.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 4: Extract validated data
  const { tournament_id } = paramsValidation.data;
  const { limit, offset } = queryValidation.data;

  // Step 5: Fetch leaderboard from service
  try {
    const leaderboard = await getLeaderboard(locals.supabase, tournament_id, limit, offset);

    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
