/**
 * Global Setup for E2E Tests
 *
 * Seeds test data before all E2E tests run.
 * Ensures required tournaments and matches exist for testing.
 *
 * Strategy:
 * - Uses SUPABASE_SERVICE_ROLE_KEY if available (bypasses RLS)
 * - Creates test tournament if none exists
 * - Creates SCHEDULED matches if none exist
 * - Adds test user to scores table for leaderboard tests
 */

import { createClient } from "@supabase/supabase-js";

async function globalSetup() {
  console.log("🌱 Starting global setup (seeding test data)...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ Missing SUPABASE_URL in .env.test");
    return;
  }

  if (!serviceRoleKey) {
    console.warn("⚠️  No SUPABASE_SERVICE_ROLE_KEY - skipping seed (tests may fail due to missing data)");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log("🔑 Using service role key (bypasses RLS)");

  try {
    // 1. Ensure tournament exists
    const { data: tournaments } = await supabase.from("tournaments").select("id").limit(1);

    let tournamentId: number;

    if (!tournaments || tournaments.length === 0) {
      console.log("📝 Creating test tournament...");
      const { data: newTournament, error } = await supabase
        .from("tournaments")
        .insert({
          name: "Test Tournament E2E",
          api_tournament_id: 99999,
          country: "Test",
          logo_url: null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("❌ Failed to create tournament:", error.message);
        return;
      }
      tournamentId = newTournament.id;
      console.log("✅ Created test tournament (id:", tournamentId, ")");
    } else {
      tournamentId = tournaments[0].id;
      console.log("✅ Tournament exists (id:", tournamentId, ")");
    }

    // 2. Check for SCHEDULED matches (at least 10 minutes in future)
    const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "SCHEDULED")
      .gt("match_datetime", futureTime)
      .limit(1);

    if (!existingMatches || existingMatches.length === 0) {
      console.log("📝 Creating test matches...");

      // Create 5 test matches spread over next hours
      const matches = [];
      for (let i = 1; i <= 5; i++) {
        matches.push({
          api_match_id: 900000 + i,
          tournament_id: tournamentId,
          home_team: `Test Home Team ${i}`,
          away_team: `Test Away Team ${i}`,
          match_datetime: new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString(),
          status: "SCHEDULED",
        });
      }

      const { error } = await supabase.from("matches").insert(matches);

      if (error) {
        console.error("❌ Failed to create matches:", error.message);
      } else {
        console.log("✅ Created", matches.length, "test matches");
      }
    } else {
      console.log("✅ SCHEDULED matches exist");
    }

    // 3. Add test user to scores for leaderboard tests
    const testUserId = process.env.E2E_USERNAME_ID;

    if (testUserId) {
      const { data: existingScore } = await supabase
        .from("scores")
        .select("id")
        .eq("user_id", testUserId)
        .eq("tournament_id", tournamentId)
        .single();

      if (!existingScore) {
        const { error } = await supabase.from("scores").insert({
          user_id: testUserId,
          tournament_id: tournamentId,
          points: 10,
        });

        if (error) {
          console.error("❌ Failed to create score:", error.message);
        } else {
          console.log("✅ Created score entry for test user");
        }
      } else {
        console.log("✅ Test user score exists");
      }
    } else {
      console.warn("⚠️  E2E_USERNAME_ID not set - skipping score creation");
    }

    console.log("✅ Global setup complete!");
  } catch (err) {
    console.error("❌ Unexpected error in global setup:", err);
  }
}

export default globalSetup;
