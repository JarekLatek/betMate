# API Endpoint Implementation Plan: GET /api/tournaments

## 1. Przegląd punktu końcowego

Endpoint `GET /api/tournaments` służy do pobierania listy wszystkich dostępnych turniejów. Jest to prosty endpoint tylko do odczytu, który zwraca kompletną listę turniejów bez paginacji. Dostęp do endpointu wymaga uwierzytelnienia.

**Główne funkcje:**

- Pobieranie pełnej listy dostępnych turniejów
- Zwracanie podstawowych informacji o turniejach (id, nazwa, api_tournament_id)
- Endpoint zabezpieczony przez Row Level Security (RLS) w Supabase

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/api/tournaments`
- **Wymagane nagłówki:**
  - `Authorization: Bearer <access_token>` (obsługiwane automatycznie przez Supabase client)

**Parametry Query:** Brak

**Request Body:** Brak (metoda GET)

## 3. Wykorzystywane typy

### Istniejące typy z `src/types.ts`:

```typescript
/**
 * Tournament entity representing a football competition
 * Source: Tables<"tournaments">
 */
export type TournamentDTO = Tables<"tournaments">;
```

**Struktura TournamentDTO (z database.types.ts):**

```typescript
// Tables<"tournaments">
{
  id: number;
  name: string;
  api_tournament_id: number | null;
}
```

**Typ odpowiedzi dla endpointu:**

```typescript
interface GetTournamentsResponse {
  data: TournamentDTO[];
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "data": [
    {
      "id": 1,
      "name": "UEFA Champions League",
      "api_tournament_id": 2
    },
    {
      "id": 2,
      "name": "FIFA World Cup 2026",
      "api_tournament_id": 1
    },
    {
      "id": 3,
      "name": "Premier League",
      "api_tournament_id": 39
    }
  ]
}
```

**Opis struktury:**

- `data`: Tablica obiektów turniejów
  - `id`: Unikalny identyfikator turnieju w bazie danych (BIGINT)
  - `name`: Nazwa turnieju (TEXT)
  - `api_tournament_id`: Identyfikator turnieju z zewnętrznego API (api-football.com) - może być null

### Błąd: Brak uwierzytelnienia (401 Unauthorized)

```json
{
  "error": "Authentication required"
}
```

**Kiedy występuje:**

- Brak tokenu uwierzytelnienia
- Token wygasły
- Token nieprawidłowy

### Błąd serwera (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

**Kiedy występuje:**

- Błąd połączenia z bazą danych
- Nieoczekiwany błąd podczas przetwarzania żądania

## 5. Przepływ danych

```
1. Klient → API Endpoint
   GET /api/tournaments
   Header: Authorization: Bearer <token>

2. API Endpoint → Middleware
   Weryfikacja tokenu uwierzytelnienia
   (automatycznie przez middleware Supabase)

3. API Endpoint → Supabase Client
   context.locals.supabase (uwierzytelniony klient)

4. Supabase Client → Service Layer
   tournamentService.getAllTournaments(supabase)

5. Service Layer → PostgreSQL (via Supabase)
   SELECT id, name, api_tournament_id
   FROM tournaments
   ORDER BY name ASC

   RLS Policy: tournaments_select_authenticated
   - Sprawdzenie: użytkownik jest uwierzytelniony

6. PostgreSQL → Service Layer
   Zwrócenie tablicy rekordów turniejów

7. Service Layer → API Endpoint
   Zwrócenie TournamentDTO[]

8. API Endpoint → Klient
   Response: { data: TournamentDTO[] }
   Status: 200 OK
