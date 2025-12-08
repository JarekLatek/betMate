import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "@/db/supabase.server";

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a new Supabase client per-request with cookie access
  context.locals.supabase = createSupabaseServerClient(context.cookies);

  // Get authenticated user from Supabase Auth server
  const {
    data: { user },
  } = await context.locals.supabase.auth.getUser();

  context.locals.user = user ?? null;

  return next();
});
