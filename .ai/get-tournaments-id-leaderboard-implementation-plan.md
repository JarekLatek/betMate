# API Endpoint Implementation Plan: GET /api/tournaments/:tournament_id/leaderboard

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania publicznej tabeli wyników (rankingu) dla określonego turnieju. Ranking jest dostępny dla wszystkich uwierzytelnionych użytkowników i pokazuje pozycję każdego użytkownika wraz z jego punktami. Użytkownicy z tą samą liczbą punktów dzielą tę samą pozycję w rankingu.

**Kluczowe cechy:**

- Publiczny dostęp dla uwierzytelnionych użytkowników
- Obsługa paginacji (limit, offset)
- Ranking z obsługą ex aequo (ta sama pozycja dla tej samej liczby punktów)
- Zwraca informacje o turnieju jako kontekst
- Domyślny limit: 100, maksymalny: 500

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/tournaments/:tournament_id/leaderboard`
- **Parametry URL:**
  - `tournament_id` (wymagany, number): Identyfikator turnieju
- **Parametry zapytania (Query Parameters):**
  - `limit` (opcjonalny, number): Liczba wyników na stronę
    - Wartość domyślna: 100
    - Maksymalna wartość: 500
    - Minimalna wartość: 1
  - `offset` (opcjonalny, number): Offset dla paginacji
    - Wartość domyślna: 0
    - Minimalna wartość: 0
- **Request Body:** Brak (metoda GET)
- **Headers:**
  - `Authorization: Bearer <token>` (wymagany) - Token Supabase

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTO dla pojedynczego wpisu w rankingu
export interface LeaderboardEntryDTO {
  rank: number;
  user_id: string;
  username: string;
  points: number;
}

// Typ dla parametrów zapytania
export interface LeaderboardQueryParams {
  limit?: number;
  offset?: number;
}

// Typ dla paginacji
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Typ odpowiedzi z leaderboardem
export type LeaderboardResponseDTO = PaginatedResponseDTO<LeaderboardEntryDTO> & {
  tournament: Pick<TournamentDTO, "id" | "name">;
};

// Typ dla błędów
export interface ApiErrorResponse {
  error: string;
  details?: {
    path: string[];
    message: string;
  }[];
  code?: string;
  reason?: string;
}
```

### Typy do walidacji (Zod schemas):

Należy utworzyć schematy Zod dla walidacji w pliku `/src/lib/validations/leaderboard.validation.ts`:

```typescript
import { z } from "zod";

// Walidacja parametrów URL
export const leaderboardParamsSchema = z.object({
  tournament_id: z.coerce.number().int().positive(),
});

// Walidacja query parameters
export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK):

```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "username": "johndoe",
      "points": 45
    },
    {
      "rank": 2,
      "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "username": "janedoe",
      "points": 42
    },
    {
      "rank": 3,
      "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "username": "bobsmith",
      "points": 38
    },
    {
      "rank": 3,
      "user_id": "d4e5f6a7-b8c9-0123-def1-234567890123",
      "username": "alicejones",
      "points": 38
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 100,
    "offset": 0,
    "has_more": true
  },
  "tournament": {
    "id": 1,
    "name": "UEFA Champions League"
  }
}
```

### Błąd 401 Unauthorized:

```json
{
  "error": "Authentication required"
}
```

### Błąd 404 Not Found:

```json
{
  "error": "Tournament not found"
}
```

### Błąd 400 Bad Request (nieprawidłowe parametry):

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "Number must be less than or equal to 500"
    }
  ]
}
```

### Błąd 500 Internal Server Error:

```json
{
  "error": "Internal server error"
}
```

## 5. Przepływ danych

### Architektura warstw:

```
Request → API Route → Validation → Service → Database → Response
```

### Szczegółowy przepływ:

1. **Request Layer** (`/src/pages/api/tournaments/[tournament_id]/leaderboard.ts`):
   - Odbiór żądania GET
   - Pobranie `tournament_id` z parametrów URL
   - Pobranie `limit` i `offset` z query parameters
   - Przekazanie do warstwy walidacji

2. **Validation Layer**:
   - Walidacja `tournament_id` (czy jest liczbą, czy jest dodatnia)
   - Walidacja `limit` (1-500, default 100)
   - Walidacja `offset` (>= 0, default 0)
   - Sprawdzenie uwierzytelnienia użytkownika

