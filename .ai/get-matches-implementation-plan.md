# API Endpoint Implementation Plan: GET /api/matches

## 1. Przegląd punktu końcowego

Endpoint `GET /api/matches` służy do pobierania listy meczów z opcjonalnym filtrowaniem. Endpoint zwraca mecze wraz z informacją o zakładach zalogowanego użytkownika (jeśli istnieją). Dostęp do endpointu wymaga uwierzytelnienia.

**Główne funkcje:**

- Pobieranie listy meczów z paginacją
- Filtrowanie po turnieju, statusie meczu i zakresie dat
- Zwracanie informacji o zakładach użytkownika dla każdego meczu
- Wsparcie dla parametrów limit i offset (paginacja)

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/matches`
- **Wymagane nagłówki:**
  - `Authorization: Bearer <access_token>` (obsługiwane automatycznie przez Supabase client)

**Parametry Query:**

- **Opcjonalne:**
  - `tournament_id` (number): Filtruje mecze po ID turnieju
  - `status` (string): Filtruje po statusie meczu - jeden z: `SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`
  - `from_date` (string): Data początkowa w formacie ISO 8601 (np. `2025-11-15T00:00:00Z`)
  - `to_date` (string): Data końcowa w formacie ISO 8601
  - `limit` (number): Liczba wyników na stronę (domyślnie: 50, max: 100)
  - `offset` (number): Przesunięcie paginacji (domyślnie: 0)

**Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
// DTO dla pojedynczego meczu z informacją o zakładzie
export type MatchDTO = MatchEntity & {
  user_bet: BetDTO | null;
};

// Podstawowe typy
export type MatchEntity = Tables<"matches">;
export type BetDTO = Pick<BetEntity, "id" | "picked_result" | "created_at" | "updated_at">;

// Typy enumeracyjne
export type MatchStatus = Enums<"match_status">; // "SCHEDULED" | "IN_PLAY" | "FINISHED" | "POSTPONED" | "CANCELED"
export type MatchOutcome = Enums<"match_outcome">; // "HOME_WIN" | "DRAW" | "AWAY_WIN"

// Parametry zapytania
export interface MatchesQueryParams {
  tournament_id?: number;
  status?: MatchStatus;
  from_date?: string; // ISO 8601
  to_date?: string; // ISO 8601
  limit?: number;
  offset?: number;
}

// Odpowiedź z paginacją
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

**Typ odpowiedzi dla endpointu:**

```typescript
type GetMatchesResponse = PaginatedResponseDTO<MatchDTO>;
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "data": [
    {
      "id": 101,
      "tournament_id": 1,
      "home_team": "Real Madrid",
      "away_team": "Barcelona",
      "match_datetime": "2025-11-15T20:00:00Z",
      "status": "SCHEDULED",
      "result": null,
      "api_match_id": 12345,
      "is_scored": false,
      "user_bet": null
    },
    {
      "id": 102,
      "tournament_id": 1,
      "home_team": "Bayern Munich",
      "away_team": "Manchester City",
      "match_datetime": "2025-11-16T19:45:00Z",
      "status": "SCHEDULED",
      "result": null,
      "api_match_id": 12346,
      "is_scored": false,
      "user_bet": {
        "id": 501,
        "picked_result": "HOME_WIN",
        "created_at": "2025-11-10T14:30:00Z",
        "updated_at": null
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### Błędy

**401 Unauthorized:**

```json
{
  "error": "Authentication required"
}
```

**400 Bad Request:**

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["limit"],
      "message": "Must be between 1 and 100"
    }
  ]
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal server error"
}
```

## 5. Przepływ danych

### Krok po kroku:

1. **Walidacja uwierzytelnienia:**
   - Pobierz użytkownika z `context.locals.supabase.auth.getUser()`
   - Jeśli użytkownik nie jest uwierzytelniony → zwróć 401

2. **Walidacja parametrów zapytania:**
   - Parsuj i waliduj parametry query z użyciem Zod
   - Sprawdź typy, zakresy wartości i formaty dat
   - Jeśli walidacja nie powiedzie się → zwróć 400 z detalami błędów

3. **Wywołanie serwisu:**
   - Przekaż zwalidowane parametry do `MatchesService.getMatches()`
   - Serwis buduje zapytanie do Supabase z filtrami i paginacją

4. **Zapytanie do bazy danych:**
   - Pobierz mecze z tabeli `matches` z zastosowaniem filtrów
   - Użyj LEFT JOIN do tabeli `bets` dla uzyskania zakładów użytkownika
   - Policz całkowitą liczbę wyników (dla paginacji)
   - Zastosuj limit i offset

5. **Transformacja danych:**
   - Przekształć wyniki z bazy na format `MatchDTO[]`
   - Oblicz `has_more` na podstawie total, limit i offset
   - Stwórz obiekt `PaginationDTO`

6. **Zwrócenie odpowiedzi:**
   - Zwróć `PaginatedResponseDTO<MatchDTO>` z kodem 200

### Struktura zapytania SQL (pseudokod):

```sql
-- Główne zapytanie do pobrania meczów
SELECT
  m.*,
  b.id as bet_id,
  b.picked_result,
  b.created_at as bet_created_at,
  b.updated_at as bet_updated_at
