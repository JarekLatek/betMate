# Plan implementacji widoku Leaderboard

## 1. Przegląd

Widok Leaderboard (Ranking) służy do prezentacji publicznej tabeli wyników użytkowników w ramach wybranego turnieju. Wyświetla pozycję, nazwę użytkownika i liczbę zdobytych punktów. Kluczowym elementem UX jest sticky footer z wynikiem zalogowanego użytkownika, który jest zawsze widoczny bez konieczności przewijania. Widok obsługuje paginację oraz przełączanie między turniejami.

## 2. Routing widoku

- **Ścieżka**: `/leaderboard`
- **Query Parameters**: `?tournamentId=<number>` (opcjonalny)
- **Typ strony**: Astro page z komponentem React (`client:load`)
- **Dostęp**: Tylko dla zalogowanych użytkowników (przekierowanie na `/login` dla niezalogowanych)

## 3. Struktura komponentów

```
LeaderboardPage.astro
└── LeaderboardView (React, client:load)
    ├── TournamentSelector (istniejący komponent)
    ├── LeaderboardTable
    │   ├── LeaderboardHeader
    │   └── LeaderboardRow (mapowany dla każdego wpisu)
    ├── StickyUserRow
    └── LoadMoreButton
```

## 4. Szczegóły komponentów

### LeaderboardPage.astro

- **Opis**: Strona Astro odpowiedzialna za routing, sprawdzenie autoryzacji i przekazanie początkowych danych do komponentu React.
- **Główne elementy**: Layout strony, komponent `LeaderboardView` z dyrektywą `client:load`
- **Obsługiwane interakcje**: Brak (statyczna warstwa)
- **Walidacja**: Sprawdzenie sesji użytkownika w middleware, przekierowanie na `/login` jeśli niezalogowany
- **Typy**: `TournamentDTO[]`, `User` z Supabase Auth
- **Propsy**: Brak (strona główna)

### LeaderboardView

- **Opis**: Główny komponent React zarządzający stanem widoku, pobieraniem danych i koordynacją podkomponentów. Odpowiada za wybór turnieju, paginację i wyświetlanie rankingu.
- **Główne elementy**:
  - `TournamentSelector` - wybór turnieju
  - `LeaderboardTable` - tabela z rankingiem
  - `StickyUserRow` - przypięty wiersz użytkownika
  - `LoadMoreButton` - przycisk ładowania kolejnych wyników
  - Stany ładowania i błędów
- **Obsługiwane interakcje**:
  - Zmiana turnieju (onTournamentChange)
  - Ładowanie kolejnych wyników (onLoadMore)
  - Odświeżenie danych (onRefresh)
- **Walidacja**: Sprawdzenie czy `tournamentId` jest poprawną liczbą całkowitą dodatnią
- **Typy**: `LeaderboardViewProps`, `LeaderboardResponseDTO`, `TournamentDTO[]`
- **Propsy**:
  ```typescript
  interface LeaderboardViewProps {
    initialTournaments?: TournamentDTO[];
    initialTournamentId?: number | null;
    currentUserId: string;
  }
  ```

### LeaderboardTable

- **Opis**: Komponent tabeli wyświetlający listę użytkowników w rankingu. Odpowiada za renderowanie nagłówka i wierszy z danymi.
- **Główne elementy**:
  - Element `<table>` z rolą ARIA
  - `LeaderboardHeader` - nagłówek tabeli
  - Lista `LeaderboardRow` - wiersze z danymi użytkowników
- **Obsługiwane interakcje**: Brak (prezentacja danych)
- **Walidacja**: Brak
- **Typy**: `LeaderboardEntryDTO[]`, `string` (currentUserId)
- **Propsy**:
  ```typescript
  interface LeaderboardTableProps {
    entries: LeaderboardEntryDTO[];
    currentUserId: string;
    isLoading?: boolean;
  }
  ```

### LeaderboardHeader