3. **Service Layer** (`/src/lib/services/leaderboard.service.ts`):
   - Sprawdzenie istnienia turnieju
   - Obliczenie całkowitej liczby uczestników (dla paginacji)
   - Pobranie wyników z tabeli `scores` + `profiles`
   - Obliczenie rankingów z obsługą ex aequo
   - Zastosowanie paginacji (offset, limit)

4. **Database Layer**:
   - Query do tabeli `tournaments` (sprawdzenie istnienia)
   - Query do tabel `scores` + `profiles` (JOIN)
   - Sortowanie po `points DESC`
   - Agregacja dla total count

5. **Response Layer**:
   - Formatowanie danych do `LeaderboardResponseDTO`
   - Zwrócenie odpowiedzi z kodem 200

### Zapytania SQL (logika):

**Sprawdzenie istnienia turnieju:**

```sql
SELECT id, name FROM tournaments WHERE id = $1
```

**Obliczenie total count:**

```sql
SELECT COUNT(*) FROM scores WHERE tournament_id = $1
```

**Pobranie leaderboard:**

```sql
SELECT
  s.user_id,
  p.username,
  s.points
FROM scores s
INNER JOIN profiles p ON s.user_id = p.id
WHERE s.tournament_id = $1
ORDER BY s.points DESC, p.username ASC
LIMIT $2 OFFSET $3
```

**Algorytm rankingu (post-processing w kodzie):**

- Sortowanie po punktach malejąco
- Iteracja przez wyniki
- Przypisanie rank = 1 dla pierwszego
- Dla kolejnych: jeśli punkty == punkty poprzednie, to rank = rank poprzednie
- W przeciwnym razie: rank = pozycja w tablicy (1-based)

## 6. Względy bezpieczeństwa

### Uwierzytelnienie:

- **Wymagane:** Endpoint wymaga uwierzytelnienia
- **Metoda:** Token Bearer z Supabase Auth
- **Implementacja:**
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

### Autoryzacja:

- **Polityka:** Wszystkie uwierzytelnione użytkownicy mogą czytać leaderboard
- **RLS:** Tabela `scores` ma politykę `scores_select_authenticated`:
  ```sql
  CREATE POLICY "scores_select_authenticated" ON scores
    FOR SELECT
    TO authenticated
    USING (true);
  ```
- **Brak dodatkowej autoryzacji:** Endpoint jest publiczny dla zalogowanych

### Walidacja danych wejściowych:

1. **tournament_id:**
   - Sprawdzenie typu (number)
   - Sprawdzenie zakresu (positive integer)
   - Sanityzacja przez Zod coercion

2. **limit:**
   - Sprawdzenie zakresu (1-500)
   - Ustawienie domyślnej wartości (100)
   - Zapobieganie atakom typu resource exhaustion

3. **offset:**
   - Sprawdzenie zakresu (>= 0)
   - Ustawienie domyślnej wartości (0)
   - Zapobieganie ujemnym wartościom

### SQL Injection:

- **Ochrona:** Użycie Supabase Client z parametryzowanymi zapytaniami
- **Nie używać:** String interpolation w zapytaniach SQL
- **Używać:** `.eq()`, `.order()`, `.limit()`, `.range()` z Supabase

### Rate Limiting:

- **Zalecenie:** Implementacja rate limiting na poziomie API Gateway lub middleware
- **Limit sugerowany:** 100 żądań/minutę na użytkownika
- **Poza zakresem:** Nie implementowane w tym endpointcie, ale należy rozważyć

### Leaking Information:

- **Publiczne dane:** username, points, rank
- **Prywatne dane:** NIGDY nie zwracać email, auth details
- **Tylko profile.id:** Zwracamy user_id (UUID z profiles.id), NIE auth.users

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu:

| Kod | Scenariusz                  | Warunek                                     | Komunikat                            |
| --- | --------------------------- | ------------------------------------------- | ------------------------------------ |
| 401 | Brak uwierzytelnienia       | Brak tokenu lub nieprawidłowy token         | "Authentication required"            |
| 400 | Nieprawidłowy tournament_id | tournament_id nie jest liczbą lub jest <= 0 | "Invalid tournament_id"              |
| 400 | Nieprawidłowy limit         | limit < 1 lub > 500                         | "Invalid query parameters" + details |
| 400 | Nieprawidłowy offset        | offset < 0                                  | "Invalid query parameters" + details |
| 404 | Turniej nie istnieje        | Nie znaleziono turnieju w bazie             | "Tournament not found"               |
| 500 | Błąd bazy danych            | Problem z połączeniem lub zapytaniem        | "Internal server error"              |
| 500 | Nieoczekiwany błąd          | Dowolny inny błąd                           | "Internal server error"              |

