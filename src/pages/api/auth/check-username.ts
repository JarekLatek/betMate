import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

/**
 * Request body schema for username validation
 */
const checkUsernameSchema = z.object({
  username: z.string().min(3, "Nazwa użytkownika musi mieć co najmniej 3 znaki"),
});

/**
 * Response type for username availability check
 */
interface CheckUsernameResponse {
  available: boolean;
  message?: string;
}

/**
 * POST /api/auth/check-username
 * Check if a username is available for registration
 *
 * This endpoint is PUBLIC (no authentication required) as it's used
 * during the registration flow before the user has an account.
 *
 * Request body:
 * - username: string (min 3 characters)
 *
 * Response:
 * - 200 OK: Returns { available: true/false, message?: string }
 * - 400 Bad Request: Invalid input (username too short)
 * - 500 Internal Server Error: Database error
 */
export const POST: APIRoute = async (context) => {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({
        available: false,
        message: "Nieprawidłowe dane wejściowe",
      } satisfies CheckUsernameResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Validate schema
  const validation = checkUsernameSchema.safeParse(body);
  if (!validation.success) {
    const errorMessage = validation.error.errors[0]?.message ?? "Nieprawidłowa nazwa użytkownika";
    return new Response(
      JSON.stringify({
        available: false,
        message: errorMessage,
      } satisfies CheckUsernameResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { username } = validation.data;

  // 3. Check username availability in profiles table
  try {
    // Using service_role via server client to bypass RLS
    // as this endpoint is public and needs read access to profiles
    const { data, error } = await context.locals.supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Error checking username availability:", error);
      return new Response(
        JSON.stringify({
          available: false,
          message: "Błąd serwera przy sprawdzaniu nazwy użytkownika",
        } satisfies CheckUsernameResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // If data is null, username is available
    const available = data === null;

    return new Response(
      JSON.stringify({
        available,
        message: available ? undefined : "Nazwa użytkownika jest już zajęta",
      } satisfies CheckUsernameResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error checking username:", error);
    return new Response(
      JSON.stringify({
        available: false,
        message: "Wystąpił nieoczekiwany błąd",
      } satisfies CheckUsernameResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
