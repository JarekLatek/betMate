# API Endpoint Implementation Plan: POST /api/bets

## 1. Przegląd punktu końcowego

Endpoint `POST /api/bets` umożliwia uwierzytelnionym użytkownikom tworzenie nowego zakładu (prognozy) na wynik określonego meczu. Endpoint implementuje kluczowe zasady biznesowe:

- Użytkownik może postawić tylko jeden zakład na dany mecz (constraint unikalności)
- Zakład można postawić tylko na mecze ze statusem `SCHEDULED`
- Zakład musi być złożony minimum 5 minut przed rozpoczęciem meczu
- Automatyczna weryfikacja przez RLS policies w Supabase

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/bets`
- **Nagłówki:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (automatycznie obsługiwany przez Supabase auth)

### Parametry:

#### Wymagane (Request Body):

```typescript
{
  match_id: number; // ID istniejącego meczu
  picked_result: string; // Jeden z: "HOME_WIN", "DRAW", "AWAY_WIN"
}
```

#### Opcjonalne:

Brak opcjonalnych parametrów

### Request Body Schema:

```typescript
CreateBetCommand = {
  match_id: number;
  picked_result: "HOME_WIN" | "DRAW" | "AWAY_WIN";
}
```

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects):

```typescript
// Request DTO
import type { CreateBetCommand } from "@/types";

// Response DTO
import type { BetEntity, ApiResponse } from "@/types";

// Response type
type CreateBetResponse = ApiResponse<BetEntity>;
```

### Command Models:

```typescript
// Z src/types.ts (już zdefiniowany)
export type CreateBetCommand = Pick<TablesInsert<"bets">, "match_id" | "picked_result">;
```

### Validation Schema (Zod):

```typescript
import { z } from "zod";
import { Constants } from "@/db/database.types";

const createBetSchema = z.object({
  match_id: z.number().int().positive({
    message: "match_id must be a positive integer",
  }),
  picked_result: z.enum(Constants.public.Enums.match_outcome, {
    errorMap: () => ({
      message: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
    }),
  }),
});
```

## 4. Szczegóły odpowiedzi

### Success Response (201 Created):

```json
{
  "data": {
    "id": 501,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "HOME_WIN",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": null
  }
}
```

**Headers:**

- `Location: /api/bets/501`
- `Content-Type: application/json`

### Error Responses:

#### 400 Bad Request - Invalid Input:

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["picked_result"],
      "message": "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN"
    }
  ]
}
```

#### 401 Unauthorized - Not Authenticated:

```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden - Time Lock or Status Violation:

```json
{
  "error": "Cannot bet on this match",
  "reason": "Match starts in less than 5 minutes"
}
```

Lub:

```json
{
  "error": "Cannot bet on this match",
  "reason": "Match status must be SCHEDULED"
}
```

#### 404 Not Found - Match Does Not Exist:

```json
{
  "error": "Match not found"
}
```

#### 409 Conflict - Duplicate Bet:

```json
{
  "error": "Bet already exists for this match"
}
```

#### 500 Internal Server Error:

```json
{
  "error": "Failed to create bet"
}
```

## 5. Przepływ danych

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/bets
       │ { match_id, picked_result }
       ▼
┌──────────────────────┐
│  Astro API Route     │
│  (POST handler)      │
└──────┬───────────────┘
       │
       │ 1. Parse & validate request body (Zod)
       ▼
┌──────────────────────┐
│  Authentication      │
│  Check               │
└──────┬───────────────┘
       │
       │ 2. Get user from context.locals.supabase.auth.getUser()
       │    ├─ If no user → 401 Unauthorized
       │    └─ If user exists → continue
       ▼
┌──────────────────────┐
│  BetService          │
│  createBet()         │
└──────┬───────────────┘
       │
       │ 3. Validate match exists and rules via RLS
       │    (Supabase automatically enforces:
       │     - match_datetime > now() + 5 minutes
       │     - match.status = 'SCHEDULED'
       │     - unique (user_id, match_id))
       ▼
┌──────────────────────┐
│  Supabase Database   │
│  INSERT into bets    │
└──────┬───────────────┘
       │
       │ 4a. Success → Return bet entity
       │ 4b. Duplicate → PostgresError 23505 (unique violation)
       │ 4c. RLS Policy fails → PostgresError (no row returned)
       ▼
┌──────────────────────┐
│  Error Handler       │
└──────┬───────────────┘
       │
       │ 5. Map errors to HTTP codes:
       │    ├─ 23505 → 409 Conflict
       │    ├─ 23503 → 404 Not Found (FK violation)
       │    ├─ RLS fail → 403 Forbidden
       │    └─ Other → 500 Internal Server Error
       ▼
┌──────────────────────┐
│  Response            │
│  201 + Location      │
└──────────────────────┘
```