### Struktura obsługi błędów w kodzie:

```typescript
// 1. Na początku funkcji: Walidacja uwierzytelnienia
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

// 2. Walidacja parametrów
const paramsValidation = leaderboardParamsSchema.safeParse({ tournament_id });
if (!paramsValidation.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid tournament_id",
      details: paramsValidation.error.errors,
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

// 3. Walidacja query parameters
const queryValidation = leaderboardQuerySchema.safeParse(queryParams);
if (!queryValidation.success) {
  return new Response(
    JSON.stringify({
      error: "Invalid query parameters",
      details: queryValidation.error.errors,
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}

// 4. W service: Sprawdzenie istnienia turnieju
const tournament = await getTournamentById(tournamentId);
if (!tournament) {
  return new Response(JSON.stringify({ error: "Tournament not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

// 5. Try-catch dla błędów bazy danych
try {
  // ... database operations
} catch (error) {
  console.error("Leaderboard error:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

### Logowanie błędów:

- **Console.error:** Dla błędów 500 z pełnym stack trace
- **Console.warn:** Dla błędów 404 (może być normalne)
- **Console.info:** Dla błędów walidacji 400 (opcjonalnie)

**Nie logować:**

- Danych użytkownika (PII)
- Tokenów uwierzytelnienia
- Pełnych obiektów z hasłami

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **JOIN scores + profiles:**
   - Problem: Dla dużych turniejów JOIN może być kosztowny
   - Rozwiązanie: INDEX na `scores.tournament_id` (już istnieje)
   - Rozwiązanie: INDEX na `scores.points` (już istnieje)

2. **Sortowanie:**
   - Problem: ORDER BY points DESC dla wielu rekordów
   - Rozwiązanie: INDEX na `scores.points` (już istnieje)

3. **COUNT(\*) dla paginacji:**
   - Problem: COUNT(\*) może być wolny dla dużych tabel
   - Rozwiązanie: Cache'owanie total count (future optimization)
   - Rozwiązanie: Approximate count dla bardzo dużych zbiorów

4. **N+1 problem:**
   - Problem: Pobieranie profiles w pętli
   - Rozwiązanie: Użycie JOIN, NIE osobnych zapytań

### Strategie optymalizacji:

#### 1. Database Indexing (już istnieje):

```sql
-- Istniejące indeksy
INDEX ON scores(tournament_id)
INDEX ON scores(points)
PRIMARY KEY ON scores(user_id, tournament_id)
```

#### 2. Limit Result Set:

- Maksymalny limit: 500 (zapobiega przeciążeniu)
- Domyślny limit: 100 (rozsądna wartość)

#### 3. Efficient Query:

```typescript
// Użycie Supabase query builder (optymalizowane)
const { data, error } = await supabase
  .from("scores")
  .select("user_id, points, profiles!inner(username)")
  .eq("tournament_id", tournamentId)
  .order("points", { ascending: false })
  .order("profiles.username", { ascending: true })
  .range(offset, offset + limit - 1);
```

#### 4. Pagination Best Practices:

- Użycie offset-based pagination (wystarczające dla leaderboard)
- Cursor-based pagination (future enhancement dla bardzo dużych zbiorów)

#### 5. Caching (future enhancement):

- Cache total count dla turnieju (invalidate on score update)
- Cache top 10 dla każdego turnieju (invalidate on score update)
- Redis lub in-memory cache

#### 6. Response Size:

- Limit maksymalny (500) zapobiega zbyt dużym odpowiedziom
- Tylko niezbędne pola w odpowiedzi (rank, user_id, username, points)

### Monitoring:

- **Metrics do monitorowania:**
  - Czas odpowiedzi (target: < 200ms dla p95)
  - Liczba błędów 500
  - Liczba żądań/minutę
  - Rozmiar odpowiedzi

- **Alarmy:**
  - Czas odpowiedzi > 1s
  - Błędy 500 > 1% żądań

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury katalogów

```bash
mkdir -p src/pages/api/tournaments/[tournament_id]
mkdir -p src/lib/services
mkdir -p src/lib/validations
```

### Krok 2: Utworzenie schematu walidacji

**Plik:** `/src/lib/validations/leaderboard.validation.ts`

```typescript
import { z } from "zod";

/**
 * Schema for validating tournament_id URL parameter
 */
export const leaderboardParamsSchema = z.object({
  tournament_id: z.coerce.number().int().positive({
    message: "tournament_id must be a positive integer",
  }),
});