FROM matches m
LEFT JOIN bets b ON b.match_id = m.id AND b.user_id = $user_id
WHERE
  ($tournament_id IS NULL OR m.tournament_id = $tournament_id)
  AND ($status IS NULL OR m.status = $status)
  AND ($from_date IS NULL OR m.match_datetime >= $from_date)
  AND ($to_date IS NULL OR m.match_datetime <= $to_date)
ORDER BY m.match_datetime ASC
LIMIT $limit
OFFSET $offset;

-- Zapytanie do zliczenia całkowitej liczby wyników
SELECT COUNT(*)
FROM matches m
WHERE
  ($tournament_id IS NULL OR m.tournament_id = $tournament_id)
  AND ($status IS NULL OR m.status = $status)
  AND ($from_date IS NULL OR m.match_datetime >= $from_date)
  AND ($to_date IS NULL OR m.match_datetime <= $to_date);
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie:

- **Wymagane:** Endpoint wymaga uwierzytelnionego użytkownika
- **Implementacja:** Sprawdzenie `context.locals.supabase.auth.getUser()`
- **Odpowiedź przy braku auth:** 401 Unauthorized

### Autoryzacja:

- **RLS (Row Level Security):** Polityki RLS na tabeli `matches` pozwalają wszystkim uwierzytelnionym użytkownikom odczytywać mecze
- **Zakłady użytkownika:** LEFT JOIN z `bets` automatycznie filtruje zakłady przez `user_id`, więc użytkownik widzi tylko swoje zakłady
- **Polityka RLS na bets:** Zapewnia, że użytkownik może odczytywać tylko swoje zakłady (`auth.uid() = user_id`)

### Walidacja danych wejściowych:

- **Zod Schema:** Wszystkie parametry query muszą przejść walidację Zod
- **Ochrona przed SQL Injection:** Supabase client automatycznie parametryzuje zapytania
- **Ograniczenia wartości:**
  - `limit`: min 1, max 100
  - `offset`: min 0
  - `status`: musi być jedną z wartości enum `MatchStatus`
  - Daty: musi być prawidłowy format ISO 8601

### Ochrona przed nadużyciami:

- **Rate limiting:** (Do rozważenia w przyszłości) - ograniczenie liczby requestów na użytkownika
- **Max limit:** Limit wynosi maksymalnie 100, aby zapobiec nadmiernemu obciążeniu bazy

## 7. Obsługa błędów

### Scenariusze błędów:

| Kod     | Scenariusz                                            | Odpowiedź                                                                                                                                                                                     |
| ------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **401** | Użytkownik nie jest uwierzytelniony                   | `{ "error": "Authentication required" }`                                                                                                                                                      |
| **400** | Nieprawidłowy `limit` (poza zakresem 1-100)           | `{ "error": "Invalid query parameters", "details": [{ "path": ["limit"], "message": "Must be between 1 and 100" }] }`                                                                         |
| **400** | Nieprawidłowy `status` (nie jest wartością enum)      | `{ "error": "Invalid query parameters", "details": [{ "path": ["status"], "message": "Invalid enum value. Expected 'SCHEDULED' \| 'IN_PLAY' \| 'FINISHED' \| 'POSTPONED' \| 'CANCELED'" }] }` |
| **400** | Nieprawidłowy format daty (`from_date` lub `to_date`) | `{ "error": "Invalid query parameters", "details": [{ "path": ["from_date"], "message": "Invalid ISO 8601 date format" }] }`                                                                  |
| **400** | `to_date` jest wcześniejsza niż `from_date`           | `{ "error": "Invalid query parameters", "details": [{ "path": ["to_date"], "message": "to_date must be after from_date" }] }`                                                                 |
| **500** | Błąd bazy danych (Supabase)                           | `{ "error": "Internal server error" }`                                                                                                                                                        |
| **500** | Nieoczekiwany błąd serwera                            | `{ "error": "Internal server error" }`                                                                                                                                                        |

