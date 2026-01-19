# Plan Testów - betMate

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy dokument definiuje kompleksowy plan testów dla aplikacji betMate - platformy do obstawiania wyników meczów piłkarskich. Plan obejmuje wszystkie warstwy aplikacji, od testów jednostkowych po testy end-to-end, uwzględniając specyfikę stosu technologicznego (Astro 5, React 19, TypeScript, Supabase).

### 1.2 Cele testowania

1. **Zapewnienie poprawności logiki biznesowej** - weryfikacja kluczowych procesów: składanie zakładów, naliczanie punktów, generowanie rankingów
2. **Weryfikacja bezpieczeństwa** - kontrola dostępu, polityki RLS, walidacja danych wejściowych
3. **Potwierdzenie integralności danych** - spójność między tabelami, obsługa transakcji współbieżnych
4. **Walidacja integracji zewnętrznych** - synchronizacja z api-football.com, komunikacja z Supabase
5. **Zapewnienie jakości UX** - responsywność, obsługa błędów, dostępność (a11y)

### 1.3 Zakres projektu

**betMate** to aplikacja webowa umożliwiająca:
- Rejestrację i autentykację użytkowników
- Przeglądanie nadchodzących meczów piłkarskich
- Składanie zakładów na wyniki meczów (przed rozpoczęciem meczu)
- Automatyczne naliczanie punktów za trafione prognozy
- Przeglądanie rankingów turniejowych
- Zarządzanie historią własnych zakładów

---

## 2. Zakres testów

### 2.1 Obszary objęte testami

| Obszar | Komponenty | Priorytet |
|--------|------------|-----------|
| **Logika zakładów** | BetService, walidacja czasowa, unikalność | Krytyczny |
| **System punktacji** | ScoringService, naliczanie punktów | Krytyczny |
| **Rankingi** | LeaderboardService, algorytm rankingu | Wysoki |
| **API Endpoints** | Wszystkie endpointy w `/api/` | Wysoki |
| **Autentykacja** | Supabase Auth, middleware, sesje | Wysoki |
| **Synchronizacja meczów** | Edge Function sync-matches | Średni |
| **Frontend** | Komponenty React, hooki, formularze | Średni |
| **Walidacja danych** | Schematy Zod | Średni |

### 2.2 Obszary wyłączone z testów

- Wewnętrzna implementacja Supabase (baza danych, auth)
- Zewnętrzne API (api-football.com) - tylko mockowanie odpowiedzi
- Infrastruktura CI/CD (GitHub Actions, DigitalOcean)
- Komponenty biblioteki Shadcn/ui (testowane przez twórców)

---

## 3. Typy testów

### 3.1 Testy jednostkowe (Unit Tests)

**Cel:** Weryfikacja izolowanych jednostek kodu - serwisów, funkcji pomocniczych, walidatorów.

**Narzędzia:** Vitest, Testing Library

**Pokrycie:**

| Moduł | Pliki docelowe | Priorytet |
|-------|----------------|-----------|
| BetService | `src/lib/services/bet.service.ts` | Krytyczny |
| ScoringService | `src/lib/services/scoring.service.ts` | Krytyczny |
| LeaderboardService | `src/lib/services/leaderboard.service.ts` | Wysoki |
| MatchesService | `src/lib/services/matches.service.ts` | Wysoki |
| TournamentService | `src/lib/services/tournament.service.ts` | Średni |
| Walidatory Zod | `src/lib/validation/*.ts` | Wysoki |
| Error Mapper | `src/lib/utils/error-mapper.ts` | Średni |
| Bet Utils | `src/lib/utils/bet-utils.ts` | Wysoki |

#### 3.1.1 Unit Tests - BetService

**Cel:** Weryfikacja logiki biznesowej serwisu zakładów w izolacji od bazy danych.

**Strategia mockowania:**
- Mockowanie `SupabaseClient` z kontrolowanymi odpowiedziami
- Mockowanie `Date` dla testów walidacji czasowej
- Testowanie wszystkich ścieżek błędów i edge cases

**Test Cases:**

##### TC-BET-UNIT-001: createBet() - Poprawne utworzenie zakładu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca sukces |
| **Kroki** | 1. Wywołanie `createBet(userId, command)` |
| **Oczekiwany rezultat** | Zwrócony obiekt BetEntity z poprawnym mapowaniem pól |
| **Dane testowe** | `userId: "user-123"`, `command: { match_id: 1, picked_result: "HOME_WIN" }` |

##### TC-BET-UNIT-002: createBet() - Propagacja błędu z bazy danych

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca error (constraint violation) |
| **Kroki** | 1. Wywołanie `createBet()` |
| **Oczekiwany rezultat** | Error z Supabase zostaje przekazany (thrown) |
| **Dane testowe** | Error z kodem `23505` (unique violation) |

##### TC-BET-UNIT-003: updateBet() - Zakład nie istnieje

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca error PGRST116 (not found) |
| **Kroki** | 1. Wywołanie `updateBet(999, userId, command)` |
| **Oczekiwany rezultat** | `{ success: false, error: "Bet not found", status: 404 }` |

##### TC-BET-UNIT-004: updateBet() - Zakład należy do innego użytkownika

| Element | Opis |
|---------|------|
| **Warunek wstępny** | RLS policy blokuje dostęp (PGRST116) |
| **Kroki** | 1. Wywołanie `updateBet(betId, "different-user", command)` |
| **Oczekiwany rezultat** | `{ success: false, error: "Bet not found", status: 404 }` |

##### TC-BET-UNIT-005: updateBet() - Mecz nie ma statusu SCHEDULED

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca zakład z meczem o statusie `IN_PLAY` |
| **Kroki** | 1. Wywołanie `updateBet()` |
| **Oczekiwany rezultat** | `{ success: false, error: "Cannot modify this bet", reason: "Match is not scheduled", status: 403 }` |

