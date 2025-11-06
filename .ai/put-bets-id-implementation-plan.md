# API Endpoint Implementation Plan: PUT /api/bets/:id

## 1. Przegląd punktu końcowego

Endpoint służy do aktualizacji istniejącego zakładu użytkownika. Umożliwia zmianę wytypowanego wyniku (`picked_result`) pod warunkiem, że:

- Użytkownik jest właścicielem zakładu
- Mecz jeszcze się nie rozpoczął (status `SCHEDULED`)
- Do rozpoczęcia meczu zostało więcej niż 5 minut

Jest to endpoint chroniony uwierzytelnianiem, który wykorzystuje Row Level Security (RLS) w Supabase do zapewnienia, że użytkownicy mogą modyfikować tylko swoje zakłady.

## 2. Szczegóły żądania

**Metoda HTTP:** PUT

**Struktura URL:** `/api/bets/:id`

**Parametry URL:**

- `id` (wymagany): ID zakładu typu `number` (BIGINT z bazy danych)

**Request Body:**

```typescript
{
  "picked_result": "HOME_WIN" | "DRAW" | "AWAY_WIN"
}
```

**Wymagane nagłówki:**

- `Content-Type: application/json`
- `Authorization: Bearer <token>` (automatycznie obsługiwany przez Supabase client)

**Parametry:**

- **Wymagane:**
  - `id` (URL parameter): ID zakładu do aktualizacji
  - `picked_result` (body): Nowy wytypowany wynik - jeden z trzech możliwych wyników meczu

- **Opcjonalne:** Brak

## 3. Wykorzystywane typy

**Z `src/types.ts`:**

```typescript
// Command Model dla aktualizacji zakładu
export type UpdateBetCommand = Pick<TablesUpdate<"bets">, "picked_result">;

// Enum dla możliwych wyników meczu
export type MatchOutcome = Enums<"match_outcome">; // "HOME_WIN" | "DRAW" | "AWAY_WIN"

// Entity dla zakładu (odpowiedź)
export type BetEntity = Tables<"bets">;

// Wrapper dla odpowiedzi API
export interface ApiResponse<T> {
  data: T;
}

// Odpowiedź błędu
export interface ApiErrorResponse {
  error: string;
  reason?: string;
}
```

**Schemat walidacji Zod (do stworzenia):**

```typescript
import { z } from "zod";

const updateBetSchema = z.object({
  picked_result: z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"], {
    required_error: "picked_result is required",
    invalid_type_error: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
  }),
});

const betIdSchema = z.coerce
  .number({
    required_error: "Bet ID is required",
    invalid_type_error: "Bet ID must be a number",
  })
  .positive("Bet ID must be a positive number");
```

## 4. Szczegóły odpowiedzi

**Success Response (200 OK):**

```json
{
  "data": {
    "id": 501,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "DRAW",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": "2025-11-11T10:15:00Z"
  }
}
```

**Error Responses:**

| Kod | Sytuacja                                          | Odpowiedź                                                                                |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 400 | Nieprawidłowe dane wejściowe                      | `{ "error": "Invalid request data", "details": [...] }`                                  |
| 401 | Brak uwierzytelnienia                             | `{ "error": "Authentication required" }`                                                 |
| 403 | Mecz zaczyna się za mniej niż 5 minut             | `{ "error": "Cannot modify this bet", "reason": "Match starts in less than 5 minutes" }` |
| 403 | Mecz nie ma statusu SCHEDULED                     | `{ "error": "Cannot modify this bet", "reason": "Match is not scheduled" }`              |
| 404 | Zakład nie istnieje lub nie należy do użytkownika | `{ "error": "Bet not found" }`                                                           |
| 500 | Błąd serwera                                      | `{ "error": "Internal server error" }`                                                   |

## 5. Przepływ danych

