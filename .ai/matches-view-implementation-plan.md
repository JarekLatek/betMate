# Plan implementacji widoku Mecze (Ekran Główny)

## 1. Przegląd

Widok "Mecze" stanowi ekran główny aplikacji (`/`). Jego głównym celem jest umożliwienie użytkownikom przeglądania listy meczów w ramach wybranych turniejów oraz obstawiania ich wyników. Widok obsługuje filtrowanie meczów (nadchodzące/zakończone), zmianę kontekstu turnieju oraz interaktywne obstawianie z uwzględnieniem blokady czasowej przed rozpoczęciem spotkania.

## 2. Routing widoku

- **Ścieżka:** `/`
- **Parametry opcjonalne (Query Params):**
  - `tournamentId`: ID wybranego turnieju (domyślnie pierwszy aktywny lub ostatnio wybrany).

## 3. Struktura komponentów

Hierarchia komponentów React (renderowanych wewnątrz strony Astro):

```
MatchesView (Container)
├── HeaderSection
│   ├── TournamentSelector (Select/Dropdown)
│   └── MatchListFilters (Segmented Control: Nadchodzące | Zakończone)
├── MatchList (Scrollable List)
│   ├── MatchCard (Repeated Item)
│   │   ├── MatchHeader (Date/Time, Status)
│   │   ├── TeamsDisplay (Home vs Away logos & names)
│   │   └── InteractionArea
│   │       ├── BettingControls (Buttons 1, X, 2 - dla nadchodzących)
│   │       └── MatchResult (Score & Bet Status - dla zakończonych)
│   └── InfiniteScrollTrigger (Loader)
└── Toast (Notifications)
```

## 4. Szczegóły komponentów

### `MatchesView` (Smart Component)

- **Opis:** Główny kontener zarządzający stanem widoku (wybrany turniej, filtr statusu, lista meczów).
- **Główne elementy:** Wrapper layoutu, nagłówek z filtrami, lista wyników.
- **Obsługiwane interakcje:**
  - Zmiana turnieju -> aktualizacja URL i przeładowanie danych.
  - Zmiana filtru (Nadchodzące/Zakończone) -> przeładowanie danych.
  - Obsługa scrollowania (ładowanie kolejnych stron).
- **Zarządzanie stanem:** Przechowuje `matches`, `loading`, `filter`, `selectedTournamentId`.

### `TournamentSelector`

- **Opis:** Komponent pozwalający na wybór turnieju.
- **Główne elementy:** Komponent `Select` (Shadcn UI).
- **Propsy:**
  - `tournaments`: `TournamentDTO[]`
  - `selectedId`: `number`
  - `onSelect`: `(id: number) => void`

### `MatchListFilters`

- **Opis:** Przełącznik między nadchodzącymi a zakończonymi meczami.
- **Główne elementy:** `Tabs` lub niestandardowy Segmented Control.
- **Propsy:**
  - `activeFilter`: `'UPCOMING' | 'FINISHED'`
  - `onChange`: `(filter: 'UPCOMING' | 'FINISHED') => void`

### `MatchCard`

- **Opis:** Karta prezentująca pojedynczy mecz.
- **Główne elementy:**
  - Górna belka: Data, godzina, status (np. "Dziś, 20:45").
  - Środek: Loga i nazwy drużyn (Gospodarz vs Gość).
  - Dół: Komponent `BettingControls` lub `MatchResult`.
- **Logika:**
  - Oblicza, czy zakład jest zablokowany (`isLocked`): `now > match_datetime - 5 min`.
  - Wyświetla kłódkę, jeśli zablokowane.
- **Propsy:**
  - `match`: `MatchDTO`
  - `onBet`: `(matchId: number, prediction: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN') => Promise<void>`

### `BettingControls`

- **Opis:** Trzy przyciski do obstawiania (1, X, 2).
- **Główne elementy:** Button group.
- **Stany wizualne:**
  - `Selected`: Wyróżniony kolor (np. primary).
  - `Disabled`: Wyszarzony (gdy `isLocked` lub mecz trwa/zakończony).
  - `Loading`: Spinner podczas zapisywania.
- **Propsy:**
  - `currentPrediction`: `'HOME_WIN' | 'DRAW' | 'AWAY_WIN' | null`
  - `isLocked`: `boolean`
  - `onSelect`: `(prediction: string) => void`

### `MatchResult`

- **Opis:** Wyświetla wynik meczu i informację o trafieniu/pudle użytkownika.
- **Główne elementy:** Wynik (np. "2 : 1"), Ikona statusu (Zielony check / Szary krzyżyk).
- **Propsy:**
  - `homeScore`: `number`
  - `awayScore`: `number`
  - `userPrediction`: `string | null`
  - `actualResult`: `string`

## 5. Typy

Należy zdefiniować lub rozszerzyć typy w `src/types.ts`:

```typescript
// Enums
export type MatchStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED" | "POSTPONED" | "CANCELED";
export type BetResult = "HOME_WIN" | "DRAW" | "AWAY_WIN";

// DTOs
export interface TournamentDTO {
  id: number;
  name: string;
}

export interface UserBetDTO {
  id: number;
  picked_result: BetResult;
}

export interface MatchDTO {
  id: number;
  tournament_id: number;
  home_team: string; // lub obiekt z logo
  away_team: string; // lub obiekt z logo
  match_datetime: string; // ISO 8601
  status: MatchStatus;
  home_score?: number | null;
  away_score?: number | null;
  user_bet?: UserBetDTO | null;
}

// View Models / Props
export interface MatchesFetchParams {
  tournament_id?: number;
  status?: "UPCOMING" | "FINISHED"; // Mapuje na odpowiednie statusy API
  page?: number;
}
```

## 6. Zarządzanie stanem

Zalecane użycie niestandardowego hooka `useMatches` w `MatchesView`:

- **Stan:**
  - `matches`: Tablica `MatchDTO`.
  - `isLoading`: Boolean.
  - `error`: Error | null.
  - `page`: Numer strony do paginacji.
  - `hasMore`: Czy są kolejne strony.
- **Akcje:**
  - `fetchMatches(filters)`: Pobiera dane z API.
  - `loadMore()`: Pobiera kolejną stronę i dokleja do listy.
  - `updateMatchBet(matchId, bet)`: Aktualizuje lokalny stan meczu po obstawieniu (Optimistic UI).

## 7. Integracja API

### Pobieranie meczów

- **Endpoint:** `GET /api/matches`
- **Parametry:**
  - `tournament_id`: Z wybranego selektora.
  - `status`: Jeśli filtr 'UPCOMING' -> `SCHEDULED,IN_PLAY`. Jeśli 'FINISHED' -> `FINISHED`.
  - `limit`: np. 20.
  - `offset`: `page * limit`.
- **Mapowanie:** Odpowiedź API zawiera pole `user_bet`, które należy uwzględnić w stanie.

### Obstawianie

- **Endpoint:** `POST /api/bets` (lub `PUT` jeśli edycja, backend powinien obsłużyć upsert).
- **Body:** `{ match_id: number, picked_result: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' }`.
- **Obsługa:** Po sukcesie aktualizujemy stan lokalny. W przypadku błędu (np. "Time limit exceeded") cofamy zmianę i wyświetlamy Toast.

## 8. Interakcje użytkownika

1. **Wybór turnieju:** Użytkownik klika w dropdown -> Lista meczów się odświeża.
2. **Zmiana zakładki (Nadchodzące/Zakończone):** Lista się czyści i ładują się odpowiednie mecze.
3. **Obstawienie (Kliknięcie 1, X lub 2):**
   - Sprawdzenie warunku czasu (> 5 min).
   - Jeśli OK: Przycisk zmienia stan na "wybrany" natychmiast (Optimistic).
   - Wywołanie API w tle.
   - Jeśli API zwróci błąd: Toast z błędem, przycisk wraca do poprzedniego stanu.
4. **Próba edycji zablokowanego meczu:**
   - Kliknięcie w zablokowany przycisk (kłódka).
   - Wyświetlenie Toast: "Zakłady na ten mecz są już zamknięte".

## 9. Warunki i walidacja

- **Blokada czasowa:**
  - Warunek: `CurrentTime >= MatchTime - 5 minutes`.
  - Efekt: Przyciski obstawiania są `disabled`, pojawia się ikona kłódki.
- **Status meczu:**
  - Jeśli status to `POSTPONED` lub `CANCELED`, wyświetlamy odpowiedni komunikat na karcie, brak możliwości obstawiania.
- **Walidacja API:**
  - Backend zwraca 400, jeśli próba obstawienia nastąpi po czasie. Frontend musi obsłużyć ten błąd.

## 10. Obsługa błędów

- **Błąd ładowania listy:** Wyświetlenie komponentu "ErrorState" z przyciskiem "Spróbuj ponownie".
- **Brak meczów:** Wyświetlenie "EmptyState" (np. "Brak nadchodzących meczów w tym turnieju").
- **Błąd obstawiania:** Toast (Shadcn UI) z komunikatem błędu (np. "Nie udało się zapisać typu").

## 11. Kroki implementacji

1. **Przygotowanie typów:** Zaktualizuj `src/types.ts` o definicje DTO dla meczów i zakładów.
2. **Warstwa API:** Stwórz funkcje pomocnicze w `src/lib/services/matches.service.ts` (frontend fetch wrappers) do pobierania meczów i wysyłania zakładów.
3. **Komponenty UI (Atomowe):**
   - Zaimplementuj `TournamentSelector` używając komponentów UI.
   - Zaimplementuj `BettingControls` (logika wizualna).
4. **Komponent MatchCard:**
   - Złóż kartę meczu.
   - Dodaj logikę blokady czasowej (`isLocked`).
   - Podepnij `BettingControls`.
5. **Logika biznesowa (Hook):**
   - Stwórz `useMatches` do obsługi pobierania i paginacji.
   - Stwórz `useBetting` do obsługi akcji obstawiania z optymistyczną aktualizacją.
6. **Widok główny (MatchesView):**
   - Złóż całość w jeden widok.
   - Podepnij stan filtrów i turnieju.
7. **Integracja ze stroną Astro:**
   - Zaimportuj `MatchesView` w `src/pages/index.astro`.
   - Upewnij się, że jest renderowany z dyrektywą `client:load` (lub `client:visible`), ponieważ wymaga interakcji.