##### TC-BET-UNIT-006: updateBet() - Mecz rozpoczyna się za mniej niż 5 minut

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca mecz o `match_datetime` za 4 minuty, mockowany `Date.now()` |
| **Kroki** | 1. Wywołanie `updateBet()` |
| **Oczekiwany rezultat** | `{ success: false, error: "Cannot modify this bet", reason: "Match starts in less than 5 minutes", status: 403 }` |

##### TC-BET-UNIT-007: updateBet() - Edge case: dokładnie 5 minut przed meczem

| Element | Opis |
|---------|------|
| **Warunek wstępny** | `match_datetime - now = 300000ms` (dokładnie 5 minut) |
| **Kroki** | 1. Wywołanie `updateBet()` |
| **Oczekiwany rezultat** | `{ success: false, status: 403 }` - warunek `<=` w linii 147 |
| **Uwaga** | Weryfikacja granicznego warunku w logice biznesowej |

##### TC-BET-UNIT-008: updateBet() - Edge case: 5 minut i 1ms przed meczem

| Element | Opis |
|---------|------|
| **Warunek wstępny** | `match_datetime - now = 300001ms` |
| **Kroki** | 1. Wywołanie `updateBet()` |
| **Oczekiwany rezultat** | `{ success: true, data: updatedBet }` - zakład zaktualizowany |

##### TC-BET-UNIT-009: updateBet() - Poprawna aktualizacja

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz SCHEDULED, >5 min do rozpoczęcia, zakład należy do użytkownika |
| **Kroki** | 1. Wywołanie `updateBet()` ze zmienionym `picked_result` |
| **Oczekiwany rezultat** | `{ success: true, data: BetEntity }` z nowym `picked_result` |

##### TC-BET-UNIT-010: updateBet() - Nieoczekiwany błąd w catch block

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock rzuca niestandardowy exception |
| **Kroki** | 1. Wywołanie `updateBet()` |
| **Oczekiwany rezultat** | `{ success: false, error: "Internal server error", status: 500 }` |

##### TC-BET-UNIT-011: deleteBet() - Mecz nie ma statusu SCHEDULED

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca zakład z meczem o statusie `FINISHED` |
| **Kroki** | 1. Wywołanie `deleteBet(betId, userId)` |
| **Oczekiwany rezultat** | `{ success: false, error: "Cannot delete this bet", reason: "Match is not scheduled", status: 403 }` |

##### TC-BET-UNIT-012: deleteBet() - Mecz rozpoczyna się za mniej niż 5 minut

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca mecz za 3 minuty |
| **Kroki** | 1. Wywołanie `deleteBet()` |
| **Oczekiwany rezultat** | `{ success: false, error: "Cannot delete this bet", reason: "Match starts in less than 5 minutes", status: 403 }` |

##### TC-BET-UNIT-013: deleteBet() - Poprawne usunięcie

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Wszystkie warunki spełnione, mock zwraca sukces |
| **Kroki** | 1. Wywołanie `deleteBet()` |
| **Oczekiwany rezultat** | `{ success: true }` |

##### TC-BET-UNIT-014: getUserBets() - Podstawowe pobranie bez filtrów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca listę zakładów z zagnieżdżonymi meczami |
| **Kroki** | 1. Wywołanie `getUserBets(userId, {})` |
| **Oczekiwany rezultat** | `{ data: BetWithMatchDTO[], pagination: { total, limit: 50, offset: 0, has_more } }` |

##### TC-BET-UNIT-015: getUserBets() - Filtrowanie po tournament_id

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock ma zakłady z różnych turniejów |
| **Kroki** | 1. Wywołanie `getUserBets(userId, { tournament_id: 1 })` |
| **Oczekiwany rezultat** | Query builder zawiera `.eq("match.tournament_id", 1)` |
| **Weryfikacja** | Spy na metodzie `.eq()` Supabase mocka |

##### TC-BET-UNIT-016: getUserBets() - Filtrowanie po match_id

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock ma zakłady na różne mecze |
| **Kroki** | 1. Wywołanie `getUserBets(userId, { match_id: 42 })` |
| **Oczekiwany rezultat** | Query builder zawiera `.eq("match_id", 42)` |

##### TC-BET-UNIT-017: getUserBets() - Kombinacja filtrów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Zakłady na różne mecze i turnieje |
| **Kroki** | 1. Wywołanie `getUserBets(userId, { tournament_id: 1, match_id: 42 })` |
| **Oczekiwany rezultat** | Oba filtry zastosowane (`.eq()` wywołane dwukrotnie) |

##### TC-BET-UNIT-018: getUserBets() - Kalkulacja has_more = true

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca `count: 100`, parametry `limit: 50, offset: 0` |
| **Kroki** | 1. Wywołanie `getUserBets()` |
| **Oczekiwany rezultat** | `pagination.has_more === true` (0 + 50 < 100) |

##### TC-BET-UNIT-019: getUserBets() - Kalkulacja has_more = false

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca `count: 100`, parametry `limit: 50, offset: 50` |
| **Kroki** | 1. Wywołanie `getUserBets()` |
| **Oczekiwany rezultat** | `pagination.has_more === false` (50 + 50 = 100) |

##### TC-BET-UNIT-020: getUserBets() - Edge case: ostatnia strona z resztą

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca `count: 75`, parametry `limit: 50, offset: 50` |
| **Kroki** | 1. Wywołanie `getUserBets()` |
| **Oczekiwany rezultat** | `pagination: { total: 75, has_more: false }`, `data.length <= 25` |

##### TC-BET-UNIT-021: getUserBets() - Obsługa błędu bazy danych

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca error |
| **Kroki** | 1. Wywołanie `getUserBets()` |
| **Oczekiwany rezultat** | Rzucony Error z message "Failed to fetch bets" |
| **Weryfikacja** | Log w konsoli zawiera szczegóły błędu (linia 372-378) |

##### TC-BET-UNIT-022: getUserBets() - Domyślne wartości parametrów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | - |
| **Kroki** | 1. Wywołanie `getUserBets(userId, {})` bez limit/offset |
| **Oczekiwany rezultat** | Query używa `.range(0, 49)` (limit=50, offset=0) |