### Logowanie błędów:

```typescript
// W przypadku błędów 500, loguj szczegóły do konsoli
console.error("[GET /api/matches] Database error:", error);
// W przyszłości: zapis do tabeli error_logs lub zewnętrznego serwisu (np. Sentry)
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Zapytanie z JOIN:**
   - LEFT JOIN z tabelą `bets` może być kosztowne przy dużej liczbie zakładów
   - **Optymalizacja:** Indeksy na `bets(match_id, user_id)` są kluczowe

2. **COUNT(\*) dla paginacji:**
   - Zliczanie wszystkich wyników może być wolne przy dużych tabelach
   - **Optymalizacja:**
     - Użyj `count` opcji w Supabase (`{ count: 'exact' }`)
     - Rozważ cache'owanie count dla popularnych filtrów

3. **Brak indeksów:**
   - Filtrowanie po `tournament_id`, `status`, `match_datetime` wymaga indeksów
   - **Zgodnie z dokumentacją:** Tabela `matches` ma już indeksy na tych kolumnach

### Strategie optymalizacji:

1. **Indeksy (już zaimplementowane):**
   - `matches(tournament_id)` - dla filtrowania po turnieju
   - `matches(status)` - dla filtrowania po statusie
   - `matches(match_datetime)` - dla sortowania i filtrowania po datach
   - `bets(match_id, user_id)` - dla JOIN z zakładami użytkownika

2. **Paginacja:**
   - Domyślny limit 50 zapobiega pobieraniu zbyt dużych zestawów danych
   - Maksymalny limit 100 chroni przed nadużyciami

3. **Selective fields:**
   - Zwracaj tylko potrzebne kolumny (Supabase automatycznie to robi)
   - Dla zakładów: tylko `id`, `picked_result`, `created_at`, `updated_at`

4. **Przyszłe optymalizacje:**
   - Cache'owanie wyników dla popularnych zapytań (np. Redis)
   - Materialized views dla często używanych filtrów
   - Cursor-based pagination zamiast offset (dla lepszej wydajności przy dużych offsetach)

## 9. Etapy wdrożenia

### Krok 1: Stworzenie Zod Schema dla walidacji

**Plik:** `src/lib/validation/matches.validation.ts`

```typescript
import { z } from "zod";
import { Constants } from "@/db/database.types";

const matchStatusValues = Constants.public.Enums.match_status;

export const getMatchesQuerySchema = z
  .object({
    tournament_id: z.coerce.number().int().positive().optional(),
    status: z.enum(matchStatusValues as [string, ...string[]]).optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: "to_date must be after from_date",
      path: ["to_date"],
    }
  );

export type GetMatchesQuery = z.infer<typeof getMatchesQuerySchema>;
```

### Krok 2: Stworzenie serwisu dla logiki biznesowej

**Plik:** `src/lib/services/matches.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { MatchDTO, PaginatedResponseDTO } from "@/types";
import type { GetMatchesQuery } from "@/lib/validation/matches.validation";

export class MatchesService {
  constructor(private supabase: SupabaseClient) {}

