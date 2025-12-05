/**
 * Supabase Server Client
 *
 * This client is used in server-side code only:
 * - Astro middleware
 * - API routes
 * - Astro page components (server-side)
 *
 * ⚠️ IMPORTANT: Never import this file in React components or other client-side code.
 * For client-side, use `supabase.browser.ts` instead.
 *
 * Usage in middleware:
 * ```typescript
 * context.locals.supabase = createSupabaseServerClient(context.cookies);
 * ```
 *
 * Usage in Astro pages/API routes:
 * ```typescript
 * const supabase = Astro.locals.supabase; // or context.locals.supabase
 * ```
 */
import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

/**
 * Creates a Supabase server client with cookie-based session management.
 * Must be called per-request to ensure proper cookie handling.
 *
 * @param cookies - AstroCookies instance from the request context
 * @returns Supabase client configured for server-side use
 */
export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      get(key: string) {
        return cookies.get(key)?.value;
      },
      set(key: string, value: string, options) {
        cookies.set(key, value, options);
      },
      remove(key: string, options) {
        cookies.delete(key, options);
      },
    },
  });
}
