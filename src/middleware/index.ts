import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "@/db/supabase.server";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a new Supabase client per-request with cookie access
  context.locals.supabase = createSupabaseServerClient(context.cookies);

  // Get session from cookies
  const {
    data: { session },
  } = await context.locals.supabase.auth.getSession();

  // Expose user data to context
  context.locals.user = session?.user ?? null;

  return next();
});
