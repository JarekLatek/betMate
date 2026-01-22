/**
 * Supabase Browser Client
 *
 * This client is used in client-side code only:
 * - React components
 * - Client-side scripts
 *
 * ⚠️ IMPORTANT: Never import this file in server-side code (middleware, API routes, Astro pages).
 * For server-side, use `supabase.server.ts` instead.
 *
 * Usage in React components:
 * ```typescript
 * import { supabaseBrowser } from '@/db/supabase.browser';
 *
 * const { data, error } = await supabaseBrowser.auth.signInWithPassword({
 *   email,
 *   password,
 * });
 * ```
 */
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

export const supabaseBrowser = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
);
