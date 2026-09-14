/**
 * Characterization tests for the production scoring path of `sync-matches`,
 * observed through the unmodified Edge handler (`index.ts`).
 *
 * Seam: a stubbed `Deno` global captures the handler registered by
 * `Deno.serve`, and a stubbed `fetch` routes the real supabase-js client to an
 * in-memory PostgREST fake. Both stubs are installed before the module import.
 *
 * These tests pin CURRENT behaviour, including known defects. Tests named
 * `known bug (C2|C3)` describe a defect that option #2 in
 * `context/changes/refactor-opportunities/research.md` (atomic scoring unit in
 * the DB) is meant to fix — when that change lands, flip the assertion and
 * rename the test.
 *
 * Points are asserted as literals (3, 6, 9) per test-plan §6.1, never by echoing
 * `POINTS_FOR_CORRECT_BET`.
 */
import { createPostgrestFake, type FakeRequest, type Row } from "../../../tests/support/postgrest-fake";

const SUPABASE_URL = "http://supabase.test";
const ENV: Record<string, string> = {
  FOOTBALL_API_KEY: "test-football-key",
  FOOTBALL_API_URL: "http://football.test",
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
};

type Handler = (req: Request) => Promise<Response>;

const fake = createPostgrestFake({ supabaseUrl: SUPABASE_URL });
let handler: Handler;
let externalRequests: string[] = [];

async function invoke(mode = "live") {
  const res = await handler(new Request(`http://edge.test/sync-matches?mode=${mode}`));
  return { status: res.status, body: await res.json() };
}

function scoreRows() {
  return (fake.tables.scores ?? [])
    .map(({ user_id, tournament_id, points }) => ({ user_id, tournament_id, points }))
    .sort((a, b) => `${a.user_id}:${a.tournament_id}`.localeCompare(`${b.user_id}:${b.tournament_id}`));
}

function matchById(id: number): Row | undefined {
  return fake.tables.matches?.find((m) => m.id === id);
}

const isScoringMatchesQuery = (req: FakeRequest) =>
  req.method === "GET" && req.table === "matches" && req.params.has("is_scored");
const isLiveMatchesQuery = (req: FakeRequest) =>
  req.method === "GET" && req.table === "matches" && req.params.has("or");

function finishedMatch(id: number, tournament_id: number, result: string): Row {
  return {
    id,
    tournament_id,
    api_match_id: 1000 + id,
    status: "FINISHED",
    result,
    is_scored: false,
    match_datetime: "2026-01-01T20:00:00.000Z",
  };
}

function bet(id: number, match_id: number, user_id: string, picked_result: string): Row {
  return { id, match_id, user_id, picked_result };
}

beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (h: Handler) => {
      handler = h;
    },
    env: { get: (key: string) => ENV[key] },
  });
  vi.stubGlobal("fetch", fake.fetch);

  await import("./index.ts");
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  fake.reset();
  externalRequests = [];
  // Live mode with 0 matches to update must never call api-football.
  fake.onExternal((url) => {
    externalRequests.push(url.toString());
    return new Response("unexpected external request", { status: 500 });
  });
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  expect(externalRequests, "live mode must not call api-football").toEqual([]);
});

