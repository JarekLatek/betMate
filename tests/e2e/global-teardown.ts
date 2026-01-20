/**
 * Global Teardown for E2E Tests
 *
 * Cleans up test data after all E2E tests have completed.
 * This ensures each test run starts with a clean slate.
 *
 * Strategy:
 * - Uses SUPABASE_SERVICE_ROLE_KEY if available (bypasses RLS)
 * - Falls back to authenticated user (limited by RLS policies)
 * - Only cleans data created during tests (bets, scores)
 * - Preserves seed data (matches, tournaments) needed for tests
 */

import { createClient } from "@supabase/supabase-js";

async function globalTeardown() {
  console.log("🧹 Starting global teardown...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLIC_KEY;
  const useServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials in .env.test");
    return;
  }

  console.log(
    useServiceRole
      ? "🔑 Using service role key (bypasses RLS)"
      : "🔑 Using anon key (limited by RLS policies)",
  );

  const supabase = createClient(supabaseUrl, supabaseKey);

  // If using anon key, authenticate as test user
  if (!useServiceRole) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_USERNAME!,
      password: process.env.E2E_PASSWORD!,
    });

    if (signInError) {
      console.error("❌ Failed to authenticate test user:", signInError.message);
      return;
    }

    console.log("✅ Authenticated as test user");
  }

  // Tables to clean (in order - dependencies first)
  const tablesToClean = [
    { name: "bets", description: "User bets/predictions" },
    { name: "scores", description: "User points per tournament" },
  ];

  // Clean each table
  for (const table of tablesToClean) {
    try {
      // For bets table: delete by checking if id >= 1 (all records)
      // For scores table: delete by checking if user_id is the test user
      let query;

      if (table.name === "bets") {
        // Delete all bets (or only test user's bets if using anon key)
        query = supabase.from(table.name).delete().gte("id", 1);
      } else if (table.name === "scores") {
        // Delete scores for test user only
        query = supabase.from(table.name).delete().eq("user_id", process.env.E2E_USERNAME_ID!);
      } else {
        // Default: try to delete all
        query = supabase.from(table.name).delete().gte("id", 1);
      }

      const { error } = await query;

      if (error) {
        console.error(`❌ Error cleaning ${table.name}:`, error.message);
      } else {
        console.log(`✅ Cleaned ${table.name} (${table.description})`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error cleaning ${table.name}:`, err);
    }
  }

  // Sign out if we authenticated
  if (!useServiceRole) {
    await supabase.auth.signOut();
  }

  console.log("✨ Global teardown complete!");
}

export default globalTeardown;