**Metryki pokrycia:**
- **Branch coverage:** 100% (wszystkie ścieżki if/else)
- **Line coverage:** ~95% (pominięte tylko logi konsoli)
- **Edge cases:** Granice czasowe (5 min), paginacja (ostatnia strona), puste wyniki

**Uwagi implementacyjne:**
1. Użyć `vi.spyOn()` do monitorowania wywołań query buildera Supabase
2. Mockować `Date` za pomocą `vi.useFakeTimers()` dla testów walidacji czasowej
3. Testować type casting w liniach 126-130 i 262-266 (match object)
4. Weryfikować logi konsoli w testach błędów (linie 99, 169, 235, 297, 310, 372)

#### 3.1.2 Unit Tests - ScoringService

**Cel:** Weryfikacja logiki naliczania punktów za trafione prognozy w izolacji od bazy danych.

**Strategia mockowania:**
- Mockowanie `SupabaseClient` z kontrolowanymi odpowiedziami dla wszystkich operacji DB
- Testowanie wszystkich ścieżek błędów i edge cases
- Weryfikacja wywołań metod Supabase (liczba, parametry, kolejność)
- Mockowanie scenariuszy: puste wyniki, błędy bazy, wielokrotne mecze

**Test Cases:**

##### TC-SCORE-UNIT-001: scoreMatches() - Brak meczów do zescorowania

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `getUnscoredMatches()` zwraca pustą tablicę |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 0, updated_scores: 0, errors: [] }` |
| **Weryfikacja** | `upsertScore()` i `markMatchAsScored()` nie zostają wywołane |

##### TC-SCORE-UNIT-002: scoreMatches() - Jeden mecz, wszystkie zakłady poprawne

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 1 mecz (`result: "HOME_WIN"`), 3 zakłady z `picked_result: "HOME_WIN"` |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 1, updated_scores: 3, errors: [] }` |
| **Weryfikacja** | `upsertScore()` wywołane 3 razy z `POINTS_FOR_CORRECT_BET = 3` |
| **Dane testowe** | Match: `{ id: 1, tournament_id: 10, result: "HOME_WIN" }` <br> Bets: `[{ id: 1, user_id: "u1", picked_result: "HOME_WIN" }, ...]` |

##### TC-SCORE-UNIT-003: scoreMatches() - Jeden mecz, mieszane wyniki

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 1 mecz (`result: "DRAW"`), 5 zakładów: 2x DRAW, 2x HOME_WIN, 1x AWAY_WIN |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 1, updated_scores: 2, errors: [] }` |
| **Weryfikacja** | `upsertScore()` wywołane tylko 2 razy (dla zakładów z DRAW) |

##### TC-SCORE-UNIT-004: scoreMatches() - Wiele meczów, różne turnieje

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 3 mecze z różnych turniejów (tournament_id: 1, 2, 1) |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `processed_matches: 3`, punkty dodane do odpowiednich turniejów |
| **Weryfikacja** | `upsertScore()` wywołane z poprawnymi `tournament_id` dla każdego zakładu |

##### TC-SCORE-UNIT-005: scoreMatches() - Tryb dryRun = true

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 2 mecze z zakładami do zescorowania |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase, dryRun = true)` |
| **Oczekiwany rezultat** | `{ processed_matches: 2, updated_scores: X, errors: [] }` z poprawnymi statystykami |
| **Weryfikacja** | `upsertScore()` NIE zostaje wywołane, `markMatchAsScored()` NIE zostaje wywołane |
| **Uwaga** | Tylko analiza, brak zapisu do bazy |

##### TC-SCORE-UNIT-006: scoreMatches() - Tryb dryRun = false (domyślny)

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 1 mecz z 1 poprawnym zakładem |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` bez drugiego parametru |
| **Oczekiwany rezultat** | `{ processed_matches: 1, updated_scores: 1, errors: [] }` |
| **Weryfikacja** | `upsertScore()` i `markMatchAsScored()` zostają wywołane |

##### TC-SCORE-UNIT-007: scoreMatches() - Błąd w jednym meczu, kontynuacja przetwarzania

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 3 mecze, `getBetsForMatch()` rzuca błąd dla meczu #2 |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 2, updated_scores: X, errors: ["Failed to fetch bets for match 2: ..."] }` |
| **Weryfikacja** | Mecze #1 i #3 przetworzone pomyślnie, błąd w `errors` array |

##### TC-SCORE-UNIT-008: scoreMatches() - Błąd w upsertScore, kontynuacja

| Element | Opis |
|---------|------|
| **Warunek wstępny** | `upsertScore()` rzuca błąd dla jednego użytkownika |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | Błąd dodany do `errors`, pozostałe zakłady przetworzone |
| **Weryfikacja** | Pętla nie przerywa się, wszystkie mecze w `unscoredMatches` przetwarzane |

##### TC-SCORE-UNIT-009: scoreMatches() - Mecz bez zakładów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca mecz, `getBetsForMatch()` zwraca pustą tablicę |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 1, updated_scores: 0, errors: [] }` |
| **Weryfikacja** | `markMatchAsScored()` wywołane pomimo braku zakładów |

##### TC-SCORE-UNIT-010: scoreMatches() - Weryfikacja kolejności operacji

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 1 mecz z zakładami |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | Operacje wykonane w kolejności: `getUnscoredMatches → getBetsForMatch → upsertScore(s) → markMatchAsScored` |
| **Weryfikacja** | Spy weryfikuje kolejność wywołań metod mocka |

##### TC-SCORE-UNIT-011: getUnscoredMatches() - Poprawne pobranie

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca 2 mecze FINISHED, is_scored=false, result not null |
| **Kroki** | 1. Wywołanie `getUnscoredMatches(supabase)` |
| **Oczekiwany rezultat** | Zwrócona tablica 2 obiektów `UnscoredMatch[]` |
| **Weryfikacja** | Query builder: `.eq("status", "FINISHED")`, `.eq("is_scored", false)`, `.not("result", "is", null)` |