describe("sync-matches handler — scoring characterization (mode=live)", () => {
  it("H1: awards 3 points to a correct pick on top of existing 6, skips a wrong pick, marks the match", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN")],
      bets: [bet(1, 1, "u-hit", "HOME_WIN"), bet(2, 1, "u-miss", "DRAW")],
      scores: [{ user_id: "u-hit", tournament_id: 10, points: 6 }],
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results.scoring).toEqual({ processed_matches: 1, updated_scores: 1, errors: 0 });
    expect(scoreRows()).toEqual([{ user_id: "u-hit", tournament_id: 10, points: 9 }]);
    expect(matchById(1)?.is_scored).toBe(true);
  });

  it("H2: creates a score row with 3 points when the user has none (single() → 406 PGRST116)", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "DRAW")],
      bets: [bet(1, 1, "u-new", "DRAW")],
      scores: [],
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.results.scoring).toEqual({ processed_matches: 1, updated_scores: 1, errors: 0 });
    expect(scoreRows()).toEqual([{ user_id: "u-new", tournament_id: 10, points: 3 }]);
    expect(matchById(1)?.is_scored).toBe(true);
  });

  it("H3: accumulates points per (user, tournament) across several matches and tournaments", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN"), finishedMatch(2, 10, "DRAW"), finishedMatch(3, 20, "AWAY_WIN")],
      bets: [
        bet(1, 1, "u-a", "HOME_WIN"),
        bet(2, 2, "u-a", "DRAW"),
        bet(3, 3, "u-a", "AWAY_WIN"),
        bet(4, 2, "u-b", "DRAW"),
        bet(5, 3, "u-b", "HOME_WIN"),
      ],
      scores: [],
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.results.scoring).toEqual({ processed_matches: 3, updated_scores: 4, errors: 0 });
    expect(scoreRows()).toEqual([
      { user_id: "u-a", tournament_id: 10, points: 6 },
      { user_id: "u-a", tournament_id: 20, points: 3 },
      { user_id: "u-b", tournament_id: 10, points: 3 },
    ]);
    expect([1, 2, 3].map((id) => matchById(id)?.is_scored)).toEqual([true, true, true]);
  });

  it("H4: with no unscored finished matches returns {0,0,0} and writes nothing", async () => {
    fake.seed({
      matches: [
        { ...finishedMatch(1, 10, "HOME_WIN"), is_scored: true },
        { ...finishedMatch(2, 10, "DRAW"), result: null },
        {
          ...finishedMatch(3, 10, "DRAW"),
          status: "SCHEDULED",
          result: null,
          match_datetime: "2999-01-01T20:00:00.000Z",
        },
      ],
      bets: [bet(1, 1, "u-a", "HOME_WIN"), bet(2, 2, "u-a", "DRAW")],
      scores: [{ user_id: "u-a", tournament_id: 10, points: 3 }],
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.results.scoring).toEqual({ processed_matches: 0, updated_scores: 0, errors: 0 });
    expect(fake.requests.filter((r) => r.method !== "GET")).toEqual([]);
    expect(scoreRows()).toEqual([{ user_id: "u-a", tournament_id: 10, points: 3 }]);
  });

  it("H5: a failing scoring query yields scoring {0,0,1} yet HTTP 200 and success: true", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN")],
      bets: [bet(1, 1, "u-a", "HOME_WIN")],
      scores: [],
    });
    fake.failOn(isScoringMatchesQuery, 500, { code: "XX000", message: "scoring query failed" });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results.scoring).toEqual({ processed_matches: 0, updated_scores: 0, errors: 1 });
    expect(fake.requests.some((r) => r.table === "bets" || r.table === "scores")).toBe(false);
    expect(matchById(1)?.is_scored).toBe(false);
  });

  it("H5b: a failing live query yields HTTP 500, success: false and no scoring requests", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN")],
      bets: [bet(1, 1, "u-a", "HOME_WIN")],
      scores: [],
    });
    fake.failOn(isLiveMatchesQuery, 500, { code: "XX000", message: "live query failed" });

    const { status, body } = await invoke();

    expect(status).toBe(500);
    expect(body).toEqual({ success: false, error: "Failed to query matches for live update" });
    expect(fake.requests.filter(isScoringMatchesQuery)).toEqual([]);
    expect(fake.requests.some((r) => r.table === "bets" || r.table === "scores")).toBe(false);
  });

  it("H6: a failing bets query for one match leaves that match unscored and still scores the other", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN"), finishedMatch(2, 10, "AWAY_WIN")],
      bets: [bet(1, 1, "u-a", "HOME_WIN"), bet(2, 2, "u-a", "AWAY_WIN")],
      scores: [],
    });
    fake.failOn((req) => req.method === "GET" && req.table === "bets" && req.params.get("match_id") === "eq.1", 500, {
      code: "XX000",
      message: "bets query failed",
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.results.scoring).toEqual({ processed_matches: 1, updated_scores: 1, errors: 1 });
    expect(matchById(1)?.is_scored).toBe(false);
    expect(matchById(2)?.is_scored).toBe(true);
    expect(scoreRows()).toEqual([{ user_id: "u-a", tournament_id: 10, points: 3 }]);
  });

  it("H7 known bug (C2): when marking the match fails, points are saved but the match stays unscored, so the next run awards them again (3 → 6) — fix: option #2 atomic scoring unit", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "HOME_WIN")],
      bets: [bet(1, 1, "u-a", "HOME_WIN")],
      scores: [],
    });
    fake.failOn((req) => req.method === "PATCH" && req.table === "matches", 500, {
      code: "XX000",
      message: "mark scored failed",
    });

    const first = await invoke();

    expect(first.status).toBe(200);
    expect(first.body.results.scoring).toEqual({ processed_matches: 0, updated_scores: 1, errors: 1 });
    expect(scoreRows()).toEqual([{ user_id: "u-a", tournament_id: 10, points: 3 }]);
    expect(matchById(1)?.is_scored).toBe(false);

    const second = await invoke();

    expect(second.body.results.scoring).toEqual({ processed_matches: 0, updated_scores: 1, errors: 1 });
    // Double award: the same correct pick is counted twice.
    expect(scoreRows()).toEqual([{ user_id: "u-a", tournament_id: 10, points: 6 }]);
    expect(matchById(1)?.is_scored).toBe(false);
  });

  it("H8 known bug (C3): when one user's score UPSERT fails, the match is still marked scored and that user's points are lost for good — fix: option #2 atomic scoring unit", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "DRAW")],
      bets: [bet(1, 1, "u-fail", "DRAW"), bet(2, 1, "u-ok", "DRAW")],
      scores: [],
    });
    fake.failOn(
      (req) => req.method === "POST" && req.table === "scores" && (req.body as Row).user_id === "u-fail",
      500,
      { code: "XX000", message: "upsert failed" }
    );

    const { status, body } = await invoke();

    expect(status).toBe(200);
    expect(body.results.scoring).toEqual({ processed_matches: 1, updated_scores: 1, errors: 1 });
    expect(scoreRows()).toEqual([{ user_id: "u-ok", tournament_id: 10, points: 3 }]);
    // Lost award: the match will never be re-scored for u-fail.
    expect(matchById(1)?.is_scored).toBe(true);
  });

  it("H9 known bug (C2/P5): when reading the existing score fails with 500, the UPSERT overwrites the total 9 with 3 — fix: option #2 atomic scoring unit", async () => {
    fake.seed({
      matches: [finishedMatch(1, 10, "AWAY_WIN")],
      bets: [bet(1, 1, "u-a", "AWAY_WIN")],
      scores: [{ user_id: "u-a", tournament_id: 10, points: 9 }],
    });
    fake.failOn((req) => req.method === "GET" && req.table === "scores", 500, {
      code: "XX000",
      message: "score read failed",
    });

    const { status, body } = await invoke();

    expect(status).toBe(200);
    // The read error is ignored and reported as success.
    expect(body.results.scoring).toEqual({ processed_matches: 1, updated_scores: 1, errors: 0 });
    // Overwritten total: 9 accumulated points replaced by a single award.
    expect(scoreRows()).toEqual([{ user_id: "u-a", tournament_id: 10, points: 3 }]);
    expect(matchById(1)?.is_scored).toBe(true);
  });
});