```

**Kluczowe punkty:**

- Endpoint używa `context.locals.supabase` - klient już uwierzytelniony przez middleware
- RLS policy automatycznie filtruje dostęp (tylko authenticated users)
- Brak potrzeby dodatkowej walidacji user_id (RLS to obsługuje)
- Service layer enkapsuluje logikę zapytania do bazy

## 6. Względy bezpieczeństwa

### Uwierzytelnienie

- **Wymagane:** Tak, użytkownik musi być zalogowany
- **Mechanizm:** JWT token Supabase w nagłówku Authorization
- **Obsługa:** Automatyczna przez middleware Astro + Supabase
- **Punkt weryfikacji:** `context.locals.supabase.auth.getUser()`

### Autoryzacja

- **Row Level Security (RLS):** Włączone na tabeli `tournaments`
- **Policy:** `tournaments_select_authenticated`
  ```sql
  CREATE POLICY "tournaments_select_authenticated" ON tournaments
    FOR SELECT
    TO authenticated
    USING (true);
  ```
- **Poziom dostępu:** Wszyscy uwierzytelnieni użytkownicy mogą odczytywać wszystkie turnieje
- **Ochrona modyfikacji:** Tylko service_role może modyfikować turnieje (INSERT/UPDATE/DELETE)

### Walidacja danych wejściowych

- **Parametry query:** Brak (endpoint nie przyjmuje parametrów)
- **Request body:** Brak (metoda GET)
- **Walidacja tokenu:** Automatyczna przez Supabase middleware

### Potencjalne zagrożenia i mitigacje

1. **Nieuwierzytelniony dostęp**
   - Mitigacja: Sprawdzenie `user` z `getUser()` na początku handlera
   - Return: 401 Unauthorized

2. **SQL Injection**
   - Mitigacja: Używanie Supabase client API (automatyczne parametryzowanie)
   - Brak bezpośrednich zapytań SQL z interpolacją

3. **Nadmierne pobieranie danych**
   - Mitigacja: SELECT tylko potrzebnych kolumn (id, name, api_tournament_id)
   - Brak selectowania pól systemowych lub metadanych

4. **Rate limiting**
   - Uwaga: Brak wbudowanego rate limiting w Astro
   - Rekomendacja: Rozważyć dodanie rate limiting na poziomie Supabase lub middleware (przyszła iteracja)

## 7. Obsługa błędów

### Tabela błędów i kodów statusu

| Scenariusz błędu                | Kod HTTP | Komunikat błędu           | Akcja                                             |
| ------------------------------- | -------- | ------------------------- | ------------------------------------------------- |
| Brak tokenu uwierzytelnienia    | 401      | "Authentication required" | Sprawdzenie user === null w getUser()             |
| Token wygasły/nieprawidłowy     | 401      | "Authentication required" | Sprawdzenie user === null w getUser()             |
| Błąd połączenia z bazą danych   | 500      | "Internal server error"   | Catch w try-catch, logowanie błędu                |
| Błąd RLS (brak uprawnień)       | 500      | "Internal server error"   | Catch w try-catch (nie powinno wystąpić dla READ) |
| Nieoczekiwany błąd serwera      | 500      | "Internal server error"   | Catch w try-catch, logowanie błędu                |
| Błąd deserializacji danych z DB | 500      | "Internal server error"   | Catch w try-catch, logowanie błędu                |

### Implementacja obsługi błędów

```typescript
// W pliku: src/pages/api/tournaments.ts

