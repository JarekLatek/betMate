/**
 * Stateful PostgREST fake at the `fetch` boundary.
 *
 * Install with `vi.stubGlobal("fetch", fake.fetch)` so that a real
 * `@supabase/supabase-js` client talks to in-memory tables. Emulates only the
 * PostgREST surface the `sync-matches` Edge Function uses: filters `eq.`,
 * `not.is.null`, `lte.`, `or=(…,and(…))`, UPSERT with `on_conflict`, PATCH
 * with filters and `.single()` (406 `PGRST116` on 0 rows).
 *
 * Deliberate limits: no RLS, constraints, triggers, transactions or
 * concurrency. Green tests on this fake do not prove behaviour against a real
 * database — that belongs to an integration layer with a local schema.
 */

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

export interface FakeRequest {
  method: string;
  url: URL;
  table: string;
  params: URLSearchParams;
  headers: Headers;
  body: unknown;
}

export type RequestPredicate = (req: FakeRequest) => boolean;
export type ExternalHandler = (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;

interface FailRule {
  predicate: RequestPredicate;
  status: number;
  body: unknown;
}

const SINGLE_OBJECT_MIME = "application/vnd.pgrst.object+json";
const RESERVED_PARAMS = new Set(["select", "on_conflict", "columns", "order", "limit", "offset", "or"]);

export interface PostgrestFakeOptions {
  /** Base URL of the Supabase project, e.g. `http://supabase.test`. */
  supabaseUrl: string;
}

export function createPostgrestFake({ supabaseUrl }: PostgrestFakeOptions) {
  const origin = new URL(supabaseUrl).origin;
  const tables: Tables = {};
  const requests: FakeRequest[] = [];
  let failRules: FailRule[] = [];
  let external: ExternalHandler = (url) => {
    throw new Error(`Unexpected external request: ${url.toString()}`);
  };

  function seed(initial: Tables) {
    for (const key of Object.keys(tables)) Reflect.deleteProperty(tables, key);
    for (const [name, rows] of Object.entries(initial)) {
      tables[name] = rows.map((row) => ({ ...row }));
    }
  }

  function reset() {
    seed({});
    requests.length = 0;
    failRules = [];
    external = (url) => {
      throw new Error(`Unexpected external request: ${url.toString()}`);
    };
  }

  function failOn(predicate: RequestPredicate, status: number, body: unknown) {
    failRules.push({ predicate, status, body });
  }

  function onExternal(handler: ExternalHandler) {
    external = handler;
  }

  async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    if (url.origin !== origin) {
      return external(url, init);
    }

    const prefix = "/rest/v1/";
    if (!url.pathname.startsWith(prefix)) {
      throw new Error(`Unsupported Supabase path: ${url.pathname}`);
    }

    const req: FakeRequest = {
      method: (init?.method ?? "GET").toUpperCase(),
      url,
      table: decodeURIComponent(url.pathname.slice(prefix.length)),
      params: url.searchParams,
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    requests.push(req);

    const rule = failRules.find((r) => r.predicate(req));
    if (rule) {
      return json(rule.status, rule.body);
    }

    return handle(req);
  }

  function handle(req: FakeRequest): Response {
    const rows = (tables[req.table] ??= []);
    const single = req.headers.get("Accept") === SINGLE_OBJECT_MIME;

    switch (req.method) {
      case "GET": {
        let result = rows.filter((row) => matchesFilters(row, req.params));
        result = applyOrderAndLimit(result, req.params);
        return respondRows(
          result.map((row) => project(row, req.params.get("select"))),
          single
        );
      }
      case "POST": {
        const values = (Array.isArray(req.body) ? req.body : [req.body]) as Row[];
        const conflict = req.params.get("on_conflict")?.split(",");
        const written = values.map((value) => upsertRow(rows, value, conflict));
        if (!req.params.has("select")) return new Response(null, { status: 201 });
        return respondRows(
          written.map((row) => project(row, req.params.get("select"))),
          single
        );
      }
      case "PATCH": {
        const patch = req.body as Row;
        const targets = rows.filter((row) => matchesFilters(row, req.params));
        for (const row of targets) Object.assign(row, patch);
        if (!req.params.has("select")) return new Response(null, { status: 204 });
        return respondRows(
          targets.map((row) => project(row, req.params.get("select"))),
          single
        );
      }
      default:
        throw new Error(`Unsupported method in PostgREST fake: ${req.method}`);
    }
  }

  return { fetch, seed, reset, tables, requests, failOn, onExternal };
}

export type PostgrestFake = ReturnType<typeof createPostgrestFake>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function respondRows(rows: Row[], single: boolean): Response {
  if (!single) return json(200, rows);
  if (rows.length !== 1) {
    return json(406, {
      code: "PGRST116",
      details: `The result contains ${rows.length} rows`,
      hint: null,
      message: "JSON object requested, multiple (or no) rows returned",
    });
  }
  return json(200, rows[0]);
}

function upsertRow(rows: Row[], value: Row, conflict: string[] | undefined): Row {
  const existing = conflict ? rows.find((row) => conflict.every((col) => row[col] === value[col])) : undefined;
  if (existing) {
    Object.assign(existing, value);
    return existing;
  }
  const row = { ...value };
  rows.push(row);
  return row;
}

function project(row: Row, select: string | null): Row {
  if (!select || select === "*") return { ...row };
  const out: Row = {};
  for (const col of select.split(",").map((c) => c.trim())) out[col] = row[col];
  return out;
}

function applyOrderAndLimit(rows: Row[], params: URLSearchParams): Row[] {
  let result = [...rows];
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    const sign = dir === "desc" ? -1 : 1;
    result.sort((a, b) => compare(a[col], b[col]) * sign);
  }
  const limit = params.get("limit");
  if (limit) result = result.slice(0, Number(limit));
  return result;
}

