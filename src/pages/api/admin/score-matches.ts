import type { APIRoute } from "astro";
import { z } from "zod";
import { scoreMatches } from "@/lib/services/scoring.service";

export const prerender = false;

const scoreMatchesSchema = z.object({
  dry_run: z.boolean().optional().default(false),
});

export const POST: APIRoute = async ({ request, locals }) => {
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

  // Step 2: Parse and validate request body
  let body: { dry_run?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const validation = scoreMatchesSchema.safeParse(body);

  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: validation.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { dry_run } = validation.data;

  // Step 3: Execute scoring
  try {
    const result = await scoreMatches(locals.supabase, dry_run);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Score matches error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to score matches",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