##### TC-SCORE-UNIT-012: getUnscoredMatches() - Brak meczów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca `{ data: null, error: null }` |
| **Kroki** | 1. Wywołanie `getUnscoredMatches(supabase)` |
| **Oczekiwany rezultat** | Zwrócona pusta tablica `[]` (linia 34: `data || []`) |

##### TC-SCORE-UNIT-013: getUnscoredMatches() - Błąd bazy danych

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock Supabase zwraca `{ data: null, error: { message: "Connection timeout" } }` |
| **Kroki** | 1. Wywołanie `getUnscoredMatches(supabase)` |
| **Oczekiwany rezultat** | Rzucony Error: `"Failed to fetch unscored matches: Connection timeout"` |

##### TC-SCORE-UNIT-014: getBetsForMatch() - Poprawne pobranie zakładów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca 3 zakłady dla match_id=42 |
| **Kroki** | 1. Wywołanie `getBetsForMatch(supabase, 42)` |
| **Oczekiwany rezultat** | Zwrócona tablica 3 obiektów `BetToScore[]` |
| **Weryfikacja** | Query builder: `.select("id, user_id, picked_result")`, `.eq("match_id", 42)` |

##### TC-SCORE-UNIT-015: getBetsForMatch() - Brak zakładów na mecz

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca `{ data: [], error: null }` |
| **Kroki** | 1. Wywołanie `getBetsForMatch(supabase, 99)` |
| **Oczekiwany rezultat** | Zwrócona pusta tablica `[]` |

##### TC-SCORE-UNIT-016: getBetsForMatch() - Błąd bazy danych

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca error |
| **Kroki** | 1. Wywołanie `getBetsForMatch(supabase, 1)` |
| **Oczekiwany rezultat** | Rzucony Error: `"Failed to fetch bets for match 1: ..."` |

##### TC-SCORE-UNIT-017: upsertScore() - Nowy użytkownik (brak poprzedniego wyniku)

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.single()` zwraca `{ data: null, error: null }` (brak rekordu) |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Upsert z `points: 3` (0 + 3) |
| **Weryfikacja** | `.upsert({ user_id: "user123", tournament_id: 10, points: 3, ... })` |

##### TC-SCORE-UNIT-018: upsertScore() - Istniejący wynik (kumulacja punktów)

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.single()` zwraca `{ data: { points: 6 }, error: null }` |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Upsert z `points: 9` (6 + 3) |
| **Weryfikacja** | Logika w linii 67: `(existing?.points || 0) + pointsToAdd` |

##### TC-SCORE-UNIT-019: upsertScore() - Edge case: użytkownik ma 0 punktów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock zwraca `{ data: { points: 0 }, error: null }` |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Upsert z `points: 3` (0 + 3) |

##### TC-SCORE-UNIT-020: upsertScore() - Weryfikacja conflict strategy

| Element | Opis |
|---------|------|
| **Warunek wstępny** | - |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Upsert wywołany z `{ onConflict: "user_id,tournament_id" }` (linia 77) |
| **Weryfikacja** | Spy na `.upsert()` weryfikuje drugi parametr |

##### TC-SCORE-UNIT-021: upsertScore() - Weryfikacja updated_at timestamp

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `Date` z ustalonym czasem |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Pole `updated_at` ustawione na aktualny ISO timestamp |
| **Weryfikacja** | `updated_at: new Date().toISOString()` w linii 74 |

##### TC-SCORE-UNIT-022: upsertScore() - Błąd podczas upsert

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.upsert()` zwraca error (np. constraint violation) |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Rzucony Error: `"Failed to upsert score for user user123: ..."` |

##### TC-SCORE-UNIT-023: upsertScore() - Błąd podczas fetch istniejącego wyniku (nie blokuje)

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.single()` zwraca error (ignorowany - linia 60 bez `if (error)`) |
| **Kroki** | 1. Wywołanie `upsertScore(supabase, "user123", 10, 3)` |
| **Oczekiwany rezultat** | Kontynuacja z `newPoints = 0 + 3`, upsert wykonany |
| **Uwaga** | Błąd fetch nie przerywa procesu (graceful degradation) |