- **Opis**: Nagłówek tabeli z nazwami kolumn: Pozycja, Użytkownik, Punkty.
- **Główne elementy**: Element `<thead>` z komórkami `<th>`
- **Obsługiwane interakcje**: Brak
- **Walidacja**: Brak
- **Typy**: Brak
- **Propsy**: Brak

### LeaderboardRow

- **Opis**: Pojedynczy wiersz tabeli reprezentujący użytkownika w rankingu. Wyróżnia wiersz zalogowanego użytkownika kolorem tła.
- **Główne elementy**: Element `<tr>` z komórkami `<td>` (pozycja, nazwa użytkownika, punkty)
- **Obsługiwane interakcje**: Brak
- **Walidacja**: Brak
- **Typy**: `LeaderboardEntryDTO`, `boolean` (isCurrentUser)
- **Propsy**:
  ```typescript
  interface LeaderboardRowProps {
    entry: LeaderboardEntryDTO;
    isCurrentUser: boolean;
  }
  ```

### StickyUserRow

- **Opis**: Przypięty wiersz na dole ekranu wyświetlający pozycję i punkty zalogowanego użytkownika. Widoczny tylko gdy użytkownik ma wpis w rankingu i nie jest aktualnie widoczny w tabeli.
- **Główne elementy**: Element `<div>` z pozycjonowaniem `fixed` lub `sticky` na dole ekranu
- **Obsługiwane interakcje**: Brak
- **Walidacja**: Brak
- **Typy**: `LeaderboardEntryDTO | null`
- **Propsy**:
  ```typescript
  interface StickyUserRowProps {
    userEntry: LeaderboardEntryDTO | null;
    isVisible: boolean;
  }
  ```

### LoadMoreButton

- **Opis**: Przycisk do ładowania kolejnych wyników z paginacją. Wyświetla stan ładowania.
- **Główne elementy**: Element `<button>` z ikoną i tekstem
- **Obsługiwane interakcje**: onClick - ładowanie kolejnych wyników
- **Walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  ```typescript
  interface LoadMoreButtonProps {
    onClick: () => void;
    isLoading: boolean;
    hasMore: boolean;
  }
  ```

## 5. Typy

### Istniejące typy (z `src/types.ts`)

```typescript
// Pojedynczy wpis w rankingu
interface LeaderboardEntryDTO {
  rank: number;
  user_id: string;
  username: string;
  points: number;
}

// Odpowiedź API z leaderboardem
type LeaderboardResponseDTO = PaginatedResponseDTO<LeaderboardEntryDTO> & {
  tournament: Pick<TournamentDTO, "id" | "name">;
};

// Paginacja
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Parametry zapytania
interface LeaderboardQueryParams {
  limit?: number;
  offset?: number;
}
```

### Nowe typy do utworzenia

```typescript
// src/components/leaderboard/types.ts

/**
 * Propsy głównego widoku Leaderboard
 */
interface LeaderboardViewProps {
  initialTournaments?: TournamentDTO[];
  initialTournamentId?: number | null;
  currentUserId: string;
}

/**
 * Stan widoku Leaderboard (używany w hooku)
 */
interface LeaderboardState {
  entries: LeaderboardEntryDTO[];
  tournament: Pick<TournamentDTO, "id" | "name"> | null;
  pagination: PaginationDTO | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * ViewModel dla pojedynczego wpisu (z informacją o bieżącym użytkowniku)
 */
interface LeaderboardEntryViewModel extends LeaderboardEntryDTO {
  isCurrentUser: boolean;
}

/**
 * Parametry dla funkcji API
 */
interface FetchLeaderboardParams {
  tournamentId: number;
  limit?: number;
  offset?: number;
}
```

## 6. Zarządzanie stanem

### Custom Hook: `useLeaderboard`

Hook odpowiedzialny za:
- Pobieranie danych z API leaderboard
- Zarządzanie paginacją (offset, limit)
- Obsługę stanów ładowania i błędów
- Akumulację wyników przy ładowaniu kolejnych stron
- Znajdowanie wpisu zalogowanego użytkownika