### Interakcje z bazą danych:

1. **INSERT do tabeli `bets`:**

   ```sql
   INSERT INTO bets (user_id, match_id, picked_result)
   VALUES ($1, $2, $3)
   RETURNING *;
   ```

2. **RLS Policy (`bets_insert_own`) automatycznie weryfikuje:**

   ```sql
   WITH CHECK (
     auth.uid() = user_id
     AND EXISTS (
       SELECT 1 FROM matches
       WHERE matches.id = match_id
       AND matches.match_datetime > (now() + interval '5 minutes')
       AND matches.status = 'SCHEDULED'
     )
   )
   ```

3. **Unique constraint (`bets_user_id_match_id_key`) zapobiega duplikatom:**
   ```sql
   UNIQUE (user_id, match_id)
   ```

## 6. Względy bezpieczeństwa

### Authentication:

- **Method:** JWT token via Supabase Auth
- **Implementation:**
  ```typescript
  const {
    data: { user },
    error,
  } = await context.locals.supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  ```

### Authorization:

- **RLS Policies:** Supabase automatycznie wymusza zasady:
  - Użytkownik może tworzyć zakłady tylko dla siebie (`auth.uid() = user_id`)
  - Zakład tylko na istniejące mecze ze statusem `SCHEDULED`
  - Zakład tylko na mecze rozpoczynające się za >5 minut

### Input Validation:

1. **Schema Validation (Zod):**
   - `match_id`: positive integer
   - `picked_result`: enum z dozwolonych wartości

2. **SQL Injection Protection:**
   - Używamy Supabase client (parametryzowane zapytania)
   - Nigdy nie konkatenujemy SQL strings

3. **Type Safety:**
   - TypeScript strict mode
   - Walidacja runtime przez Zod
   - Database types generowane z Supabase

### Rate Limiting:

- **Rekomendacja:** Implement na poziomie Supabase lub middleware
- **Przykład:** Max 10 POST /api/bets per user per minute

### CORS:

- Endpoint tylko dla same-origin requests
- Jeśli potrzeba CORS: whitelist tylko trusted domains

## 7. Obsługa błędów

### Hierarchia error handling:

```typescript
// 1. Validation errors (Zod)
try {
  createBetSchema.parse(body);
} catch (error) {
  return 400 Bad Request with details
}

// 2. Authentication errors
if (!user) {
  return 401 Unauthorized
}

// 3. Business logic errors (z service)
try {
  const bet = await betService.createBet(...)
} catch (error) {
  // Map specific errors
}

// 4. Database errors (Supabase)
if (error.code === '23505') {
  return 409 Conflict (duplicate)
}
if (error.code === '23503') {
  return 404 Not Found (FK violation)
}
if (error.message.includes('policy')) {
  return 403 Forbidden (RLS policy fail)
}

// 5. Unknown errors
return 500 Internal Server Error
```

### Szczegółowe scenariusze błędów:

| Scenariusz                | HTTP Code | Response                       | Cause                    |
| ------------------------- | --------- | ------------------------------ | ------------------------ |
| Missing required field    | 400       | Invalid request body + details | Zod validation fail      |
| Invalid enum value        | 400       | Invalid request body + details | Zod validation fail      |
| Invalid data type         | 400       | Invalid request body + details | Zod validation fail      |
| Not authenticated         | 401       | Authentication required        | No valid JWT token       |
| Match doesn't exist       | 404       | Match not found                | FK violation (23503)     |
| Match status != SCHEDULED | 403       | Cannot bet + reason            | RLS policy fail          |
| Match starts <5 min       | 403       | Cannot bet + reason            | RLS policy fail          |
| Duplicate bet             | 409       | Bet already exists             | Unique violation (23505) |
| Database connection fail  | 500       | Failed to create bet           | Network/DB issue         |
| Unknown error             | 500       | Failed to create bet           | Unexpected error         |

