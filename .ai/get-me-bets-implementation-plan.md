# API Endpoint Implementation Plan: GET /api/me/bets

## 1. Przegląd punktu końcowego

Endpoint `GET /api/me/bets` umożliwia uwierzytelnionym użytkownikom pobieranie listy wszystkich swoich zakładów (prognoz) wraz z informacjami o meczach, na które zostały postawione. Endpoint:

- Zwraca tylko zakłady należące do zalogowanego użytkownika (zabezpieczone przez RLS)
- Obsługuje opcjonalne filtrowanie po turnieju lub konkretnym meczu
- Implementuje paginację z konfigurowalnymi limitami
- Zawiera szczegółowe informacje o meczach dla każdego zakładu
- Automatyczna weryfikacja dostępu przez Supabase RLS policies

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/me/bets`
- **Uwierzytelnianie:** Wymagane (Bearer token w cookies/headers)

### Parametry:

#### Query Parameters:

- `tournament_id` (opcjonalny):
  - **Typ:** number (integer)
  - **Opis:** Filtruje zakłady tylko dla konkretnego turnieju
  - **Walidacja:** Musi być dodatnią liczbą całkowitą
  - **Przykład:** `?tournament_id=1`

- `match_id` (opcjonalny):
  - **Typ:** number (integer)
  - **Opis:** Pobiera zakład dla konkretnego meczu
  - **Walidacja:** Musi być dodatnią liczbą całkowitą
  - **Przykład:** `?match_id=101`

- `limit` (opcjonalny):
  - **Typ:** number (integer)
  - **Opis:** Liczba wyników na stronę
  - **Default:** 50
  - **Minimum:** 1
  - **Maximum:** 100
  - **Przykład:** `?limit=20`

- `offset` (opcjonalny):
  - **Typ:** number (integer)
  - **Opis:** Liczba rekordów do pominięcia (paginacja)
  - **Default:** 0
  - **Minimum:** 0
  - **Przykład:** `?offset=50`

#### Przykładowe żądania:

```bash
# Wszystkie zakłady użytkownika (pierwsza strona)
GET /api/me/bets

# Zakłady dla konkretnego turnieju
GET /api/me/bets?tournament_id=1

# Zakład dla konkretnego meczu
GET /api/me/bets?match_id=101

# Z paginacją
GET /api/me/bets?limit=20&offset=40

# Kombinacja filtrów
GET /api/me/bets?tournament_id=1&limit=30&offset=0
```

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects):

```typescript
// Query Parameters (już zdefiniowany w types.ts)
import type { BetsQueryParams } from "@/types";

// Response DTOs (już zdefiniowane w types.ts)
import type { BetWithMatchDTO, PaginatedResponseDTO, MatchSummaryDTO } from "@/types";

// Response type
type GetUserBetsResponse = PaginatedResponseDTO<BetWithMatchDTO>;
```

### Istniejące typy z src/types.ts:

```typescript
// Query Parameters Interface
export interface BetsQueryParams {
  tournament_id?: number;
  match_id?: number;
  limit?: number;
  offset?: number;
}

// Bet with Match DTO
export type BetWithMatchDTO = BetEntity & {
  match: MatchSummaryDTO;
};

// Match Summary embedded in bets
export type MatchSummaryDTO = Pick<
  MatchEntity,
  "id" | "tournament_id" | "home_team" | "away_team" | "match_datetime" | "status" | "result"
>;

// Paginated Response
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}

export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}
```

### Validation Schema (Zod):

```typescript
import { z } from "zod";