```typescript
// src/components/hooks/useLeaderboard.ts

interface UseLeaderboardOptions {
  tournamentId: number | null;
  currentUserId: string;
  limit?: number;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntryDTO[];
  tournament: Pick<TournamentDTO, "id" | "name"> | null;
  userEntry: LeaderboardEntryDTO | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Stan lokalny w `LeaderboardView`

- `tournaments: TournamentDTO[]` - lista dostępnych turniejów
- `selectedTournamentId: number | null` - ID wybranego turnieju
- `tournamentsLoading: boolean` - stan ładowania turniejów

### Przepływ danych

1. Strona Astro pobiera listę turniejów server-side i przekazuje do `LeaderboardView`
2. `LeaderboardView` inicjalizuje stan z `initialTournamentId` lub pierwszym turniejem z listy
3. Hook `useLeaderboard` pobiera dane rankingu dla wybranego turnieju
4. Przy zmianie turnieju hook resetuje stan i pobiera nowe dane
5. Przy "Załaduj więcej" hook pobiera kolejną stronę i dołącza do istniejących danych

## 7. Integracja API

### Endpoint

```
GET /api/tournaments/:tournament_id/leaderboard
```

### Funkcja API Client

```typescript
// src/lib/api/leaderboard.api.ts

import type { LeaderboardResponseDTO } from "@/types";

export interface FetchLeaderboardParams {
  tournamentId: number;
  limit?: number;
  offset?: number;
}