### Error logging:

- **Console.error** dla development
- **Sentry/LogRocket** dla production (rekomendacja)
- Log structure:
  ```typescript
  console.error("[POST /api/bets]", {
    error: error.message,
    code: error.code,
    user_id: user.id,
    match_id: body.match_id,
    timestamp: new Date().toISOString(),
  });
  ```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Database Round Trips:**
   - RLS policy wykonuje dodatkowe SELECT na `matches` table
   - **Mitigacja:** Index na `matches.status` i `matches.match_datetime`

2. **Authentication Check:**
   - JWT verification na każde żądanie
   - **Mitigacja:** Supabase automatycznie cache JWT

3. **Concurrent Requests:**
   - Race condition przy duplicate bets
   - **Mitigacja:** Unique constraint na poziomie DB (atomic)

### Optymalizacje:

1. **Database Indexes** (już istniejące w schema):

   ```sql
   -- Indexes na bets
   CREATE UNIQUE INDEX bets_user_id_match_id_key ON bets (user_id, match_id);
   CREATE INDEX idx_bets_match_id ON bets (match_id);
   CREATE INDEX idx_bets_user_id ON bets (user_id);

   -- Indexes na matches (dla RLS policy)
   CREATE INDEX idx_matches_status ON matches (status);
   CREATE INDEX idx_matches_datetime ON matches (match_datetime);
   ```

2. **Response Size:**
   - Zwracamy tylko niezbędne pola (BetEntity)
   - Brak eager loading niepotrzebnych relacji

3. **Connection Pooling:**
   - Supabase automatycznie zarządza connection pool

### Performance Monitoring:

- **Metryki do śledzenia:**
  - Response time (target: <200ms p95)
  - Error rate (target: <1%)
  - Database query time
  - RLS policy evaluation time

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury katalogów

```bash
mkdir -p src/pages/api
mkdir -p src/lib/services
```

### Krok 2: Implementacja BetService

**File:** `src/lib/services/bet.service.ts`

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { CreateBetCommand, BetEntity } from "@/types";