/**
 * Schema for validating leaderboard query parameters
 */
export const leaderboardQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "limit must be at least 1" })
    .max(500, { message: "limit must not exceed 500" })
    .default(100),
  offset: z.coerce.number().int().min(0, { message: "offset must be non-negative" }).default(0),
});

/**
 * Inferred types from schemas
 */
export type LeaderboardParams = z.infer<typeof leaderboardParamsSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
```

### Krok 3: Utworzenie service layer

**Plik:** `/src/lib/services/leaderboard.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { LeaderboardEntryDTO, LeaderboardResponseDTO, TournamentDTO } from "@/types";

/**
 * Get tournament by ID
 * @returns Tournament data or null if not found
 */
async function getTournamentById(
  supabase: SupabaseClient,
  tournamentId: number
): Promise<Pick<TournamentDTO, "id" | "name"> | null> {
  const { data, error } = await supabase.from("tournaments").select("id, name").eq("id", tournamentId).single();

  if (error) {
    console.warn("Tournament not found:", tournamentId);
    return null;
  }

  return data;
}

/**
 * Get total count of participants in tournament
 */
async function getTotalParticipants(supabase: SupabaseClient, tournamentId: number): Promise<number> {
  const { count, error } = await supabase
    .from("scores")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    console.error("Error counting participants:", error);
    throw new Error("Failed to count participants");
  }

  return count ?? 0;
}

/**
 * Calculate ranks for leaderboard entries
 * Users with same points share the same rank
 */
function calculateRanks(entries: Array<{ user_id: string; username: string; points: number }>): LeaderboardEntryDTO[] {
  if (entries.length === 0) return [];

  const ranked: LeaderboardEntryDTO[] = [];
  let currentRank = 1;
  let previousPoints: number | null = null;

  entries.forEach((entry, index) => {
    // If points are different from previous, update rank to current position
    if (previousPoints !== null && entry.points !== previousPoints) {
      currentRank = index + 1;
    }

    ranked.push({
      rank: currentRank,
      user_id: entry.user_id,
      username: entry.username,
      points: entry.points,
    });

    previousPoints = entry.points;
  });

  return ranked;
}

/**
 * Get leaderboard for a tournament
 * @throws Error if database operation fails
 */
export async function getLeaderboard(
  supabase: SupabaseClient,
  tournamentId: number,
  limit: number,
  offset: number
): Promise<LeaderboardResponseDTO> {
  // Step 1: Check if tournament exists
  const tournament = await getTournamentById(supabase, tournamentId);
  if (!tournament) {
    throw new Error("TOURNAMENT_NOT_FOUND");
  }

  // Step 2: Get total count for pagination
  const total = await getTotalParticipants(supabase, tournamentId);

  // Step 3: Fetch leaderboard entries with pagination
  const { data: scores, error } = await supabase
    .from("scores")
    .select("user_id, points, profiles!inner(username)")
    .eq("tournament_id", tournamentId)
    .order("points", { ascending: false })
    .order("profiles.username", { ascending: true }) // Secondary sort for consistency
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    throw new Error("Failed to fetch leaderboard");
  }

  // Step 4: Transform data and calculate ranks
  const entries = scores.map((score) => ({
    user_id: score.user_id,
    username: Array.isArray(score.profiles) ? score.profiles[0].username : score.profiles.username,
    points: score.points,
  }));

  const rankedEntries = calculateRanks(entries);

  // Step 5: Build response
  return {
    data: rankedEntries,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
    tournament: {
      id: tournament.id,
      name: tournament.name,
    },
  };
}
```

### Krok 4: Utworzenie API route

**Plik:** `/src/pages/api/tournaments/[tournament_id]/leaderboard.ts`

```typescript
import type { APIRoute } from "astro";

import { leaderboardParamsSchema, leaderboardQuerySchema } from "@/lib/validations/leaderboard.validation";
import { getLeaderboard } from "@/lib/services/leaderboard.service";