  async getMatches(userId: string, query: GetMatchesQuery): Promise<PaginatedResponseDTO<MatchDTO>> {
    // Buduj zapytanie z filtrami
    let matchesQuery = this.supabase.from("matches").select(
      `
        *,
        user_bet:bets!left(id, picked_result, created_at, updated_at)
      `,
      { count: "exact" }
    );

    // Filtr po user_id dla zakładów (LEFT JOIN)
    matchesQuery = matchesQuery.or(`user_id.eq.${userId},user_id.is.null`, {
      foreignTable: "bets",
    });

    // Zastosuj filtry
    if (query.tournament_id) {
      matchesQuery = matchesQuery.eq("tournament_id", query.tournament_id);
    }

    if (query.status) {
      matchesQuery = matchesQuery.eq("status", query.status);
    }

    if (query.from_date) {
      matchesQuery = matchesQuery.gte("match_datetime", query.from_date);
    }

    if (query.to_date) {
      matchesQuery = matchesQuery.lte("match_datetime", query.to_date);
    }

    // Sortowanie, paginacja
    matchesQuery = matchesQuery
      .order("match_datetime", { ascending: true })
      .range(query.offset, query.offset + query.limit - 1);

    // Wykonaj zapytanie
    const { data, error, count } = await matchesQuery;

    if (error) {
      throw error;
    }

    // Transformuj dane do MatchDTO[]
    const matches: MatchDTO[] = (data || []).map((match) => ({
      ...match,
      user_bet: Array.isArray(match.user_bet) && match.user_bet.length > 0 ? match.user_bet[0] : null,
    }));

    // Oblicz paginację
    const total = count || 0;
    const has_more = query.offset + query.limit < total;

    return {
      data: matches,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        has_more,
      },
    };
  }
}
```

### Krok 3: Stworzenie handlera endpointu API

**Plik:** `src/pages/api/matches.ts`

```typescript
import type { APIRoute } from "astro";
import { getMatchesQuerySchema } from "@/lib/validation/matches.validation";
import { MatchesService } from "@/lib/services/matches.service";
import type { ApiErrorResponse } from "@/types";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // 1. Uwierzytelnianie
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

    // 2. Walidacja parametrów zapytania
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const validationResult = getMatchesQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = validationResult.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      }));

      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details,
        } satisfies ApiErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Wywołanie serwisu
    const matchesService = new MatchesService(context.locals.supabase);
    const result = await matchesService.getMatches(user.id, validationResult.data);

    // 4. Zwrócenie odpowiedzi
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Logowanie błędu
    console.error("[GET /api/matches] Unexpected error:", error);

    // Zwróć błąd 500
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Krok 4: Stworzenie struktury katalogów

```bash
# Jeśli nie istnieją, stwórz katalogi:
mkdir -p src/lib/services
mkdir -p src/lib/validation
mkdir -p src/pages/api
```

### Krok 5: Instalacja zależności (jeśli potrzebna)

```bash
# Zod powinien być już zainstalowany, ale jeśli nie:
npm install zod
```

### Krok 6: Testowanie endpointu

**Przykładowe zapytania:**

```bash
# Podstawowe zapytanie (wszystkie mecze)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/matches

# Filtrowanie po turnieju
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/matches?tournament_id=1"

# Filtrowanie po statusie
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/matches?status=SCHEDULED"

# Filtrowanie po dacie
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/matches?from_date=2025-11-01T00:00:00Z&to_date=2025-11-30T23:59:59Z"

# Paginacja
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/matches?limit=10&offset=20"

# Kombinacja filtrów
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/matches?tournament_id=1&status=SCHEDULED&limit=25"
```

### Krok 7: Weryfikacja RLS Policies

Upewnij się, że polityki RLS są prawidłowo skonfigurowane w Supabase:

```sql
-- Sprawdź polityki dla tabeli matches
SELECT * FROM pg_policies WHERE tablename = 'matches';

-- Sprawdź polityki dla tabeli bets
SELECT * FROM pg_policies WHERE tablename = 'bets';
```

### Krok 8: Dokumentacja i testy jednostkowe (opcjonalne)

- Dodaj JSDoc do funkcji serwisu
- Stwórz testy jednostkowe dla walidacji Zod
- Stwórz testy integracyjne dla endpointu (np. z użyciem Vitest)

---

## Podsumowanie

Ten plan implementacji zawiera wszystkie niezbędne kroki do stworzenia endpointu `GET /api/matches`. Kluczowe elementy to:

1. **Walidacja:** Zod schema zapewnia type-safe walidację parametrów
2. **Separacja logiki:** Serwis wyodrębnia logikę biznesową z handlera API
3. **Bezpieczeństwo:** RLS policies + uwierzytelnianie chroni dane
4. **Wydajność:** Indeksy + paginacja zapewniają szybkie odpowiedzi
5. **Obsługa błędów:** Szczegółowe kody statusu i komunikaty błędów

Implementacja zgodna jest z architekturą Astro 5, TypeScript 5, oraz best practices dla REST API.