```
1. REQUEST
   ├─> Walidacja parametru :id (Zod)
   ├─> Walidacja request body (Zod)
   └─> Sprawdzenie uwierzytelnienia (middleware)

2. SERVICE LAYER (BetsService.updateBet)
   ├─> Pobranie zakładu z bazą danych wraz z danymi meczu
   │   └─> SELECT bets.*, matches.match_datetime, matches.status
   │       FROM bets
   │       JOIN matches ON bets.match_id = matches.id
   │       WHERE bets.id = :id AND bets.user_id = :userId
   │
   ├─> Sprawdzenie czy zakład istnieje (404 jeśli nie)
   │
   ├─> Walidacja biznesowa:
   │   ├─> Status meczu = 'SCHEDULED' (403 jeśli nie)
   │   └─> match_datetime > (now() + 5 minutes) (403 jeśli nie)
   │
   └─> Aktualizacja zakładu
       └─> UPDATE bets
           SET picked_result = :picked_result,
               updated_at = now()
           WHERE id = :id AND user_id = :userId

3. RESPONSE
   ├─> Sukces: 200 OK z zaktualizowanym zakładem
   └─> Błąd: Odpowiedni kod statusu z komunikatem
```

**Uwagi dotyczące przepływu:**

- RLS Policy `bets_update_own` automatycznie weryfikuje warunki:
  - `auth.uid() = user_id` (użytkownik jest właścicielem)
  - `match_datetime > (now() + interval '5 minutes')`
  - `status = 'SCHEDULED'`
- Jeśli RLS Policy nie przepuści aktualizacji, Supabase zwróci 0 zaktualizowanych wierszy
- Trigger `set_updated_at_bets` automatycznie ustawi `updated_at` na `now()`

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- **Mechanizm:** Supabase Auth z JWT tokens
- **Implementacja:** Middleware Astro sprawdza `context.locals.supabase.auth.getUser()`
- **Błąd:** 401 Unauthorized jeśli token jest nieważny lub brakuje

### 6.2. Autoryzacja

- **Row Level Security (RLS):** Policy `bets_update_own` zapewnia, że:
  - Użytkownik może aktualizować tylko swoje zakłady (`auth.uid() = user_id`)
  - Warunki biznesowe są spełnione (czas, status meczu)
- **Dodatkowa weryfikacja:** Service layer dodatkowo weryfikuje warunki przed próbą aktualizacji

### 6.3. Walidacja danych wejściowych

- **Parametr :id:** Walidacja przez Zod (positive number)
- **Request body:** Walidacja przez Zod schema
- **SQL Injection:** Zabezpieczony przez parametryzowane zapytania Supabase
- **XSS:** Nieistotny - endpoint nie zwraca HTML

### 6.4. Rate Limiting

- **Rekomendacja:** Implementacja rate limiting na poziomie middleware lub Supabase Edge Functions
- **Limit sugerowany:** 10 requestów/minutę na użytkownika dla endpointów modyfikujących zakłady

### 6.5. CORS

- **Konfiguracja:** Zgodnie z ustawieniami Astro (astro.config.mjs)
- **Produkcja:** Ogranicz do zaufanych domen

## 7. Obsługa błędów

### 7.1. Błędy walidacji (400 Bad Request)

**Scenariusze:**

- Brak `picked_result` w body
- Nieprawidłowa wartość `picked_result` (nie jest jednym z enum values)
- Nieprawidłowy format `id` w URL (nie jest liczbą)
- `id` jest liczbą ujemną lub zerem

**Odpowiedź:**

```json
{
  "error": "Invalid request data",
  "details": [
    {
      "path": ["picked_result"],
      "message": "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN"
    }
  ]
}
```

**Implementacja:**