function matchesFilters(row: Row, params: URLSearchParams): boolean {
  for (const [key, value] of params) {
    if (RESERVED_PARAMS.has(key)) continue;
    if (!evalCondition(row, key, value)) return false;
  }
  const or = params.get("or");
  if (or !== null && !evalLogical(row, "or", stripParens(or))) return false;
  return true;
}

/** Evaluates `op.value` for a column, e.g. `eq.FINISHED`, `not.is.null`, `lte.2026-01-01`. */
function evalCondition(row: Row, column: string, expr: string): boolean {
  if (expr.startsWith("not.")) return !evalCondition(row, column, expr.slice(4));
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1);
  const actual = row[column];

  switch (op) {
    case "eq":
      return String(actual) === raw;
    case "neq":
      return String(actual) !== raw;
    case "is":
      if (raw === "null") return actual === null || actual === undefined;
      if (raw === "true") return actual === true;
      if (raw === "false") return actual === false;
      throw new Error(`Unsupported is.${raw}`);
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const cmp = compare(actual, raw);
      if (op === "lt") return cmp < 0;
      if (op === "lte") return cmp <= 0;
      if (op === "gt") return cmp > 0;
      return cmp >= 0;
    }
    default:
      throw new Error(`Unsupported filter operator in PostgREST fake: ${op}`);
  }
}

/** Evaluates a comma-separated list of conditions joined by `or`/`and`. */
function evalLogical(row: Row, kind: "or" | "and", inner: string): boolean {
  const results = splitTopLevel(inner).map((part) => {
    for (const nested of ["and", "or"] as const) {
      if (part.startsWith(`${nested}(`)) return evalLogical(row, nested, stripParens(part.slice(nested.length)));
    }
    const dot = part.indexOf(".");
    return evalCondition(row, part.slice(0, dot), part.slice(dot + 1));
  });
  return kind === "or" ? results.some(Boolean) : results.every(Boolean);
}

function stripParens(value: string): string {
  if (!value.startsWith("(") || !value.endsWith(")")) {
    throw new Error(`Expected parenthesised logical expression: ${value}`);
  }
  return value.slice(1, -1);
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === "number") return a - Number(b);
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}