const getUserBetsQuerySchema = z.object({
  tournament_id: z.coerce
    .number()
    .int()
    .positive({
      message: "tournament_id must be a positive integer",
    })
    .optional(),

  match_id: z.coerce
    .number()
    .int()
    .positive({
      message: "match_id must be a positive integer",
    })
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "limit must be at least 1" })
    .max(100, { message: "limit cannot exceed 100" })
    .default(50),

  offset: z.coerce.number().int().min(0, { message: "offset must be non-negative" }).default(0),
});
```

## 4. Szczegóły odpowiedzi

### Success Response (200 OK):

```json
{
  "data": [
    {
      "id": 501,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "match_id": 101,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null,
      "match": {
        "id": 101,
        "tournament_id": 1,
        "home_team": "Real Madrid",
        "away_team": "Barcelona",
        "match_datetime": "2025-11-15T20:00:00Z",
        "status": "SCHEDULED",
        "result": null
      }
    },
    {
      "id": 502,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "match_id": 102,
      "picked_result": "DRAW",
      "created_at": "2025-11-11T10:15:00Z",
      "updated_at": "2025-11-11T12:00:00Z",
      "match": {
        "id": 102,
        "tournament_id": 1,
        "home_team": "Manchester United",
        "away_team": "Liverpool",
        "match_datetime": "2025-11-16T15:00:00Z",
        "status": "SCHEDULED",
        "result": null
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

### Error Responses:

#### 401 Unauthorized:

```json
{
  "error": "Authentication required"
}
```

**Kiedy:** Użytkownik nie jest uwierzytelniony (brak tokenu lub nieprawidłowy token)

#### 400 Bad Request:

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "limit cannot exceed 100"
    }
  ]
}
```

**Kiedy:** Nieprawidłowe parametry zapytania (np. limit > 100, ujemny offset)

#### 500 Internal Server Error:

```json
{
  "error": "Internal server error"
}
```

**Kiedy:** Nieoczekiwany błąd serwera lub bazy danych

## 5. Przepływ danych

### 1. Request Flow:

```
Client Request
    ↓
Astro Middleware (auth check via context.locals.supabase)
    ↓
API Route Handler (/api/me/bets/index.ts)
    ↓
Query Parameters Validation (Zod)
    ↓
BetsService.getUserBets()
    ↓
Supabase Query (z RLS enforcement)
    ↓
Data Transform (BetEntity[] → BetWithMatchDTO[])
    ↓
Paginated Response
    ↓
Client Response (200 OK)
```

### 2. Database Query Strategy:

#### Zapytanie Supabase:

```typescript
// W BetsService.getUserBets()
const query = supabase
  .from("bets")
  .select(
    `
    id,
    user_id,
    match_id,
    picked_result,
    created_at,
    updated_at,
    match:matches (
      id,
      tournament_id,
      home_team,
      away_team,
      match_datetime,
      status,
      result
    )
  `
  )
  .eq("user_id", userId) // Dodatkowe zabezpieczenie (RLS też to sprawdza)
  .order("created_at", { ascending: false }); // Najnowsze zakłady najpierw

// Opcjonalne filtry
if (tournament_id) {
  query = query.eq("match.tournament_id", tournament_id);
}

if (match_id) {
  query = query.eq("match_id", match_id);
}

// Paginacja
const { data, error, count } = await query.range(offset, offset + limit - 1).limit(limit);
```

#### Uwagi dotyczące zapytania:

1. **Relacja z matches:** Używamy Supabase nested select do pobrania danych meczu w jednym zapytaniu
2. **RLS Enforcement:** Policy `bets_select_own` automatycznie filtruje zakłady użytkownika
3. **Sortowanie:** Domyślnie po `created_at DESC` (najnowsze najpierw)
4. **Counting:** Używamy `.limit()` z `count: 'exact'` do obliczenia `has_more`

### 3. Service Layer Logic:

```typescript
// src/lib/services/bets.service.ts

export class BetsService {
  async getUserBets(
    supabase: SupabaseClient,
    userId: string,
    params: BetsQueryParams
  ): Promise<PaginatedResponseDTO<BetWithMatchDTO>> {
    // 1. Extract and validate parameters
    const { tournament_id, match_id, limit = 50, offset = 0 } = params;

    // 2. Build query with filters
    let query = supabase
      .from("bets")
      .select(
        `
        id,
        user_id,
        match_id,
        picked_result,
        created_at,
        updated_at,
        match:matches!inner (
          id,
          tournament_id,
          home_team,
          away_team,
          match_datetime,
          status,
          result
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // 3. Apply optional filters
    if (tournament_id !== undefined) {
      query = query.eq("match.tournament_id", tournament_id);
    }

    if (match_id !== undefined) {
      query = query.eq("match_id", match_id);
    }

    // 4. Apply pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    // 5. Handle errors
    if (error) {
      console.error("Error fetching user bets:", error);
      throw new Error("Failed to fetch bets");
    }

    // 6. Transform data
    const total = count ?? 0;
    const has_more = offset + limit < total;

    // 7. Return paginated response
    return {
      data: data as BetWithMatchDTO[],
      pagination: {
        total,
        limit,
        offset,
        has_more,
      },
    };
  }
}
```

## 6. Względy bezpieczeństwa

### 1. Uwierzytelnianie:

- **Mechanizm:** Supabase Auth via middleware
- **Sprawdzenie:** `context.locals.supabase.auth.getUser()`
- **Jeśli niepowodzenie:** Zwróć 401 Unauthorized
- **Token:** Automatycznie obsługiwany przez Supabase client (cookies/headers)

### 2. Autoryzacja (RLS Policies):

```sql
-- Policy już wdrożona w bazie danych
CREATE POLICY "bets_select_own" ON bets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Znaczenie:**

- Użytkownik może odczytać **tylko swoje** zakłady
- Policy jest wymuszana na poziomie bazy danych
- Nawet jeśli API spróbuje pobrać cudze zakłady, RLS je odfiltruje
- Dodatkowy `.eq("user_id", userId)` w query jest dla czytelności

### 3. Walidacja wejścia:

```typescript
// Wszystkie query params są walidowane przez Zod
const validated = getUserBetsQuerySchema.safeParse({
  tournament_id: url.searchParams.get("tournament_id"),
  match_id: url.searchParams.get("match_id"),
  limit: url.searchParams.get("limit"),
  offset: url.searchParams.get("offset"),
});

if (!validated.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      details: validated.error.errors,
    }),
    { status: 400 }
  );
}
```

### 4. Rate Limiting (przyszłe enhancement):

- **Zalecenie:** Zaimplementować rate limiting na poziomie middleware
- **Limit:** np. 100 żądań/minutę na użytkownika
- **Biblioteka:** `@vercel/edge-rate-limit` lub podobna
- **Priorytet:** Średni (nie krytyczny dla MVP)

### 5. SQL Injection Protection:

- **Ochrona:** Automatyczna przez Supabase parametrized queries
- **Uwaga:** Nigdy nie używaj string interpolation w zapytaniach
- **Bezpieczne:** Wszystkie filtry używają `.eq()`, `.in()` itp.

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu:

#### 1. Brak uwierzytelnienia (401):

```typescript
const {
  data: { user },
  error: authError,
} = await context.locals.supabase.auth.getUser();

if (authError || !user) {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Przyczyny:**

- Brak tokenu sesji
- Token wygasł
- Token nieprawidłowy/skorumpowany

#### 2. Nieprawidłowe parametry zapytania (400):

```typescript
const validated = getUserBetsQuerySchema.safeParse(rawParams);

if (!validated.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      details: validated.error.errors.map((err) => ({
        path: err.path,
        message: err.message,
      })),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
```

**Przyczyny:**

- `limit` > 100 lub < 1
- `offset` < 0
- `tournament_id` lub `match_id` nie są liczbami całkowitymi

#### 3. Błąd bazy danych (500):

```typescript
try {
  const result = await betsService.getUserBets(context.locals.supabase, user.id, validated.data);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
} catch (error) {
  console.error("Error in GET /api/me/bets:", error);

  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Przyczyny:**

- Timeout bazy danych
- Błąd połączenia z Supabase
- Nieprawidłowe zapytanie SQL (błąd implementacji)

#### 4. Pusta lista (200):

```typescript
// To NIE jest błąd - zwracamy pustą tablicę
{
  "data": [],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Kiedy:**

- Użytkownik nie ma jeszcze zakładów
- Wszystkie filtry wykluczyły wszystkie zakłady
- Offset przekracza liczbę dostępnych rekordów

### Error Logging Strategy:

```typescript
// W service layer
if (error) {
  console.error("BetsService.getUserBets failed:", {
    userId,
    params,
    error: error.message,
    code: error.code,
    details: error.details,
  });
  throw new Error("Failed to fetch bets");
}

// W API route
catch (error) {
  console.error("GET /api/me/bets endpoint error:", {
    userId: user.id,
    params: validated.data,
    error: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

## 8. Rozważania dotyczące wydajności

### 1. Indeksy bazodanowe:

**Istniejące indeksy (z migracji):**

```sql
-- Primary key na bets.id (automatyczny index)
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
```

**Pokrycie zapytań:**

- ✅ Filtrowanie po `user_id` - używa `idx_bets_user_id`
- ✅ Filtrowanie po `match_id` - używa `idx_bets_match_id`
- ✅ Join z `matches` - używa primary key na matches.id
- ✅ Filtrowanie po `tournament_id` w matches - używa `idx_matches_tournament_id`

**Dodatkowy index (opcjonalny, dla optymalizacji):**

```sql
-- Composite index dla częstego filtrowania
CREATE INDEX idx_bets_user_created ON bets(user_id, created_at DESC);
```

### 2. Optymalizacje zapytań:

#### a) Używanie `!inner` dla enforced joins:

```typescript
// Wymusza inner join - lepsze dla performance
.select(`
  *,
  match:matches!inner (...)
`)
```

#### b) Limit columns w select:

```typescript
// Zamiast `matches (*)`, wybieraj tylko potrzebne kolumny
.select(`
  id,
  user_id,
  match_id,
  picked_result,
  created_at,
  updated_at,
  match:matches!inner (
    id,
    tournament_id,
    home_team,
    away_team,
    match_datetime,
    status,
    result
  )
`)
```

#### c) Efektywne liczenie total:

```typescript
// Używaj count: 'exact' tylko gdy potrzebne
// Dla bardzo dużych tabel rozważ count: 'estimated'
.select('*', { count: 'exact' })
```

### 3. Caching Strategy:

**Cache na poziomie HTTP (Future enhancement):**

```typescript
// Dla zakładów na zakończone mecze - długi cache
if (allMatchesFinished) {
  headers["Cache-Control"] = "public, max-age=3600"; // 1 godzina
}
// Dla aktywnych zakładów - krótki cache
else {
  headers["Cache-Control"] = "public, max-age=60"; // 1 minuta
}
```

**Redis cache (Future enhancement):**

- Cache wyników dla często odwiedzanych stron
- Invalidacja przy nowym/zaktualizowanym zakładzie
- TTL: 5 minut dla aktywnych, 1 godzina dla zakończonych

### 4. Pagination Best Practices:

```typescript
// Default limit 50 jest dobrym balansem
// Maximum 100 zapobiega przesyłaniu zbyt dużych response'ów
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Używaj has_more zamiast obliczania total_pages (lżejsze)
const has_more = offset + limit < total;
```

### 5. N+1 Query Problem - Rozwiązanie:

```typescript
// ✅ DOBRZE - Jeden query z join
.select(`
  *,
  match:matches!inner (*)
`)

// ❌ ŹLE - N+1 problem (jeden query dla bets, potem N dla każdego match)
const bets = await supabase.from('bets').select('*');
for (const bet of bets) {
  const match = await supabase.from('matches').select('*').eq('id', bet.match_id);
}
```

### 6. Monitoring & Metrics:

```typescript
// Logowanie czasu wykonania dla monitoringu performance
const startTime = Date.now();

const result = await betsService.getUserBets(...);

const duration = Date.now() - startTime;
if (duration > 1000) { // Warning jeśli > 1s
  console.warn(`Slow query in GET /api/me/bets: ${duration}ms`, {
    userId: user.id,
    params: validated.data,
  });
}
```

### 7. Connection Pooling:

- **Supabase automatycznie zarządza connection pooling**
- Domyślny limit: 60 jednoczesnych połączeń (projekt Supabase free tier)
- Dla większych obciążeń: upgrade plan lub własny pooler (PgBouncer)

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie Service Layer

**Plik:** `src/lib/services/bets.service.ts`

**Zadania:**

1. Utwórz klasę `BetsService` (jeśli nie istnieje)
2. Zaimplementuj metodę `getUserBets`:
   - Przyjmuje `SupabaseClient`, `userId`, `BetsQueryParams`
   - Zwraca `Promise<PaginatedResponseDTO<BetWithMatchDTO>>`
3. Dodaj logikę budowania query z filtrami
4. Zaimplementuj paginację i liczenie total
5. Dodaj obsługę błędów z odpowiednim loggingiem

**Przykład implementacji:**

```typescript
// src/lib/services/bets.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { BetsQueryParams, BetWithMatchDTO, PaginatedResponseDTO } from "@/types";

export class BetsService {
  /**
   * Get user's bets with optional filters and pagination
   */
  async getUserBets(
    supabase: SupabaseClient,
    userId: string,
    params: BetsQueryParams
  ): Promise<PaginatedResponseDTO<BetWithMatchDTO>> {
    const { tournament_id, match_id, limit = 50, offset = 0 } = params;

    // Build base query
    let query = supabase
      .from("bets")
      .select(
        `
        id,
        user_id,
        match_id,
        picked_result,
        created_at,
        updated_at,
        match:matches!inner (
          id,
          tournament_id,
          home_team,
          away_team,
          match_datetime,
          status,
          result
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply optional filters
    if (tournament_id !== undefined) {
      query = query.eq("match.tournament_id", tournament_id);
    }

    if (match_id !== undefined) {
      query = query.eq("match_id", match_id);
    }

    // Execute query with pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    // Handle errors
    if (error) {
      console.error("BetsService.getUserBets failed:", {
        userId,
        params,
        error: error.message,
        code: error.code,
      });
      throw new Error("Failed to fetch user bets");
    }

    // Calculate pagination metadata
    const total = count ?? 0;
    const has_more = offset + limit < total;

    // Return paginated response
    return {
      data: (data as BetWithMatchDTO[]) || [],
      pagination: {
        total,
        limit,
        offset,
        has_more,
      },
    };
  }
}

// Export singleton instance
export const betsService = new BetsService();
```

### Krok 2: Utworzenie Zod Schema dla walidacji

**Plik:** `src/lib/schemas/bets.schema.ts` (lub w API route)

**Zadania:**

1. Zdefiniuj schema dla query parameters
2. Użyj `z.coerce.number()` dla automatycznej konwersji string → number
3. Dodaj odpowiednie walidacje (min, max, positive)
4. Ustaw defaulty dla limit i offset

**Przykład implementacji:**

```typescript
// src/lib/schemas/bets.schema.ts (lub bezpośrednio w route)
import { z } from "zod";

export const getUserBetsQuerySchema = z.object({
  tournament_id: z.coerce
    .number()
    .int()
    .positive({
      message: "tournament_id must be a positive integer",
    })
    .optional(),

  match_id: z.coerce
    .number()
    .int()
    .positive({
      message: "match_id must be a positive integer",
    })
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "limit must be at least 1" })
    .max(100, { message: "limit cannot exceed 100" })
    .default(50),

  offset: z.coerce.number().int().min(0, { message: "offset must be non-negative" }).default(0),
});

export type GetUserBetsQuery = z.infer<typeof getUserBetsQuerySchema>;
```

### Krok 3: Implementacja API Route Handler

**Plik:** `src/pages/api/me/bets/index.ts`

**Zadania:**

1. Utwórz struktur katalogów `/api/me/bets/`
2. Dodaj `export const prerender = false`
3. Zaimplementuj handler `GET`
4. Sprawdź uwierzytelnienie użytkownika
5. Waliduj query parameters z Zod
6. Wywołaj `betsService.getUserBets()`
7. Zwróć odpowiedź z odpowiednimi headers

**Przykład implementacji:**

```typescript
// src/pages/api/me/bets/index.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { betsService } from "@/lib/services/bets.service";

// Ensure this route is not prerendered
export const prerender = false;

// Zod schema for query params
const getUserBetsQuerySchema = z.object({
  tournament_id: z.coerce.number().int().positive().optional(),

  match_id: z.coerce.number().int().positive().optional(),

  limit: z.coerce.number().int().min(1).max(100).default(50),

  offset: z.coerce.number().int().min(0).default(0),
});

export const GET: APIRoute = async (context) => {
  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await context.locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Extract and validate query parameters
  const url = new URL(context.request.url);
  const rawParams = {
    tournament_id: url.searchParams.get("tournament_id"),
    match_id: url.searchParams.get("match_id"),
    limit: url.searchParams.get("limit"),
    offset: url.searchParams.get("offset"),
  };

  const validated = getUserBetsQuerySchema.safeParse(rawParams);

  if (!validated.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: validated.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Fetch user bets
  try {
    const result = await betsService.getUserBets(context.locals.supabase, user.id, validated.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/me/bets:", {
      userId: user.id,
      params: validated.data,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 4: Testowanie manualne

**Narzędzia:** Postman, cURL, lub Thunder Client (VS Code extension)

**Test Cases:**

#### Test 1: Pobranie wszystkich zakładów użytkownika

```bash
curl -X GET "http://localhost:3000/api/me/bets" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 200 OK z listą zakładów
```

#### Test 2: Filtrowanie po tournament_id

```bash
curl -X GET "http://localhost:3000/api/me/bets?tournament_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 200 OK z zakładami tylko dla turnieju 1
```

#### Test 3: Pobranie zakładu dla konkretnego meczu

```bash
curl -X GET "http://localhost:3000/api/me/bets?match_id=101" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 200 OK z jednym zakładem (lub pustą tablicą)
```

#### Test 4: Paginacja

```bash
curl -X GET "http://localhost:3000/api/me/bets?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 200 OK z 10 zakładami i pagination metadata
```

#### Test 5: Nieprawidłowy limit (> 100)

```bash
curl -X GET "http://localhost:3000/api/me/bets?limit=200" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 400 Bad Request z błędem walidacji
```

#### Test 6: Ujemny offset

```bash
curl -X GET "http://localhost:3000/api/me/bets?offset=-10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Oczekiwany wynik: 400 Bad Request z błędem walidacji
```

#### Test 7: Brak uwierzytelnienia

```bash
curl -X GET "http://localhost:3000/api/me/bets"

# Oczekiwany wynik: 401 Unauthorized
```

#### Test 8: Pusta lista zakładów

```bash
# Dla nowego użytkownika bez zakładów
curl -X GET "http://localhost:3000/api/me/bets" \
  -H "Authorization: Bearer NEW_USER_TOKEN"

# Oczekiwany wynik: 200 OK z pustą tablicą data: []
```

### Krok 5: Weryfikacja RLS Policies

**Zadania:**

1. Sprawdź czy policy `bets_select_own` jest aktywna w bazie danych
2. Przetestuj czy użytkownik A nie może zobaczyć zakładów użytkownika B
3. Zweryfikuj logi Supabase dla potencjalnych błędów RLS

**SQL Verification:**

```sql
-- Sprawdź czy policy jest aktywna
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bets' AND policyname = 'bets_select_own';

-- Spodziewany wynik:
-- policyname: bets_select_own
-- cmd: SELECT
-- qual: (auth.uid() = user_id)
```

**Test RLS (przez Supabase Studio):**

```sql
-- Zaloguj się jako user_1
SET request.jwt.claim.sub = 'user_1_uuid';

-- Spróbuj pobrać zakłady innego użytkownika
SELECT * FROM bets WHERE user_id = 'user_2_uuid';

-- Spodziewany wynik: 0 rows (RLS filtruje)
```

### Krok 6: Code Review Checklist

**Przed merge do main branch:**

- [ ] Service layer jest poprawnie wydzielony z API route
- [ ] Wszystkie query parameters są walidowane przez Zod
- [ ] Uwierzytelnienie jest sprawdzane na początku handlera
- [ ] RLS policies są aktywne i poprawnie skonfigurowane
- [ ] Błędy są odpowiednio logowane (bez eksponowania wrażliwych danych)
- [ ] Response zawiera poprawne Content-Type headers
- [ ] Paginacja działa poprawnie (has_more, total, limit, offset)
- [ ] Nested select dla matches używa `!inner` dla performance
- [ ] Query używa istniejących indeksów bazodanowych
- [ ] Edge cases są obsłużone (pusta lista, przekroczony offset)
- [ ] Kod jest zgodny z CLAUDE.md guidelines
- [ ] TypeScript typy są poprawnie użyte (bez `any`)
- [ ] Kod przeszedł przez ESLint i Prettier
- [ ] Manualne testy przeszły pomyślnie

### Krok 7: Dokumentacja

**Zadania:**

1. Zaktualizuj API documentation (jeśli istnieje)
2. Dodaj przykłady użycia w README (opcjonalnie)
3. Udokumentuj query parameters i response format

**Przykład dokumentacji:**

````markdown
### GET /api/me/bets

Retrieves all bets for the authenticated user.

**Authentication:** Required

**Query Parameters:**

- `tournament_id` (optional): Filter by tournament ID
- `match_id` (optional): Filter by specific match ID
- `limit` (optional): Items per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**

```bash
GET /api/me/bets?tournament_id=1&limit=20
Authorization: Bearer {token}
```
````

**Example Response (200 OK):**

```json
{
  "data": [
    {
      "id": 501,
      "user_id": "uuid",
      "match_id": 101,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null,
      "match": {
        "id": 101,
        "tournament_id": 1,
        "home_team": "Real Madrid",
        "away_team": "Barcelona",
        "match_datetime": "2025-11-15T20:00:00Z",
        "status": "SCHEDULED",
        "result": null
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

```

### Krok 8: Monitoring & Production Readiness

**Po wdrożeniu:**

1. **Monitoring wydajności:**
   - Dodaj metryki czasu odpowiedzi
   - Monitoruj slow queries (> 1s)
   - Track error rate

2. **Supabase Dashboard:**
   - Sprawdź API logs
   - Monitoruj database performance
   - Check RLS policy execution time

3. **Future Enhancements:**
   - Implementacja cache'owania (Redis)
   - Rate limiting dla endpointu
   - WebSocket dla real-time updates
   - Filtrowanie po date range
   - Sortowanie (custom order_by)

---

## 10. Podsumowanie

Endpoint `GET /api/me/bets` jest prostym read-only endpoint do pobierania zakładów użytkownika. Kluczowe elementy implementacji:

1. **Bezpieczeństwo:** RLS policies + uwierzytelnienie middleware
2. **Walidacja:** Zod schemas dla wszystkich query params
3. **Architektura:** Service layer oddzielony od API route
4. **Performance:** Efektywne zapytania z joins i indeksami
5. **UX:** Paginacja i filtry dla lepszego doświadczenia

Endpoint jest gotowy do implementacji i powinien być względnie prosty do wdrożenia, ponieważ:
- Nie modyfikuje danych (read-only)
- RLS automatycznie zabezpiecza dostęp
- Wszystkie potrzebne typy są już zdefiniowane w `types.ts`
- Pattern jest podobny do innych GET endpoints w projekcie
```