```typescript
try {
  const validatedData = updateBetSchema.parse(requestBody);
  const validatedId = betIdSchema.parse(params.id);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: "Invalid request data",
        details: error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### 7.2. Błędy uwierzytelniania (401 Unauthorized)

**Scenariusz:** Brak tokenu lub nieważny token

**Odpowiedź:**

```json
{
  "error": "Authentication required"
}
```

**Implementacja:** Middleware sprawdza `context.locals.supabase.auth.getUser()`

### 7.3. Błędy autoryzacji (403 Forbidden)

**Scenariusze:**

1. Mecz zaczyna się za mniej niż 5 minut
2. Mecz nie ma statusu `SCHEDULED` (jest `IN_PLAY`, `FINISHED`, itp.)

**Odpowiedzi:**

_Przypadek 1:_

```json
{
  "error": "Cannot modify this bet",
  "reason": "Match starts in less than 5 minutes"
}
```

_Przypadek 2:_

```json
{
  "error": "Cannot modify this bet",
  "reason": "Match is not scheduled"
}
```

**Implementacja:**

```typescript
// W service layer - weryfikacja przed aktualizacją
const timeUntilMatch = match.match_datetime.getTime() - Date.now();
const fiveMinutesInMs = 5 * 60 * 1000;

if (timeUntilMatch <= fiveMinutesInMs) {
  return {
    success: false,
    error: "Cannot modify this bet",
    reason: "Match starts in less than 5 minutes",
  };
}