export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
  // Step 1: Check authentication
  const {
    data: { user },
    error: authError,
  } = await locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Step 2: Validate URL parameters
  const paramsValidation = leaderboardParamsSchema.safeParse({
    tournament_id: params.tournament_id,
  });

  if (!paramsValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid tournament_id",
        details: paramsValidation.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 3: Validate query parameters
  const queryParams = {
    limit: url.searchParams.get("limit"),
    offset: url.searchParams.get("offset"),
  };

  const queryValidation = leaderboardQuerySchema.safeParse(queryParams);

  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query parameters",
        details: queryValidation.error.errors.map((err) => ({
          path: err.path,
          message: err.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 4: Extract validated data
  const { tournament_id } = paramsValidation.data;
  const { limit, offset } = queryValidation.data;

  // Step 5: Fetch leaderboard from service
  try {
    const leaderboard = await getLeaderboard(locals.supabase, tournament_id, limit, offset);

    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_FOUND") {
      return new Response(JSON.stringify({ error: "Tournament not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle unexpected errors
    console.error("Unexpected error in leaderboard endpoint:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 5: Instalacja zależności (jeśli brakuje)

```bash
npm install zod
```

### Krok 6: Testowanie endpointu

**Testy manualne z curl:**

```bash
# 1. Uzyskanie tokenu (zakładając, że masz access token)
export TOKEN="your_supabase_access_token"

# 2. Test podstawowy (sukces)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard"

# 3. Test z paginacją
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard?limit=50&offset=0"

# 4. Test bez uwierzytelnienia (401)
curl "http://localhost:3000/api/tournaments/1/leaderboard"

# 5. Test z nieprawidłowym tournament_id (400)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/abc/leaderboard"

# 6. Test z nieistniejącym turniejem (404)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/99999/leaderboard"

# 7. Test z nieprawidłowym limitem (400)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard?limit=1000"

# 8. Test z ujemnym offsetem (400)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/tournaments/1/leaderboard?offset=-1"
```

### Krok 7: Dodanie typu do env.d.ts (jeśli potrzebne)

**Plik:** `/src/env.d.ts`

Sprawdź, czy istnieje definicja typu dla `locals.supabase`. Jeśli nie, dodaj:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import("@/db/supabase.client").SupabaseClient;
  }
}
```

### Krok 8: Dokumentacja API

Utworzyć dokumentację API w formacie OpenAPI/Swagger lub Markdown w katalogu `/docs/api/`.

**Plik:** `/docs/api/leaderboard.md`

```markdown
# GET /api/tournaments/:tournament_id/leaderboard

Retrieve the public leaderboard (rankings) for a specific tournament.

## Authentication

Required: Yes (Bearer token)

## Parameters

- `tournament_id` (path, required): Tournament ID
- `limit` (query, optional): Results per page (default: 100, max: 500)
- `offset` (query, optional): Pagination offset (default: 0)

## Response

See main documentation for full response schema.
```

### Krok 9: Code Review Checklist

- [ ] Wszystkie typy są poprawnie zdefiniowane w `src/types.ts`
- [ ] Walidacja Zod dla wszystkich parametrów wejściowych
- [ ] Uwierzytelnienie sprawdzane na początku funkcji
- [ ] Obsługa wszystkich scenariuszy błędów (401, 400, 404, 500)
- [ ] Early returns dla błędów (brak głęboko zagnieżdżonych if-else)
- [ ] Logika biznesowa wyodrębniona do service layer
- [ ] Użycie Supabase Client z context.locals (NIE bezpośredni import)
- [ ] Indeksy bazodanowe sprawdzone i zoptymalizowane
- [ ] RLS policies sprawdzone
- [ ] Nie logujemy wrażliwych danych (PII, tokeny)
- [ ] Response headers zawierają `Content-Type: application/json`
- [ ] `export const prerender = false` dodane do API route
- [ ] Testy manualne przeprowadzone dla wszystkich scenariuszy
- [ ] Dokumentacja API zaktualizowana

### Krok 10: Deployment

1. Sprawdzić, czy zmienne środowiskowe są ustawione:

   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_KEY
   ```

2. Build production:

   ```bash
   npm run build
   ```

3. Preview production build:

   ```bash
   npm run preview
   ```

4. Deploy (zgodnie z konfiguracją projektu)

---

## Podsumowanie

Ten plan implementacji zapewnia:

1. ✅ **Kompletną walidację** - Zod schemas dla wszystkich parametrów
2. ✅ **Bezpieczeństwo** - Uwierzytelnienie, RLS, walidacja input
3. ✅ **Wydajność** - Optymalne zapytania, indexy, limit pagination
4. ✅ **Czytelność** - Service layer, separation of concerns
5. ✅ **Obsługa błędów** - Wszystkie scenariusze pokryte
6. ✅ **Zgodność z regułami** - Astro patterns, early returns, Supabase best practices
7. ✅ **Testowalność** - Jasny podział odpowiedzialności, łatwe do przetestowania

Endpoint jest gotowy do implementacji zgodnie z tym planem.