export async function fetchLeaderboard(params: FetchLeaderboardParams): Promise<LeaderboardResponseDTO> {
  const { tournamentId, limit = 100, offset = 0 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("limit", limit.toString());
  searchParams.set("offset", offset.toString());

  const response = await fetch(
    `/api/tournaments/${tournamentId}/leaderboard?${searchParams.toString()}`,
    { credentials: "same-origin" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Nie udało się pobrać rankingu");
  }

  return response.json();
}
```

### Typy żądania i odpowiedzi

**Request:**
- URL: `/api/tournaments/{tournament_id}/leaderboard`
- Method: `GET`
- Query params: `limit` (1-500, default 100), `offset` (>=0, default 0)
- Headers: Cookie z sesją Supabase

**Response (200 OK):**
```typescript
{
  data: LeaderboardEntryDTO[];
  pagination: PaginationDTO;
  tournament: Pick<TournamentDTO, "id" | "name">;
}
```

## 8. Interakcje użytkownika

| Interakcja | Komponent | Opis działania |
|------------|-----------|----------------|
| Wybór turnieju | TournamentSelector | Zmiana `selectedTournamentId`, reset paginacji, pobranie nowego rankingu |
| Załaduj więcej | LoadMoreButton | Inkrementacja offset, pobranie kolejnej strony, dołączenie do listy |
| Przewijanie tabeli | LeaderboardTable | Standardowe przewijanie, sticky footer pozostaje widoczny |
| Odświeżenie strony | Przeglądarka | Ponowne pobranie danych z zachowaniem wybranego turnieju (z URL) |

## 9. Warunki i walidacja

### Walidacja na poziomie widoku

| Warunek | Komponent | Efekt |
|---------|-----------|-------|
| Brak zalogowanego użytkownika | LeaderboardPage.astro | Przekierowanie na `/login` |
| Brak turniejów | LeaderboardView | Komunikat "Brak dostępnych turniejów" |
| Nieprawidłowy `tournamentId` w URL | LeaderboardView | Użycie pierwszego dostępnego turnieju |
| Błąd API | LeaderboardView | Wyświetlenie komunikatu błędu z opcją ponowienia |
| Pusty ranking | LeaderboardTable | Komunikat "Brak uczestników w tym turnieju" |

### Walidacja parametrów API (frontend)

- `tournamentId` musi być liczbą całkowitą dodatnią
- `limit` musi być w zakresie 1-500
- `offset` musi być >= 0

## 10. Obsługa błędów

### Scenariusze błędów

| Błąd | Kod HTTP | Obsługa w UI |
|------|----------|--------------|
| Brak autoryzacji | 401 | Przekierowanie na `/login` |
| Turniej nie istnieje | 404 | Komunikat "Turniej nie został znaleziony", powrót do domyślnego |
| Błędne parametry | 400 | Użycie wartości domyślnych, log błędu |
| Błąd serwera | 500 | Komunikat "Wystąpił błąd. Spróbuj ponownie.", przycisk "Odśwież" |
| Błąd sieci | - | Komunikat "Brak połączenia z serwerem", przycisk "Spróbuj ponownie" |

### Implementacja obsługi błędów

```typescript
// W komponencie LeaderboardView
{error && (
  <div className="flex flex-col items-center justify-center py-12">
    <AlertCircleIcon className="size-8 text-destructive" />
    <p className="text-muted-foreground mt-2">{error}</p>
    <Button variant="outline" onClick={refresh} className="mt-4">
      <RefreshCwIcon className="mr-2 size-4" />
      Spróbuj ponownie
    </Button>
  </div>
)}
```

## 11. Kroki implementacji

1. **Utworzenie pliku API client** (`src/lib/api/leaderboard.api.ts`)
   - Funkcja `fetchLeaderboard` z obsługą parametrów i błędów
   - Export typów `FetchLeaderboardParams`

2. **Utworzenie hooka `useLeaderboard`** (`src/components/hooks/useLeaderboard.ts`)
   - Zarządzanie stanem (entries, pagination, loading, error)
   - Funkcje `loadMore` i `refresh`
   - Logika znajdowania wpisu zalogowanego użytkownika

3. **Utworzenie komponentów prezentacyjnych** (`src/components/leaderboard/`)
   - `LeaderboardHeader.tsx` - nagłówek tabeli
   - `LeaderboardRow.tsx` - wiersz tabeli z wyróżnieniem użytkownika
   - `LeaderboardTable.tsx` - tabela z nagłówkiem i wierszami
   - `StickyUserRow.tsx` - sticky footer z wynikiem użytkownika
   - `types.ts` - typy specyficzne dla komponentów leaderboard

4. **Utworzenie głównego komponentu** (`src/components/leaderboard/LeaderboardView.tsx`)
   - Integracja wszystkich podkomponentów
   - Zarządzanie stanem turniejów
   - Obsługa stanów ładowania i błędów
   - Wykorzystanie istniejącego `TournamentSelector`

5. **Utworzenie strony Astro** (`src/pages/leaderboard.astro`)
   - Import layoutu
   - Sprawdzenie autoryzacji
   - Server-side fetch turniejów
   - Przekazanie danych do `LeaderboardView`

6. **Dodanie nawigacji do widoku**
   - Aktualizacja menu/nawigacji o link do `/leaderboard`

7. **Stylowanie komponentów**
   - Wykorzystanie Tailwind CSS
   - Responsywność (mobile-first)
   - Wyróżnienie wiersza bieżącego użytkownika
   - Sticky positioning dla `StickyUserRow`

8. **Testy manualne**
   - Weryfikacja poprawności wyświetlania rankingu
   - Test paginacji (załaduj więcej)
   - Test przełączania turniejów
   - Test sticky footer
   - Test responsywności
   - Test obsługi błędów

9. **Dostępność (a11y)**
   - Semantyczne elementy HTML (`<table>`, `<thead>`, `<tbody>`)
   - ARIA labels dla interaktywnych elementów
   - Odpowiedni kontrast kolorów dla wyróżnionego wiersza
   - Focus management dla przycisków

10. **Optymalizacja**
    - Memoizacja komponentów (`React.memo`)
    - Debouncing przy częstych zmianach
    - Lazy loading dla dużych list (opcjonalnie wirtualizacja)