##### TC-SCORE-UNIT-024: markMatchAsScored() - Poprawne oznaczenie

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.update()` zwraca sukces |
| **Kroki** | 1. Wywołanie `markMatchAsScored(supabase, 42)` |
| **Oczekiwany rezultat** | Zwrócona Promise resolve (void) |
| **Weryfikacja** | `.update({ is_scored: true })`, `.eq("id", 42)` |

##### TC-SCORE-UNIT-025: markMatchAsScored() - Błąd podczas update

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mock `.update()` zwraca error |
| **Kroki** | 1. Wywołanie `markMatchAsScored(supabase, 42)` |
| **Oczekiwany rezultat** | Rzucony Error: `"Failed to mark match 42 as scored: ..."` |

##### TC-SCORE-UNIT-026: scoreMatches() - Agregacja statystyk z wielu meczów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | 3 mecze: mecz #1 (2 trafienia), mecz #2 (0 trafień), mecz #3 (1 trafienie) |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `{ processed_matches: 3, updated_scores: 3, errors: [] }` |
| **Weryfikacja** | Licznik `updated_scores` kumulowany prawidłowo (linia 130) |

##### TC-SCORE-UNIT-027: scoreMatches() - Weryfikacja POINTS_FOR_CORRECT_BET

| Element | Opis |
|---------|------|
| **Warunek wstępny** | 1 mecz, 1 poprawny zakład |
| **Kroki** | 1. Wywołanie `scoreMatches(supabase)` |
| **Oczekiwany rezultat** | `upsertScore()` wywołane z `pointsToAdd = 3` (linia 5: `const POINTS_FOR_CORRECT_BET = 3`) |
| **Weryfikacja** | Spy weryfikuje trzeci parametr wywołania |

##### TC-SCORE-UNIT-028: scoreMatches() - Różne typy MatchOutcome

| Element | Opis |
|---------|------|
| **Warunek wstępny** | 3 mecze z różnymi wynikami: HOME_WIN, AWAY_WIN, DRAW |
| **Kroki** | 1. Każdy mecz ma zakłady na wszystkie 3 opcje |
| **Oczekiwany rezultat** | Tylko zakłady zgodne z `match.result` naliczają punkty |
| **Weryfikacja** | Warunek w linii 126: `bet.picked_result === match.result` |

**Metryki pokrycia:**
- **Line coverage:** 100% (wszystkie linie kodu wykonane)
- **Branch coverage:** 100% (wszystkie ścieżki if/else, błędy i sukcesy)
- **Function coverage:** 100% (wszystkie 5 funkcji)
- **Edge cases:** Puste tablice, null/undefined, błędy na każdym etapie, tryb dryRun, kumulacja punktów

**Uwagi implementacyjne:**
1. **Mockowanie Supabase Client:**
   - Stworzyć factory function `createMockSupabaseClient()` zwracający mock z chainable query builder
   - Mock `.from().select().eq().single()` dla `getUnscoredMatches` i `upsertScore`
   - Mock `.from().select().eq()` dla `getBetsForMatch`
   - Mock `.from().update().eq()` dla `markMatchAsScored`

2. **Spy na wywołania:**
   - `vi.spyOn()` na metodach query buildera do weryfikacji parametrów
   - Weryfikacja kolejności wywołań w testach integracyjnych funkcji `scoreMatches`

3. **Testowanie agregacji:**
   - Weryfikować inkrementację liczników `processed_matches` i `updated_scores` (linie 130, 139)
   - Weryfikować dodawanie błędów do `errors` array (linia 142)

4. **Testowanie logiki biznesowej:**
   - Warunek porównania wyników (linia 126): `bet.picked_result === match.result`
   - Logika trybu dryRun (linie 127, 135): `if (!dryRun)`
   - Kalkulacja punktów (linia 67): `(existing?.points || 0) + pointsToAdd`

5. **Type safety:**
   - Testować type casting `as UnscoredMatch[]` (linia 34) i `as BetToScore[]` (linia 47)
   - Weryfikować zgodność z interfejsami `UnscoredMatch`, `BetToScore`, `ScoreMatchesResponseDTO`

6. **Error handling:**
   - Weryfikować, że błędy są przechwytywane w catch block (linie 140-143)
   - Weryfikować format błędów: `error instanceof Error ? error.message : ...`
   - Weryfikować, że proces kontynuuje po błędzie (for loop nie przerywa się)

### 3.2 Testy integracyjne (Integration Tests)

**Cel:** Weryfikacja współpracy między komponentami - API z serwisami, serwisy z bazą danych.

**Narzędzia:** Vitest, Supertest, Supabase Test Helpers

**Scenariusze:**

1. **API → Service → Database**
   - Tworzenie zakładu przez endpoint POST `/api/bets`
   - Pobieranie meczów z filtrowaniem
   - Aktualizacja i usuwanie zakładów

2. **Authentication Flow**
   - Middleware → Supabase Auth → Locals
   - Ochrona endpointów przed nieautoryzowanym dostępem

3. **Edge Function → Database**
   - Synchronizacja meczów w trybie full i live
   - Automatyczne naliczanie punktów po zakończeniu meczu

### 3.3 Testy end-to-end (E2E Tests)

**Cel:** Weryfikacja pełnych ścieżek użytkownika w aplikacji.

**Narzędzia:** Playwright

**Scenariusze:**

1. Rejestracja nowego użytkownika
2. Logowanie i wylogowanie
3. Przeglądanie meczów i składanie zakładu
4. Modyfikacja i usunięcie zakładu
5. Przeglądanie rankingu turniejowego
6. Przeglądanie historii własnych zakładów
7. Reset hasła

### 3.4 Testy wydajnościowe (Performance Tests)

**Cel:** Weryfikacja czasu odpowiedzi i zachowania pod obciążeniem.

**Narzędzia:** k6, Lighthouse

**Metryki:**

| Metryka | Cel | Akceptowalny |
|---------|-----|--------------|
| TTFB (Time to First Byte) | < 200ms | < 500ms |
| LCP (Largest Contentful Paint) | < 2.5s | < 4s |
| API Response Time (p95) | < 300ms | < 1s |
| Concurrent Users | 100 | 50 |

### 3.5 Testy bezpieczeństwa (Security Tests)

**Cel:** Weryfikacja zabezpieczeń aplikacji.

**Obszary:**

1. **Walidacja wejść** - SQL injection, XSS
2. **Autentykacja** - brute force, session hijacking
3. **Autoryzacja** - dostęp do cudzych zasobów (RLS)
4. **Nagłówki HTTP** - CORS, CSP, HSTS

### 3.6 Testy dostępności (Accessibility Tests)

**Cel:** Zgodność z WCAG 2.1 AA.

**Narzędzia:** axe-core, Lighthouse Accessibility

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Moduł zakładów (Betting Module)

#### TC-BET-001: Utworzenie zakładu na mecz

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Użytkownik zalogowany, mecz w statusie SCHEDULED, >5 min do rozpoczęcia |
| **Kroki** | 1. Wysłanie POST `/api/bets` z match_id i picked_result |
| **Oczekiwany rezultat** | Status 201, zwrócony obiekt zakładu z ID |
| **Dane testowe** | match_id: istniejący mecz, picked_result: "HOME_WIN" |

#### TC-BET-002: Próba utworzenia duplikatu zakładu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Użytkownik ma już zakład na dany mecz |
| **Kroki** | 1. Wysłanie POST `/api/bets` na ten sam mecz |
| **Oczekiwany rezultat** | Status 409 Conflict, komunikat "Bet already exists" |

#### TC-BET-003: Zakład na mecz rozpoczynający się za <5 minut

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz rozpoczyna się za 4 minuty |
| **Kroki** | 1. Wysłanie POST `/api/bets` |
| **Oczekiwany rezultat** | Status 403, komunikat o zamknięciu zakładów |

#### TC-BET-004: Zakład dokładnie 5 minut przed meczem (edge case)

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz rozpoczyna się za dokładnie 5 minut (300000ms) |
| **Kroki** | 1. Wysłanie POST `/api/bets` |
| **Oczekiwany rezultat** | Status 201 - zakład przyjęty |

#### TC-BET-005: Aktualizacja zakładu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Istniejący zakład użytkownika, mecz SCHEDULED, >5 min |
| **Kroki** | 1. Wysłanie PUT `/api/bets/:id` ze zmienionym picked_result |
| **Oczekiwany rezultat** | Status 200, zaktualizowany obiekt zakładu |

#### TC-BET-006: Usunięcie zakładu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Istniejący zakład użytkownika |
| **Kroki** | 1. Wysłanie DELETE `/api/bets/:id` |
| **Oczekiwany rezultat** | Status 200, `{ deleted: true }` |

#### TC-BET-007: Próba modyfikacji zakładu na mecz IN_PLAY

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz w statusie IN_PLAY |
| **Kroki** | 1. Wysłanie PUT `/api/bets/:id` |
| **Oczekiwany rezultat** | Status 403, komunikat "Match is not scheduled" |

#### TC-BET-008: Próba dostępu do cudzego zakładu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Zakład należący do innego użytkownika |
| **Kroki** | 1. Wysłanie PUT/DELETE `/api/bets/:id` |
| **Oczekiwany rezultat** | Status 403 lub 404 (RLS ukrywa zasób) |

### 4.2 Moduł punktacji (Scoring Module)

#### TC-SCORE-001: Naliczenie punktów za trafioną prognozę

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz FINISHED, zakład z poprawnym picked_result |
| **Kroki** | 1. Wywołanie POST `/api/admin/score-matches` |
| **Oczekiwany rezultat** | Użytkownik otrzymuje 3 punkty, mecz oznaczony is_scored=true |

#### TC-SCORE-002: Brak punktów za nietrafioną prognozę

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz FINISHED, zakład z błędnym picked_result |
| **Kroki** | 1. Wywołanie POST `/api/admin/score-matches` |
| **Oczekiwany rezultat** | Brak zmiany punktów użytkownika |

#### TC-SCORE-003: Kumulacja punktów z wielu meczów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Użytkownik ma 6 punktów, trafił kolejną prognozę |
| **Kroki** | 1. Wywołanie scoringu |
| **Oczekiwany rezultat** | Użytkownik ma 9 punktów |

#### TC-SCORE-004: Dry run bez zapisywania zmian

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz do zescorowania |
| **Kroki** | 1. POST `/api/admin/score-matches` z `{ dry_run: true }` |
| **Oczekiwany rezultat** | Raport zmian, brak modyfikacji w bazie |

### 4.3 Moduł rankingów (Leaderboard Module)

#### TC-LEAD-001: Pobranie rankingu turniejowego

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Turniej z uczestnikami i punktami |
| **Kroki** | 1. GET `/api/tournaments/:id/leaderboard` |
| **Oczekiwany rezultat** | Lista uczestników posortowana malejąco wg punktów |

#### TC-LEAD-002: Obsługa remisów w rankingu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Dwóch użytkowników z tą samą liczbą punktów |
| **Kroki** | 1. GET `/api/tournaments/:id/leaderboard` |
| **Oczekiwany rezultat** | Obaj mają tę samą pozycję (rank), następna pozycja jest pominięta |
| **Przykład** | User A: rank 1, User B: rank 1, User C: rank 3 (nie 2) |

#### TC-LEAD-003: Paginacja rankingu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | >100 uczestników w turnieju |
| **Kroki** | 1. GET z limit=50, offset=0 <br> 2. GET z limit=50, offset=50 |
| **Oczekiwany rezultat** | Poprawna paginacja, spójne rankingi między stronami |

#### TC-LEAD-004: Nieistniejący turniej

| Element | Opis |
|---------|------|
| **Kroki** | 1. GET `/api/tournaments/99999/leaderboard` |
| **Oczekiwany rezultat** | Status 404 |

### 4.4 Moduł meczów (Matches Module)

#### TC-MATCH-001: Pobranie nadchodzących meczów

| Element | Opis |
|---------|------|
| **Kroki** | 1. GET `/api/matches?filter=UPCOMING` |
| **Oczekiwany rezultat** | Lista meczów SCHEDULED posortowana rosnąco wg daty |

#### TC-MATCH-002: Pobranie zakończonych meczów

| Element | Opis |
|---------|------|
| **Kroki** | 1. GET `/api/matches?filter=FINISHED` |
| **Oczekiwany rezultat** | Lista meczów FINISHED posortowana malejąco wg daty |

#### TC-MATCH-003: Filtrowanie po turnieju

| Element | Opis |
|---------|------|
| **Kroki** | 1. GET `/api/matches?tournament_id=1` |
| **Oczekiwany rezultat** | Tylko mecze z turnieju o ID=1 |

#### TC-MATCH-004: Zwracanie zakładu użytkownika przy meczu

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Użytkownik ma zakład na dany mecz |
| **Kroki** | 1. GET `/api/matches` |
| **Oczekiwany rezultat** | Pole `user_bet` wypełnione przy odpowiednim meczu |

### 4.5 Moduł autentykacji (Auth Module)

#### TC-AUTH-001: Rejestracja użytkownika

| Element | Opis |
|---------|------|
| **Kroki** | 1. Wypełnienie formularza rejestracji <br> 2. Submit |
| **Oczekiwany rezultat** | Konto utworzone, email weryfikacyjny wysłany |

#### TC-AUTH-002: Logowanie

| Element | Opis |
|---------|------|
| **Kroki** | 1. Wprowadzenie poprawnych danych logowania |
| **Oczekiwany rezultat** | Sesja utworzona, przekierowanie do aplikacji |

#### TC-AUTH-003: Sprawdzenie dostępności nazwy użytkownika

| Element | Opis |
|---------|------|
| **Kroki** | 1. POST `/api/auth/check-username` z nazwą |
| **Oczekiwany rezultat** | `{ available: true/false }` |

#### TC-AUTH-004: Dostęp do chronionego endpointu bez logowania

| Element | Opis |
|---------|------|
| **Kroki** | 1. GET `/api/me/bets` bez sesji |
| **Oczekiwany rezultat** | Status 401 Unauthorized |

#### TC-AUTH-005: Reset hasła

| Element | Opis |
|---------|------|
| **Kroki** | 1. Żądanie resetu hasła <br> 2. Kliknięcie linku z emaila <br> 3. Ustawienie nowego hasła |
| **Oczekiwany rezultat** | Hasło zmienione, możliwość zalogowania |

### 4.6 Edge Function - Synchronizacja meczów

#### TC-SYNC-001: Full sync - import nowych meczów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Nowe mecze dostępne w API |
| **Kroki** | 1. Wywołanie `?mode=full` |
| **Oczekiwany rezultat** | Nowe mecze dodane do bazy, istniejące pominięte |

#### TC-SYNC-002: Live sync - aktualizacja trwających meczów

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecze w statusie IN_PLAY |
| **Kroki** | 1. Wywołanie `?mode=live` |
| **Oczekiwany rezultat** | Wyniki i statusy zaktualizowane |

#### TC-SYNC-003: Automatyczne naliczanie punktów po sync

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Mecz zmienia status na FINISHED |
| **Kroki** | 1. Live sync aktualizuje mecz |
| **Oczekiwany rezultat** | Punkty automatycznie naliczone |

#### TC-SYNC-004: Optymalizacja - brak wywołania API gdy brak meczów do aktualizacji

| Element | Opis |
|---------|------|
| **Warunek wstępny** | Brak meczów IN_PLAY ani zbliżających się |
| **Kroki** | 1. Wywołanie `?mode=live` |
| **Oczekiwany rezultat** | API zewnętrzne nie wywołane, szybki return |

---

## 5. Środowisko testowe

### 5.1 Środowiska

| Środowisko | Cel | Baza danych | Konfiguracja |
|------------|-----|-------------|--------------|
| **Local** | Rozwój, testy jednostkowe | Supabase local (Docker) | `.env.local` |
| **Test** | Testy integracyjne, E2E | Supabase test project | `.env.test` |
| **Staging** | UAT, testy wydajnościowe | Supabase staging project | `.env.staging` |
| **Production** | - (nie testujemy na prod) | - | - |

### 5.2 Konfiguracja środowiska testowego

```bash
# Wymagane zmienne środowiskowe dla testów
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=test-anon-key