export async function GET(context: APIContext): Promise<Response> {
  // 1. Weryfikacja uwierzytelnienia (Guard clause)
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

  // 2. Próba pobrania danych
  try {
    const tournaments = await tournamentService.getAllTournaments(context.locals.supabase);

    return new Response(JSON.stringify({ data: tournaments }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 3. Logowanie błędu dla debugowania
    console.error("Error fetching tournaments:", error);

    // 4. Zwrócenie generycznego błędu (nie ujawniamy szczegółów)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Strategia logowania błędów

- **Console logging:** Dla developmentu (console.error)
- **Produkcja:** Rozważyć integrację z narzędziem do monitorowania błędów (np. Sentry)
- **Informacje do logowania:**
  - Timestamp
  - User ID (jeśli dostępny)
  - Stack trace
  - Request context (nie logować wrażliwych danych)

## 8. Rozważania dotyczące wydajności

### Optymalizacje zapytań

1. **Select tylko potrzebnych kolumn**

   ```typescript
   // Dobre praktyki
   .select('id, name, api_tournament_id')

   // Unikać
   .select('*')
   ```

2. **Indeksowanie**
   - PRIMARY KEY na `id` (automatycznie zaindeksowane)
   - UNIQUE INDEX na `api_tournament_id` (już istnieje)
   - Rozważyć INDEX na `name` jeśli często używane do sortowania

3. **Sortowanie**
   - Sortowanie po `name` dla lepszego UX
   - Wykorzystanie INDEX może przyspieszyć sortowanie

### Caching

1. **Browser caching**
   - Rozważyć nagłówki Cache-Control
   - Turnieje rzadko się zmieniają, można cachować na 1h-24h

   ```typescript
   headers: {
     "Content-Type": "application/json",
     "Cache-Control": "public, max-age=3600" // 1 godzina
   }
   ```

2. **Server-side caching**
   - Opcjonalnie: cache in-memory dla listy turniejów
   - Invalidacja przy aktualizacji turniejów
   - Implementacja w przyszłej iteracji

### Potencjalne wąskie gardła

1. **Brak paginacji**
   - **Problem:** Zwracanie wszystkich turniejów na raz
   - **Aktualne założenie:** Liczba turniejów jest ograniczona (~10-50 turniejów)
   - **Monitoring:** Obserwować rozmiar odpowiedzi
   - **Próg działania:** Jeśli > 100 turniejów, rozważyć paginację

2. **Concurrent requests**
   - **Problem:** Wiele równoczesnych zapytań do bazy
   - **Mitigacja:** Connection pooling w Supabase (automatyczne)
   - **Rekomendacja:** Implementacja caching dla często odpytywanych danych

3. **Wielkość odpowiedzi**
   - **Aktualna:** ~100-500 bytes per tournament
   - **50 turniejów:** ~5-25 KB (akceptowalne)
   - **Monitoring:** Sprawdzać wielkość payload w produkcji

### Metryki do monitorowania

- **Response time:** < 200ms (cele)
- **Error rate:** < 0.1%
- **Throughput:** Liczba requestów na minutę
- **Database query time:** < 50ms

## 9. Etapy wdrożenia

### Krok 1: Utworzenie service layer

**Cel:** Wydzielenie logiki biznesowej do reużywalnego service

**Akcje:**

1. Utwórz katalog `src/lib/services/` (jeśli nie istnieje)
2. Utwórz plik `src/lib/services/tournament.service.ts`
3. Implementuj funkcję `getAllTournaments`:

```typescript
// src/lib/services/tournament.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { TournamentDTO } from "@/types";

export const tournamentService = {
  /**
   * Retrieve all available tournaments
   * @param supabase - Authenticated Supabase client
   * @returns Array of tournaments
   * @throws Error if database query fails
   */
  async getAllTournaments(supabase: SupabaseClient): Promise<TournamentDTO[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, name, api_tournament_id")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tournaments: ${error.message}`);
    }

    return data as TournamentDTO[];
  },
};
```

**Kryteria akceptacji:**

- [ ] Service eksportuje obiekt z metodą `getAllTournaments`
- [ ] Metoda zwraca `Promise<TournamentDTO[]>`
- [ ] Używa Supabase client przekazanego jako parametr
- [ ] Selectuje tylko wymagane kolumny
- [ ] Sortuje wyniki alfabetycznie po nazwie
- [ ] Rzuca błąd w przypadku problemów z bazą danych

### Krok 2: Utworzenie struktury API route

**Cel:** Przygotowanie pliku endpointu zgodnie z konwencją Astro

**Akcje:**

1. Utwórz katalog `src/pages/api/` (jeśli nie istnieje)
2. Utwórz plik `src/pages/api/tournaments.ts`
3. Dodaj konfigurację prerender:

```typescript
// src/pages/api/tournaments.ts
export const prerender = false;
```

**Kryteria akceptacji:**

- [ ] Plik utworzony w poprawnej lokalizacji
- [ ] Eksportuje `prerender = false`

### Krok 3: Implementacja GET handler

**Cel:** Implementacja głównej logiki endpointu

**Akcje:**

1. Zaimportuj wymagane typy i service:

```typescript
import type { APIContext } from "astro";
import { tournamentService } from "@/lib/services/tournament.service";
```

2. Implementuj funkcję `GET`:

```typescript
export async function GET(context: APIContext): Promise<Response> {
  // 1. Guard clause: Weryfikacja uwierzytelnienia
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

  // 2. Happy path: Pobranie turniejów
  try {
    const tournaments = await tournamentService.getAllTournaments(context.locals.supabase);

    return new Response(JSON.stringify({ data: tournaments }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // 1h cache
      },
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

**Kryteria akceptacji:**

- [ ] Funkcja `GET` eksportowana jako named export
- [ ] Guard clause na początku sprawdza uwierzytelnienie
- [ ] Zwraca 401 dla nieuwierzytelnionych requestów
- [ ] Używa `tournamentService.getAllTournaments()`
- [ ] Zwraca 200 z danymi w formacie `{ data: TournamentDTO[] }`
- [ ] Obsługuje błędy przez try-catch
- [ ] Zwraca 500 dla błędów serwera
- [ ] Loguje błędy do console
- [ ] Ustawia odpowiednie nagłówki Content-Type i Cache-Control

### Krok 4: Testowanie manualne

**Cel:** Weryfikacja działania endpointu w różnych scenariuszach

**Akcje:**

1. **Test 1: Request bez uwierzytelnienia**

   ```bash
   curl -X GET http://localhost:3000/api/tournaments
   ```

   Oczekiwany wynik: 401 + `{ "error": "Authentication required" }`

2. **Test 2: Request z prawidłowym tokenem**

   ```bash
   curl -X GET http://localhost:3000/api/tournaments \
     -H "Authorization: Bearer <valid_token>"
   ```

   Oczekiwany wynik: 200 + `{ "data": [ {...}, {...} ] }`

3. **Test 3: Weryfikacja struktury danych**
   - Sprawdzić czy każdy turniej ma pola: `id`, `name`, `api_tournament_id`
   - Sprawdzić czy turnieje są posortowane alfabetycznie

4. **Test 4: Pustą bazę danych**
   - Usunąć wszystkie turnieje z tabeli (w środowisku dev)
   - Sprawdzić czy endpoint zwraca pustą tablicę: `{ "data": [] }`

**Kryteria akceptacji:**

- [ ] Test 1 przechodzi pomyślnie (401)
- [ ] Test 2 przechodzi pomyślnie (200)
- [ ] Test 3: Struktura danych jest poprawna
- [ ] Test 4: Pusta tablica zwracana poprawnie

### Krok 5: Testowanie integracyjne (opcjonalne)

**Cel:** Automatyczne testy dla endpointu

**Akcje:**

1. Utwórz plik testowy: `src/pages/api/__tests__/tournaments.test.ts`
2. Implementuj testy jednostkowe dla:
   - Sprawdzenia odpowiedzi 401 bez tokenu
   - Sprawdzenia odpowiedzi 200 z tokenem
   - Sprawdzenia struktury danych w odpowiedzi
   - Sprawdzenia sortowania wyników

**Przykładowa struktura testu:**

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { GET } from "../tournaments";

describe("GET /api/tournaments", () => {
  it("should return 401 without authentication", async () => {
    // Test implementation
  });

  it("should return 200 with valid authentication", async () => {
    // Test implementation
  });

  it("should return tournaments sorted by name", async () => {
    // Test implementation
  });
});
```

**Uwaga:** Implementacja testów wykracza poza zakres minimalnego MVP. Rekomendowane dla przyszłych iteracji.

**Kryteria akceptacji:**

- [ ] Plik testowy utworzony (opcjonalnie)
- [ ] Testy pokrywają główne scenariusze (opcjonalnie)

### Krok 6: Dokumentacja i code review

**Cel:** Zapewnienie jakości kodu i dokumentacji

**Akcje:**

1. **Code review checklist:**
   - [ ] Kod zgodny z ESLint rules
   - [ ] Kod sformatowany przez Prettier
   - [ ] Brak typów `any`
   - [ ] Wszystkie funkcje mają JSDoc
   - [ ] Guard clauses na początku funkcji
   - [ ] Error handling zgodny z zasadami projektu

2. **Dokumentacja:**
   - [ ] Zaktualizować `README.md` (jeśli potrzeba)
   - [ ] Dodać endpoint do listy dostępnych API routes
   - [ ] Dokumentować publiczny API w kodzie (JSDoc)

3. **Security review:**
   - [ ] RLS policies działają poprawnie
   - [ ] Brak SQL injection vectors
   - [ ] Uwierzytelnienie jest wymagane
   - [ ] Nie wycieka wrażliwych informacji w błędach

**Kryteria akceptacji:**

- [ ] Kod przechodzi code review
- [ ] Wszystkie checklist items zaznaczone
- [ ] Dokumentacja zaktualizowana

### Krok 7: Deployment i monitoring

**Cel:** Wdrożenie na produkcję i monitorowanie

**Akcje:**

1. **Pre-deployment:**
   - [ ] Uruchomić `npm run build` i sprawdzić błędy kompilacji
   - [ ] Uruchomić `npm run lint` i naprawić wszystkie błędy
   - [ ] Sprawdzić zmienne środowiskowe na produkcji

2. **Deployment:**
   - [ ] Zmergować branch do `main`
   - [ ] Wdrożyć na środowisko produkcyjne
   - [ ] Sprawdzić logi deploymentu

3. **Post-deployment verification:**
   - [ ] Wykonać smoke test na produkcji
   - [ ] Sprawdzić response time w narzędziach monitoringu
   - [ ] Obserwować logi błędów (pierwsze 24h)

4. **Monitoring metrics:**
   - Response time (target: < 200ms)
   - Error rate (target: < 0.1%)
   - Request volume
   - Cache hit rate (jeśli caching włączony)

**Kryteria akceptacji:**

- [ ] Endpoint działa na produkcji
- [ ] Metryki w akceptowalnym zakresie
- [ ] Brak krytycznych błędów w logach

## 10. Checklist końcowy

### Przed rozpoczęciem implementacji

- [ ] Plan implementacji przeczytany i zrozumiany
- [ ] Środowisko deweloperskie skonfigurowane
- [ ] Dostęp do bazy danych testowej

### Podczas implementacji

- [ ] Service layer utworzony i przetestowany
- [ ] API endpoint utworzony zgodnie z konwencją
- [ ] Handler GET zaimplementowany z obsługą błędów
- [ ] Testy manualne przeprowadzone i zakończone sukcesem
- [ ] Kod zgodny z ESLint i Prettier
- [ ] Code review przeprowadzony

### Po implementacji

- [ ] Dokumentacja zaktualizowana
- [ ] Endpoint wdrożony na produkcję
- [ ] Monitoring skonfigurowany
- [ ] Metryki w akceptowalnym zakresie
- [ ] Plan implementacji zarchiwizowany

## 11. Załączniki

### A. Przykładowe zapytania cURL

**Request z uwierzytelnieniem:**

```bash
curl -X GET "http://localhost:3000/api/tournaments" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept: application/json"
```

**Request bez uwierzytelnienia:**

```bash
curl -X GET "http://localhost:3000/api/tournaments" \
  -H "Accept: application/json"
```

### B. Przykładowa struktura odpowiedzi

**Sukces (200):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "FIFA World Cup 2026",
      "api_tournament_id": 1
    },
    {
      "id": 3,
      "name": "Premier League",
      "api_tournament_id": 39
    },
    {
      "id": 2,
      "name": "UEFA Champions League",
      "api_tournament_id": 2
    }
  ]
}
```

**Błąd (401):**

```json
{
  "error": "Authentication required"
}
```

**Błąd (500):**

```json
{
  "error": "Internal server error"
}
```

### C. RLS Policy SQL

```sql
-- Włączenie RLS na tabeli tournaments
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Policy pozwalająca odczyt dla uwierzytelnionych użytkowników
CREATE POLICY "tournaments_select_authenticated" ON tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- Weryfikacja policies
SELECT * FROM pg_policies WHERE tablename = 'tournaments';
```

### D. Przydatne komendy SQL do testowania

**Sprawdzenie listy turniejów:**

```sql
SELECT id, name, api_tournament_id
FROM tournaments
ORDER BY name ASC;
```

**Dodanie przykładowych turniejów:**

```sql
INSERT INTO tournaments (name, api_tournament_id) VALUES
  ('UEFA Champions League', 2),
  ('FIFA World Cup 2026', 1),
  ('Premier League', 39),
  ('La Liga', 140);
```

**Wyczyszczenie tabeli (tylko dev):**

```sql
TRUNCATE TABLE tournaments RESTART IDENTITY CASCADE;
```

### E. TypeScript type guards (opcjonalnie)

```typescript
// src/lib/utils/type-guards.ts

import type { TournamentDTO } from "@/types";

export function isTournamentDTO(obj: unknown): obj is TournamentDTO {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    typeof obj.id === "number" &&
    "name" in obj &&
    typeof obj.name === "string" &&
    "api_tournament_id" in obj &&
    (obj.api_tournament_id === null || typeof obj.api_tournament_id === "number")
  );
}

export function isTournamentDTOArray(arr: unknown): arr is TournamentDTO[] {
  return Array.isArray(arr) && arr.every(isTournamentDTO);
}
```

**Użycie w service:**

```typescript
const data = await supabase.from("tournaments").select("id, name, api_tournament_id");

if (!isTournamentDTOArray(data)) {
  throw new Error("Invalid data format from database");
}

return data;
```

---

**Status dokumentu:** ✅ Gotowy do implementacji  
**Wersja:** 1.0  
**Data utworzenia:** 2025-11-06  
**Ostatnia aktualizacja:** 2025-11-06  
**Autor:** AI Architecture Assistant
