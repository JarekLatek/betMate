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