# Konfiguracja mockowania zewnętrznego API
API_FOOTBALL_KEY=mock-key
API_FOOTBALL_BASE_URL=http://localhost:3001/mock
```

### 5.3 Dane testowe

**Fixtures:**
- 3 turnieje (Champions League, Euro 2024, Ekstraklasa)
- 20 meczów w różnych statusach (SCHEDULED, IN_PLAY, FINISHED)
- 5 użytkowników testowych
- 50 zakładów z różnymi wynikami
- Wypełniona tabela scores dla testów rankingu

**Seed script:** `scripts/seed-test-data.ts`

---

## 6. Narzędzia do testowania

### 6.1 Framework testowy

| Kategoria | Narzędzie | Uzasadnienie |
|-----------|-----------|--------------|
| Unit/Integration | **Vitest** | Szybki, kompatybilny z Vite/Astro, TypeScript |
| E2E | **Playwright** | Cross-browser, stabilny, async/await API |
| API Testing | **Supertest** | Integracja z Node.js, HTTP assertions |
| Mocking | **MSW** | Service Worker mocking, realistyczne testy |
| Component Testing | **Testing Library** | React/DOM testing, user-centric approach |

### 6.2 Narzędzia pomocnicze

| Narzędzie | Zastosowanie |
|-----------|--------------|
| **@testing-library/react** | Testowanie komponentów React |
| **@testing-library/user-event** | Symulacja interakcji użytkownika |
| **axe-core** | Automatyczne testy dostępności |
| **Lighthouse CI** | Audyty wydajności i dostępności |
| **k6** | Testy obciążeniowe API |
| **Supabase CLI** | Lokalne środowisko Supabase |

### 6.3 Konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'src/components/ui/**']
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
```