if (match.status !== "SCHEDULED") {
  return {
    success: false,
    error: "Cannot modify this bet",
    reason: "Match is not scheduled",
  };
}
```

### 7.4. Błędy nie znalezienia zasobu (404 Not Found)

**Scenariusze:**

- Zakład o podanym ID nie istnieje
- Zakład istnieje, ale należy do innego użytkownika (RLS blokuje dostęp)

**Odpowiedź:**

```json
{
  "error": "Bet not found"
}
```

**Uwaga:** Nie rozróżniamy tych dwóch przypadków dla bezpieczeństwa (information disclosure)

**Implementacja:**

```typescript
// Po próbie pobrania zakładu z bazą
if (!bet) {
  return new Response(JSON.stringify({ error: "Bet not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
```

### 7.5. Błędy serwera (500 Internal Server Error)

**Scenariusze:**

- Błąd połączenia z bazą danych
- Nieoczekiwany błąd w kodzie aplikacji
- Timeout zapytania do bazy

**Odpowiedź:**

```json
{
  "error": "Internal server error"
}
```

**Implementacja:**

```typescript
try {
  // ... logika endpointu
} catch (error) {
  console.error("Error updating bet:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

## 8. Wydajność

### 8.1. Optymalizacja zapytań

**Indeksy wykorzystywane:**

- PRIMARY KEY na `bets.id` - szybkie wyszukiwanie po ID
- INDEX na `bets.user_id` - wykorzystywany przez RLS policy
- FOREIGN KEY index na `bets.match_id` - dla JOIN z matches

**Zapytanie SELECT:**

```sql
-- Single query z JOIN - optymalnie
SELECT
  bets.*,
  matches.match_datetime,
  matches.status
FROM bets
INNER JOIN matches ON bets.match_id = matches.id
WHERE bets.id = :id AND bets.user_id = :userId
```

**Zapytanie UPDATE:**

```sql
-- Proste UPDATE z RLS
UPDATE bets
SET
  picked_result = :picked_result,
  updated_at = now()
WHERE id = :id AND user_id = :userId
RETURNING *
```

### 8.2. Potencjalne wąskie gardła

1. **RLS Policy sprawdza warunki meczu:**
   - Policy wykonuje sub-query do tabeli `matches`
   - Zoptymalizowane przez indeks na `matches.id` (PRIMARY KEY)
   - Dodatkowy index na `matches.status` może pomóc, jeśli będzie problem z wydajnością

2. **Trigger `set_updated_at_bets`:**
   - Wykonywany przy każdym UPDATE
   - Minimalny overhead (tylko ustawienie timestamp)

3. **Konkurencyjne aktualizacje:**
   - Rzadki przypadek (jeden użytkownik aktualizuje swój zakład)
   - Brak potrzeby dodatkowych locków

### 8.3. Strategie optymalizacji

1. **Caching:**
   - Nie zalecany dla tego endpointu (dane mutują)
   - Możliwy cache dla danych meczu (krótki TTL)

2. **Connection pooling:**
   - Automatycznie obsługiwany przez Supabase client

3. **Query optimization:**
   - Użycie `RETURNING *` w UPDATE eliminuje dodatkowy SELECT

4. **Monitoring:**
   - Logowanie czasu wykonania zapytań
   - Tracking częstości błędów 403 (może wskazywać na próby aktualizacji po deadline)

### 8.4. Szacowane czasy odpowiedzi

- **Sukces (200):** 50-150ms
  - SELECT + JOIN: 20-50ms
  - Walidacja biznesowa: 5-10ms
  - UPDATE: 20-50ms
  - Overhead: 5-40ms

- **Błąd walidacji (400):** 5-20ms (tylko walidacja Zod)
- **Błąd autoryzacji (403):** 30-100ms (SELECT + walidacja)
- **Błąd 404:** 20-50ms (SELECT z RLS)

## 9. Etapy wdrożenia

### Krok 1: Stworzenie struktury folderów i plików

```bash
# Utworzenie folderu dla API routes
mkdir -p src/pages/api/bets

# Utworzenie folderu dla services
mkdir -p src/lib/services

# Utworzenie folderu dla schematów walidacji
mkdir -p src/lib/schemas
```

**Pliki do utworzenia:**

- `src/pages/api/bets/[id].ts` - Route handler dla PUT /api/bets/:id
- `src/lib/services/bets.service.ts` - Business logic dla operacji na zakładach
- `src/lib/schemas/bet.schemas.ts` - Zod schemas dla walidacji zakładów

### Krok 2: Implementacja schematów walidacji

**Plik:** `src/lib/schemas/bet.schemas.ts`

```typescript
import { z } from "zod";

/**
 * Schema walidacji dla aktualizacji zakładu
 * Wykorzystywany w PUT /api/bets/:id
 */
export const updateBetSchema = z.object({
  picked_result: z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"], {
    required_error: "picked_result is required",
    invalid_type_error: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
  }),
});

/**
 * Schema walidacji ID zakładu z parametru URL
 */
export const betIdSchema = z.coerce
  .number({
    required_error: "Bet ID is required",
    invalid_type_error: "Bet ID must be a number",
  })
  .positive("Bet ID must be a positive number")
  .int("Bet ID must be an integer");

/**
 * Inferred types
 */
export type UpdateBetInput = z.infer<typeof updateBetSchema>;
export type BetIdInput = z.infer<typeof betIdSchema>;
```

### Krok 3: Implementacja service layer

**Plik:** `src/lib/services/bets.service.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { BetEntity, UpdateBetCommand } from "@/types";

/**
 * Typ rezultatu operacji aktualizacji zakładu
 */
type UpdateBetResult =
  | { success: true; data: BetEntity }
  | { success: false; error: string; reason?: string; status: 403 | 404 | 500 };

/**
 * Service do zarządzania zakładami użytkowników
 */
export class BetsService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Aktualizuje istniejący zakład użytkownika
   *
   * Waliduje:
   * - Czy zakład istnieje i należy do użytkownika
   * - Czy mecz ma status SCHEDULED
   * - Czy do rozpoczęcia meczu zostało więcej niż 5 minut
   *
   * @param betId - ID zakładu do aktualizacji
   * @param userId - ID zalogowanego użytkownika
   * @param data - Dane do aktualizacji (picked_result)
   * @returns Promise z rezultatem operacji
   */
  async updateBet(betId: number, userId: string, data: UpdateBetCommand): Promise<UpdateBetResult> {
    try {
      // Krok 1: Pobierz zakład z danymi meczu
      const { data: bet, error: fetchError } = await this.supabase
        .from("bets")
        .select(
          `
          *,
          match:matches (
            id,
            match_datetime,
            status
          )
        `
        )
        .eq("id", betId)
        .eq("user_id", userId)
        .single();

      // Obsługa błędów pobrania
      if (fetchError) {
        console.error("Error fetching bet:", fetchError);

        // RLS Policy blokuje dostęp - zakład nie istnieje lub nie należy do użytkownika
        if (fetchError.code === "PGRST116") {
          return {
            success: false,
            error: "Bet not found",
            status: 404,
          };
        }

        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      if (!bet) {
        return {
          success: false,
          error: "Bet not found",
          status: 404,
        };
      }

      // Krok 2: Walidacja biznesowa - status meczu
      const match = bet.match as { id: number; match_datetime: string; status: string };

      if (match.status !== "SCHEDULED") {
        return {
          success: false,
          error: "Cannot modify this bet",
          reason: "Match is not scheduled",
          status: 403,
        };
      }

      // Krok 3: Walidacja biznesowa - czas do rozpoczęcia meczu
      const matchDatetime = new Date(match.match_datetime);
      const now = new Date();
      const timeUntilMatch = matchDatetime.getTime() - now.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeUntilMatch <= fiveMinutesInMs) {
        return {
          success: false,
          error: "Cannot modify this bet",
          reason: "Match starts in less than 5 minutes",
          status: 403,
        };
      }

      // Krok 4: Aktualizuj zakład
      // RLS Policy ponownie zweryfikuje warunki, ale już je sprawdziliśmy
      const { data: updatedBet, error: updateError } = await this.supabase
        .from("bets")
        .update({
          picked_result: data.picked_result,
        })
        .eq("id", betId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating bet:", updateError);
        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      if (!updatedBet) {
        // To nie powinno się zdarzyć po naszej walidacji
        return {
          success: false,
          error: "Bet not found",
          status: 404,
        };
      }

      return {
        success: true,
        data: updatedBet,
      };
    } catch (error) {
      console.error("Unexpected error in updateBet:", error);
      return {
        success: false,
        error: "Internal server error",
        status: 500,
      };
    }
  }
}
```

### Krok 4: Implementacja route handler

**Plik:** `src/pages/api/bets/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { BetsService } from "@/lib/services/bets.service";
import { updateBetSchema, betIdSchema } from "@/lib/schemas/bet.schemas";
import type { ApiResponse, ApiErrorResponse, BetEntity } from "@/types";

// Wyłącz prerendering - endpoint działa tylko server-side
export const prerender = false;

/**
 * PUT /api/bets/:id
 *
 * Aktualizuje istniejący zakład użytkownika
 *
 * @requires Authentication
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Krok 1: Sprawdź uwierzytelnienie
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse: ApiErrorResponse = {
        error: "Authentication required",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Krok 2: Walidacja parametru ID
    let betId: number;
    try {
      betId = betIdSchema.parse(params.id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse: ApiErrorResponse = {
          error: "Invalid bet ID",
          details: error.errors.map((e) => ({
            path: e.path.map(String),
            message: e.message,
          })),
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    // Krok 3: Walidacja request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: "Invalid JSON in request body",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let validatedData: { picked_result: "HOME_WIN" | "DRAW" | "AWAY_WIN" };
    try {
      validatedData = updateBetSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse: ApiErrorResponse = {
          error: "Invalid request data",
          details: error.errors.map((e) => ({
            path: e.path.map(String),
            message: e.message,
          })),
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    // Krok 4: Wywołaj service do aktualizacji zakładu
    const betsService = new BetsService(locals.supabase);
    const result = await betsService.updateBet(betId, user.id, validatedData);

    // Krok 5: Obsłuż rezultat
    if (!result.success) {
      const errorResponse: ApiErrorResponse = {
        error: result.error,
        ...(result.reason && { reason: result.reason }),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sukces
    const successResponse: ApiResponse<BetEntity> = {
      data: result.data,
    };
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Nieoczekiwany błąd
    console.error("Unexpected error in PUT /api/bets/:id:", error);
    const errorResponse: ApiErrorResponse = {
      error: "Internal server error",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 5: Konfiguracja middleware (jeśli nie istnieje)

**Plik:** `src/middleware/index.ts` (sprawdź czy istnieje i dostosuj)

Middleware powinien zapewnić dostęp do `context.locals.supabase` dla wszystkich route handlerów.

```typescript
import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";

export const onRequest = defineMiddleware(async (context, next) => {
  // Inicjalizacja Supabase client
  context.locals.supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return context.cookies.get(key)?.value;
        },
        set(key, value, options) {
          context.cookies.set(key, value, options);
        },
        remove(key, options) {
          context.cookies.delete(key, options);
        },
      },
    }
  );

  return next();
});
```

### Krok 6: Aktualizacja typów środowiska (jeśli potrzebne)

**Plik:** `src/env.d.ts` (sprawdź czy `locals.supabase` jest poprawnie typowany)

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import("@/db/supabase.client").SupabaseClient;
  }
}
```

### Krok 7: Instalacja zależności (jeśli brakuje)

```bash
npm install zod @supabase/ssr @supabase/supabase-js
```

### Krok 8: Testowanie

**Testy manualne:**

1. **Test sukcesu (200):**

```bash
# Załóż: user jest zalogowany, bet_id = 1, mecz za więcej niż 5 minut, status SCHEDULED
curl -X PUT http://localhost:3000/api/bets/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"picked_result": "DRAW"}'
```

2. **Test walidacji (400):**

```bash
# Nieprawidłowy picked_result
curl -X PUT http://localhost:3000/api/bets/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"picked_result": "INVALID"}'
```

3. **Test uwierzytelnienia (401):**

```bash
# Brak tokenu
curl -X PUT http://localhost:3000/api/bets/1 \
  -H "Content-Type: application/json" \
  -d '{"picked_result": "DRAW"}'
```

4. **Test autoryzacji - deadline (403):**

```bash
# Mecz za mniej niż 5 minut
curl -X PUT http://localhost:3000/api/bets/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"picked_result": "DRAW"}'
```

5. **Test nie znalezienia (404):**

```bash
# Nieistniejący bet_id
curl -X PUT http://localhost:3000/api/bets/99999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"picked_result": "DRAW"}'
```

**Testy jednostkowe (opcjonalne, ale zalecane):**

Utworzenie pliku `src/lib/services/bets.service.test.ts` z testami dla `BetsService.updateBet()`.

### Krok 9: Weryfikacja RLS Policies

Sprawdź, czy RLS policies są poprawnie skonfigurowane w Supabase:

```sql
-- Sprawdź czy RLS jest włączony
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'bets';

-- Sprawdź policies
SELECT * FROM pg_policies WHERE tablename = 'bets';
```

Jeśli policies nie istnieją, uruchom migrację z pliku `supabase/migrations/20251028120000_initial_schema.sql`.

### Krok 10: Monitoring i logging

Dodaj monitoring dla:

- Częstość błędów 403 (może wskazywać na próby oszustwa)
- Czas odpowiedzi endpointu
- Błędy 500 (problemy z bazą danych)

Przykład:

```typescript
// W service lub route handler
console.log(`[BET_UPDATE] User ${userId} updated bet ${betId} to ${data.picked_result}`);
```

### Krok 11: Dokumentacja API

Zaktualizuj dokumentację API (jeśli istnieje) o endpoint PUT /api/bets/:id z przykładami request/response.

### Krok 12: Deployment checklist

Przed wdrożeniem na produkcję sprawdź:

- [ ] Wszystkie testy przechodzą
- [ ] RLS policies są aktywne w Supabase
- [ ] Zmienne środowiskowe są ustawione (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Rate limiting jest skonfigurowany (opcjonalnie)
- [ ] Monitoring i alerty są aktywne
- [ ] Dokumentacja jest zaktualizowana

---

## Podsumowanie

Ten plan implementacji zapewnia kompletne wdrożenie endpointu PUT /api/bets/:id z:

- ✅ Pełną walidacją danych wejściowych (Zod)
- ✅ Wielowarstwowym bezpieczeństwem (middleware + RLS + service)
- ✅ Obsługą wszystkich scenariuszy błędów
- ✅ Optymalizacją wydajności (single JOIN query)
- ✅ Czystą architekturą (route handler → service → database)
- ✅ Zgodnością z zasadami projektu (CLAUDE.md)

Implementacja wykorzystuje:

- **Astro 5** server mode dla API routes
- **TypeScript 5** dla type safety
- **Supabase** dla bazy danych i RLS
- **Zod** dla runtime validation
- **Early return pattern** dla error handling
