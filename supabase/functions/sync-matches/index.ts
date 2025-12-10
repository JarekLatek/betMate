/**
 * Edge Function: sync-matches
 *
 * Synchronizes tournaments and matches from api-football.com to Supabase database.
 *
 * Two modes of operation:
 * - full: Fetches new matches since last sync (run every 2-6h)
 * - live: Updates matches currently in play (run every 5-15 min)
 *
 * Usage:
 * - GET /sync-matches?mode=full  - Sync new matches
 * - GET /sync-matches?mode=live  - Update live matches
 * - GET /sync-matches            - Defaults to full mode
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Tournament IDs from api-football.com
const TOURNAMENT_IDS = [
  { apiId: 2, name: "UEFA Champions League" },
  { apiId: 3, name: "UEFA Europa League" },
  // Add more tournaments as needed
];

// API-Football status to our status mapping
type MatchStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED" | "POSTPONED" | "CANCELED";
type MatchOutcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";

function mapApiStatus(apiStatus: string): MatchStatus {
  const statusMap: Record<string, MatchStatus> = {
    // Not started
    TBD: "SCHEDULED",
    NS: "SCHEDULED",
    // In play
    "1H": "IN_PLAY",
    HT: "IN_PLAY",
    "2H": "IN_PLAY",
    ET: "IN_PLAY",
    BT: "IN_PLAY",
    P: "IN_PLAY",
    SUSP: "IN_PLAY",
    INT: "IN_PLAY",
    LIVE: "IN_PLAY",
    // Finished
    FT: "FINISHED",
    AET: "FINISHED",
    PEN: "FINISHED",
    // Postponed
    PST: "POSTPONED",
    // Canceled
    CANC: "CANCELED",
    ABD: "CANCELED",
    AWD: "CANCELED",
    WO: "CANCELED",
  };

  return statusMap[apiStatus] || "SCHEDULED";
}

function calculateResult(homeGoals: number | null, awayGoals: number | null): MatchOutcome | null {
  if (homeGoals === null || awayGoals === null) {
    return null;
  }

  if (homeGoals > awayGoals) return "HOME_WIN";
  if (homeGoals < awayGoals) return "AWAY_WIN";
  return "DRAW";
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0];
}

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
    };
  };
  league: {
    id: number;
    name: string;
    season: number;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiResponse {
  response: ApiFixture[];
  errors: Record<string, string>;
}

interface SyncResults {
  mode: "full" | "live";
  tournaments: { processed: number; errors: number };
  matches: { inserted: number; updated: number; skipped: number; errors: number };
}

interface MatchToUpdate {
  id: string;
  api_match_id: number;
  tournament_id: string;
}

/**
 * FULL MODE: Fetch and insert only new matches
 */
async function syncFullMode(
  supabase: SupabaseClient,
  footballApiUrl: string,
  footballApiKey: string
): Promise<SyncResults> {
  const results: SyncResults = {
    mode: "full",
    tournaments: { processed: 0, errors: 0 },
    matches: { inserted: 0, updated: 0, skipped: 0, errors: 0 },
  };

  const season = new Date().getFullYear();

  for (const tournament of TOURNAMENT_IDS) {
    console.log(`[FULL] Processing tournament: ${tournament.name}`);

    // 1. Upsert tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .upsert(
        {
          name: tournament.name,
          api_tournament_id: tournament.apiId,
        },
        { onConflict: "api_tournament_id" }
      )
      .select("id")
      .single();

    if (tournamentError) {
      console.error(`Error upserting tournament ${tournament.name}:`, tournamentError);
      results.tournaments.errors++;
      continue;
    }

    results.tournaments.processed++;
    const tournamentId = tournamentData.id;

    // 2. Get last match date from database for this tournament
    const { data: lastMatch } = await supabase
      .from("matches")
      .select("match_datetime")
      .eq("tournament_id", tournamentId)
      .order("match_datetime", { ascending: false })
      .limit(1)
      .single();

    // 3. Get existing api_match_ids for this tournament
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("api_match_id")
      .eq("tournament_id", tournamentId);

    const existingIds = new Set((existingMatches || []).map((m: { api_match_id: number }) => m.api_match_id));

    // 4. Build API URL with date filter if we have existing matches
    let fixturesUrl = `${footballApiUrl}/fixtures?league=${tournament.apiId}&season=${season}`;

    if (lastMatch?.match_datetime) {
      const fromDate = formatDateForApi(new Date(lastMatch.match_datetime));
      fixturesUrl += `&from=${fromDate}`;
      console.log(`[FULL] Fetching matches from ${fromDate}`);
    } else {
      console.log(`[FULL] First sync - fetching all matches`);
    }

    // 5. Fetch from API
    const fixturesResponse = await fetch(fixturesUrl, {
      headers: { "x-apisports-key": footballApiKey },
    });

    if (!fixturesResponse.ok) {
      console.error(`API error for ${tournament.name}: ${fixturesResponse.status}`);
      continue;
    }

    const fixturesData: ApiResponse = await fixturesResponse.json();

    if (fixturesData.errors && Object.keys(fixturesData.errors).length > 0) {
      console.error(`API errors for ${tournament.name}:`, fixturesData.errors);
      continue;
    }

    console.log(`[FULL] API returned ${fixturesData.response.length} fixtures`);

    // 6. Filter and insert only new matches
    for (const fixture of fixturesData.response) {
      if (existingIds.has(fixture.fixture.id)) {
        results.matches.skipped++;
        continue;
      }

      const status = mapApiStatus(fixture.fixture.status.short);
      const result = status === "FINISHED" ? calculateResult(fixture.goals.home, fixture.goals.away) : null;

      const matchData = {
        tournament_id: tournamentId,
        home_team: fixture.teams.home.name,
        away_team: fixture.teams.away.name,
        match_datetime: fixture.fixture.date,
        status: status,
        result: result,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        api_match_id: fixture.fixture.id,
      };

      const { error: matchError } = await supabase.from("matches").insert(matchData);

      if (matchError) {
        console.error(`Error inserting match ${fixture.fixture.id}:`, matchError);
        results.matches.errors++;
      } else {
        results.matches.inserted++;
      }
    }
  }

  return results;
}