### 6.4 Konfiguracja Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 7. Harmonogram testów

### 7.1 Cykl testowy

```
┌─────────────────────────────────────────────────────────────────┐
│                     CYKL TESTOWY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TESTY JEDNOSTKOWE                                          │
│     └── Przy każdym upishu (pre-commit hook)                   │
│     └── W CI pipeline (GitHub Actions)                         │
│                                                                 │
│  2. TESTY INTEGRACYJNE                                         │
│     └── W CI pipeline po unit testach                          │
│     └── Przed merge do main branch                             │
│                                                                 │
│  3. TESTY E2E                                                  │
│     └── Po deploymencie na staging                             │
│     └── Przed release do produkcji                             │
│                                                                 │
│  4. TESTY WYDAJNOŚCIOWE                                        │
│     └── Po znaczących zmianach w API                           │
│     └── Przed release do produkcji                             │
│                                                                 │
│  5. TESTY BEZPIECZEŃSTWA                                       │
│     └── Po zmianach w autentykacji/autoryzacji                 │
│     └── Przegląd cykliczny                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Fazy implementacji testów

**Faza 1: Fundamenty**
- Konfiguracja Vitest i podstawowych narzędzi
- Testy jednostkowe dla BetService i ScoringService
- Testy walidatorów Zod

**Faza 2: Integracja**
- Konfiguracja środowiska testowego Supabase
- Testy integracyjne API endpoints
- Testy middleware autentykacji

**Faza 3: E2E**
- Konfiguracja Playwright
- Scenariusze krytycznych ścieżek użytkownika
- Testy cross-browser

**Faza 4: Zaawansowane**
- Testy wydajnościowe k6
- Testy dostępności
- Testy bezpieczeństwa

---

## 8. Kryteria akceptacji testów

### 8.1 Pokrycie kodu

| Metryka | Minimum | Cel |
|---------|---------|-----|
| Line coverage | 70% | 85% |
| Branch coverage | 60% | 80% |
| Function coverage | 80% | 90% |

**Wyłączenia z pokrycia:**
- `src/components/ui/**` (komponenty Shadcn/ui)
- `src/db/database.types.ts` (generowane typy)
- Pliki konfiguracyjne

### 8.2 Kryteria przejścia

| Poziom | Kryteria |
|--------|----------|
| **Unit** | 100% testów przechodzi, pokrycie ≥70% |
| **Integration** | 100% testów przechodzi, brak regresji |
| **E2E** | 100% critical path testów przechodzi |
| **Performance** | p95 response time <1s, LCP <4s |
| **Security** | Brak krytycznych i wysokich podatności |
| **Accessibility** | Wynik Lighthouse ≥90, brak błędów axe-core |

### 8.3 Kryteria blokujące release

1. **Blocker:** Jakikolwiek test jednostkowy nie przechodzi
2. **Blocker:** Test E2E krytycznej ścieżki nie przechodzi
3. **Blocker:** Wykryta podatność bezpieczeństwa o severity HIGH lub CRITICAL
4. **Warning:** Spadek pokrycia kodu o >5%

---

## 9. Role i odpowiedzialności

### 9.1 Macierz odpowiedzialności (RACI)

| Aktywność | Developer | QA Lead | Tech Lead | Product Owner |
|-----------|:---------:|:-------:|:---------:|:-------------:|
| Pisanie testów jednostkowych | **R** | C | A | I |
| Pisanie testów integracyjnych | **R** | **R** | A | I |
| Pisanie testów E2E | C | **R** | A | I |
| Review testów | **R** | **R** | A | I |
| Utrzymanie środowiska testowego | C | **R** | A | I |
| Analiza wyników testów | I | **R** | C | I |
| Decyzje o release | I | C | **R** | **A** |
| Definiowanie kryteriów akceptacji | C | **R** | C | **A** |

**Legenda:** R=Responsible, A=Accountable, C=Consulted, I=Informed

### 9.2 Obowiązki

**Developer:**
- Pisanie testów jednostkowych dla nowego kodu
- Utrzymanie pokrycia kodu
- Naprawa failing testów przed merge
- Code review testów innych developerów

**QA Lead:**
- Definiowanie strategii testowania
- Pisanie i utrzymanie testów E2E
- Konfiguracja i utrzymanie narzędzi testowych
- Raportowanie statusu jakości

**Tech Lead:**
- Zatwierdzanie architektury testów
- Decyzje o narzędziach i frameworkach
- Eskalacja problemów jakościowych

---

## 10. Procedury raportowania błędów

### 10.1 Klasyfikacja błędów

| Severity | Opis | SLA (czas reakcji) | Przykład |
|----------|------|-------------------|----------|
| **Critical** | Aplikacja niefunkcjonalna, utrata danych | Natychmiast | Błąd autentykacji, scoring nie działa |
| **High** | Kluczowa funkcja nie działa | Do następnego dnia roboczego | Nie można składać zakładów |
| **Medium** | Funkcja działa z ograniczeniami | W ramach sprintu | Paginacja rankingu błędna |
| **Low** | Kosmetyczne, UI glitches | W backlogu | Wyrównanie elementów |

### 10.2 Template zgłoszenia błędu

```markdown
## Tytuł
[Krótki, opisowy tytuł błędu]

## Severity
[Critical / High / Medium / Low]

## Środowisko
- Środowisko: [Local / Test / Staging]
- Przeglądarka: [Chrome 120 / Firefox 121 / Safari 17]
- System: [Windows 11 / macOS 14 / Ubuntu 22.04]

## Kroki reprodukcji
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## Oczekiwane zachowanie
[Co powinno się wydarzyć]

## Rzeczywiste zachowanie
[Co się wydarzyło]

## Dowody
- Screenshot/nagranie: [link]
- Logi konsoli: [jeśli dostępne]
- Network trace: [jeśli dostępne]

## Dodatkowy kontekst
[Informacje pomocne w debugowaniu]
```

### 10.3 Workflow obsługi błędów

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  NEW     │───▶│ TRIAGED  │───▶│ IN PROG  │───▶│ IN REVIEW│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │                               │
                     │                               ▼
                     │                          ┌──────────┐
                     │                          │  DONE    │
                     │                          └──────────┘
                     │                               ▲
                     ▼                               │
               ┌──────────┐                    ┌──────────┐
               │ REJECTED │                    │ VERIFIED │
               └──────────┘                    └──────────┘
```

**Statusy:**
- **NEW:** Nowe zgłoszenie
- **TRIAGED:** Zweryfikowane, przypisana severity i priorytet
- **IN PROGRESS:** W trakcie naprawy
- **IN REVIEW:** Code review / QA review
- **VERIFIED:** QA zweryfikował naprawę
- **DONE:** Zamknięte, wdrożone
- **REJECTED:** Odrzucone (nie jest błędem / duplikat)

### 10.4 Narzędzia do śledzenia błędów

- **Primary:** GitHub Issues z labelami
- **Labels:**
  - `bug`, `severity:critical`, `severity:high`, `severity:medium`, `severity:low`
  - `area:betting`, `area:scoring`, `area:auth`, `area:frontend`, `area:sync`
  - `status:triaged`, `status:in-progress`, `status:verified`

---

## Załączniki

### A. Checklist przed release

- [ ] Wszystkie testy jednostkowe przechodzą
- [ ] Wszystkie testy integracyjne przechodzą
- [ ] Testy E2E critical path przechodzą
- [ ] Pokrycie kodu ≥70%
- [ ] Brak otwartych błędów Critical/High
- [ ] Testy wydajnościowe w akceptowalnych normach
- [ ] Audyt dostępności przeprowadzony
- [ ] Dokumentacja zaktualizowana

### B. Kontakty

| Rola | Kontakt |
|------|---------|
| QA Lead | [do uzupełnienia] |
| Tech Lead | [do uzupełnienia] |
| DevOps | [do uzupełnienia] |

---

*Dokument utworzony: 2025-12-29*
*Wersja: 1.0*