export class BetService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createBet(userId: string, command: CreateBetCommand): Promise<BetEntity> {
    const { data, error } = await this.supabase
      .from("bets")
      .insert({
        user_id: userId,
        match_id: command.match_id,
        picked_result: command.picked_result,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
```

### Krok 3: Implementacja validation schema

**File:** `src/lib/validation/bet.validation.ts`

```typescript
import { z } from "zod";
import { Constants } from "@/db/database.types";

export const createBetSchema = z.object({
  match_id: z.number().int().positive({
    message: "match_id must be a positive integer",
  }),
  picked_result: z.enum(Constants.public.Enums.match_outcome, {
    errorMap: () => ({
      message: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
    }),
  }),
});

export type CreateBetInput = z.infer<typeof createBetSchema>;
```

### Krok 4: Implementacja error mapping utility

**File:** `src/lib/utils/error-mapper.ts`

```typescript
import type { PostgrestError } from "@supabase/supabase-js";

export interface ApiError {
  status: number;
  error: string;
  reason?: string;
}

export function mapDatabaseError(error: PostgrestError): ApiError {
  // Unique constraint violation (duplicate bet)
  if (error.code === "23505") {
    return {
      status: 409,
      error: "Bet already exists for this match",
    };
  }

  // Foreign key violation (match not found)
  if (error.code === "23503") {
    return {
      status: 404,
      error: "Match not found",
    };
  }

  // RLS policy violation
  if (error.message.includes("policy") || error.message.includes("row-level security")) {
    // Próbujemy określić konkretny powód
    if (error.message.includes("5 minutes")) {
      return {
        status: 403,
        error: "Cannot bet on this match",
        reason: "Match starts in less than 5 minutes",
      };
    }
    return {
      status: 403,
      error: "Cannot bet on this match",
      reason: "Match status must be SCHEDULED",
    };
  }

  // Default error
  return {
    status: 500,
    error: "Failed to create bet",
  };
}
```

### Krok 5: Implementacja API route

**File:** `src/pages/api/bets.ts`

```typescript
import type { APIRoute } from "astro";
import { BetService } from "@/lib/services/bet.service";
import { createBetSchema } from "@/lib/validation/bet.validation";
import { mapDatabaseError } from "@/lib/utils/error-mapper";
import type { ApiResponse, BetEntity, ApiErrorResponse } from "@/types";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // 1. Authentication check
  const {
    data: { user },
    error: authError,
  } = await context.locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
      } satisfies ApiErrorResponse),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON in request body",
      } satisfies ApiErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const validationResult = createBetSchema.safeParse(body);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: validationResult.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      } satisfies ApiErrorResponse),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Create bet via service
  const betService = new BetService(context.locals.supabase);

  try {
    const bet = await betService.createBet(user.id, validationResult.data);

    // 4. Return success response with Location header
    return new Response(
      JSON.stringify({
        data: bet,
      } satisfies ApiResponse<BetEntity>),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          Location: `/api/bets/${bet.id}`,
        },
      }
    );
  } catch (error) {
    // 5. Handle database errors
    console.error("[POST /api/bets]", {
      error,
      user_id: user.id,
      match_id: validationResult.data.match_id,
      timestamp: new Date().toISOString(),
    });

    const apiError = mapDatabaseError(error as any);

    return new Response(
      JSON.stringify({
        error: apiError.error,
        ...(apiError.reason && { reason: apiError.reason }),
      } satisfies ApiErrorResponse),
      {
        status: apiError.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Krok 6: Instalacja zależności

```bash
npm install zod
```

### Krok 7: Testowanie endpoint

**Test Cases:**

1. **Success Case (201):**

   ```bash
   curl -X POST http://localhost:3000/api/bets \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
   ```

2. **Validation Error (400):**

   ```bash
   curl -X POST http://localhost:3000/api/bets \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"match_id": 101, "picked_result": "INVALID"}'
   ```

3. **Unauthorized (401):**

   ```bash
   curl -X POST http://localhost:3000/api/bets \
     -H "Content-Type: application/json" \
     -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
   ```

4. **Duplicate Bet (409):**
   ```bash
   # Call twice with same match_id
   curl -X POST http://localhost:3000/api/bets \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"match_id": 101, "picked_result": "HOME_WIN"}'
   ```

### Krok 8: Dokumentacja

1. Dodać endpoint do API documentation
2. Dodać przykłady użycia w README.md
3. Dodać TypeScript types do exports w `src/types.ts` (jeśli potrzeba)

### Krok 9: Code Review Checklist

- [ ] TypeScript strict mode compliance
- [ ] Zod validation schema kompletna
- [ ] Error handling covers all scenarios
- [ ] Authentication properly implemented
- [ ] RLS policies verified in database
- [ ] Location header zawiera poprawny URL
- [ ] Response types match specification
- [ ] Console.error logging implemented
- [ ] Code follows Astro patterns (early returns, no else)
- [ ] Service layer properly abstracts DB logic
- [ ] All required imports use `@/` alias

### Krok 10: Deployment

1. Verify environment variables (SUPABASE_URL, SUPABASE_KEY)
2. Run `npm run build` to check for build errors
3. Deploy to production
4. Monitor error logs for first 24h
5. Check response times and error rates

## 10. Dodatkowe uwagi

### Monitoring & Observability:

1. **Key Metrics:**
   - POST /api/bets success rate
   - P50, P95, P99 response times
   - Error breakdown by type (400, 401, 403, 409, 500)

2. **Alerts:**
   - Error rate >5% for 5 minutes
   - P95 response time >500ms
   - Database connection failures

### Future Enhancements:

1. **Rate Limiting:**
   - Implement per-user rate limiting
   - Consider match-specific limits (burst protection)

2. **Caching:**
   - Cache match validity checks (with short TTL)
   - Invalidate cache on match status changes

3. **Webhooks:**
   - Notify user after successful bet creation
   - Send reminder before betting closes

4. **Analytics:**
   - Track most popular picks per match
   - Betting patterns analysis

### Maintenance:

1. **Database Indexes Review:**
   - Monitor index usage
   - Add composite indexes if needed

2. **RLS Policy Performance:**
   - Profile policy execution time
   - Optimize if >50ms

3. **Error Message Improvements:**
   - A/B test error message clarity
   - Multilingual support