/**
 * LIVE MODE: Update only matches that are in play or should have started
 */
async function syncLiveMode(
  supabase: SupabaseClient,
  footballApiUrl: string,
  footballApiKey: string
): Promise<SyncResults> {
  const results: SyncResults = {
    mode: "live",
    tournaments: { processed: 0, errors: 0 },
    matches: { inserted: 0, updated: 0, skipped: 0, errors: 0 },
  };

  // 1. Find matches that are IN_PLAY or SCHEDULED but should have started
  const now = new Date().toISOString();

  const { data: matchesToUpdate, error: queryError } = await supabase
    .from("matches")
    .select("id, api_match_id, tournament_id")
    .or(`status.eq.IN_PLAY,and(status.eq.SCHEDULED,match_datetime.lte.${now})`)
    .returns<MatchToUpdate[]>();

  if (queryError) {
    console.error("[LIVE] Error querying matches:", queryError);
    throw new Error("Failed to query matches for live update");
  }

  if (!matchesToUpdate || matchesToUpdate.length === 0) {
    console.log("[LIVE] No matches to update - skipping API call");
    return results;
  }

  console.log(`[LIVE] Found ${matchesToUpdate.length} matches to update`);

  // 2. Group matches by api_match_id for batch lookup
  const apiMatchIds = matchesToUpdate.map((m: MatchToUpdate) => m.api_match_id);
  const matchIdMap = new Map<number, MatchToUpdate>(matchesToUpdate.map((m: MatchToUpdate) => [m.api_match_id, m]));

  // 3. Fetch current status from API (using fixture IDs)
  // API-Football allows fetching multiple fixtures by ID
  const idsParam = apiMatchIds.join("-");
  const fixturesUrl = `${footballApiUrl}/fixtures?ids=${idsParam}`;

  console.log(`[LIVE] Fetching ${apiMatchIds.length} fixtures from API`);

  const fixturesResponse = await fetch(fixturesUrl, {
    headers: { "x-apisports-key": footballApiKey },
  });

  if (!fixturesResponse.ok) {
    console.error(`[LIVE] API error: ${fixturesResponse.status}`);
    throw new Error(`API returned ${fixturesResponse.status}`);
  }

  const fixturesData: ApiResponse = await fixturesResponse.json();

  if (fixturesData.errors && Object.keys(fixturesData.errors).length > 0) {
    console.error("[LIVE] API errors:", fixturesData.errors);
    throw new Error("API returned errors");
  }

  // 4. Update each match with fresh data
  for (const fixture of fixturesData.response) {
    const matchInfo = matchIdMap.get(fixture.fixture.id);
    if (!matchInfo) continue;

    const status = mapApiStatus(fixture.fixture.status.short);
    const result = status === "FINISHED" ? calculateResult(fixture.goals.home, fixture.goals.away) : null;

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        status: status,
        result: result,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
      })
      .eq("id", matchInfo.id);

    if (updateError) {
      console.error(`[LIVE] Error updating match ${fixture.fixture.id}:`, updateError);
      results.matches.errors++;
    } else {
      results.matches.updated++;
      console.log(
        `[LIVE] Updated match ${fixture.fixture.id}: ${status} (${fixture.goals.home}-${fixture.goals.away})`
      );
    }
  }

  return results;
}

Deno.serve(async (req) => {
  try {
    // Parse mode from query params
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "full";

    if (mode !== "full" && mode !== "live") {
      return new Response(JSON.stringify({ error: "Invalid mode. Use 'full' or 'live'" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Starting sync in ${mode.toUpperCase()} mode`);

    // Get environment variables
    const footballApiKey = Deno.env.get("FOOTBALL_API_KEY");
    const footballApiUrl = Deno.env.get("FOOTBALL_API_URL") || "https://v3.football.api-sports.io";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!footballApiKey) {
      throw new Error("FOOTBALL_API_KEY is not set");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials are not set");
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute appropriate sync mode
    const results =
      mode === "full"
        ? await syncFullMode(supabase, footballApiUrl, footballApiKey)
        : await syncLiveMode(supabase, footballApiUrl, footballApiKey);

    console.log("Sync completed:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
