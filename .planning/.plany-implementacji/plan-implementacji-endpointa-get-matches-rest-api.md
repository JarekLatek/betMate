Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest stworzenie szczegółowego planu wdrożenia punktu końcowego REST API. Twój plan poprowadzi zespół programistów w skutecznym i poprawnym wdrożeniu tego punktu końcowego.

Zanim zaczniemy, zapoznaj się z poniższymi informacjami:

1. Route API specification:
   <route_api_specification>

   #### GET /api/matches

   **Description:** Retrieve list of matches with optional filtering.

   **Authentication:** Required

   **Query Parameters:**
   - `tournament_id` (optional): Filter by tournament ID
   - `status` (optional): Filter by match status (`SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`)
   - `from_date` (optional): Filter matches after this date (ISO 8601 format)
   - `to_date` (optional): Filter matches before this date (ISO 8601 format)
   - `limit` (optional): Number of results per page (default: 50, max: 100)
   - `offset` (optional): Pagination offset (default: 0)

   **Response Body:**

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

   **Note:** The `user_bet` field is included when the authenticated user has placed a bet on that match.

   **Success Response:**
   - **Code:** 200 OK

   **Error Responses:**
   - **Code:** 401 Unauthorized
     - **Message:** `{ "error": "Authentication required" }`
   - **Code:** 400 Bad Request
     - **Message:** `{ "error": "Invalid query parameters", "details": [...] }`
       </route_api_specification>

2. Related database resources:
   <related_db_resources>

   ### matches

   Zawiera dane o meczach.

   | Kolumna        | Typ           | Ograniczenia                              | Opis                                   |
   | -------------- | ------------- | ----------------------------------------- | -------------------------------------- |
   | id             | BIGINT        | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | Klucz główny                           |
   | tournament_id  | BIGINT        | NOT NULL, FOREIGN KEY                     | Referencja do turnieju                 |
   | home_team      | TEXT          | NOT NULL                                  | Nazwa drużyny gospodarzy               |
   | away_team      | TEXT          | NOT NULL                                  | Nazwa drużyny gości                    |
   | match_datetime | TIMESTAMPTZ   | NOT NULL                                  | Data i czas meczu (UTC)                |
   | status         | match_status  | NOT NULL                                  | Status meczu                           |
   | result         | match_outcome | NULL                                      | Wynik meczu (NULL dla niezakończonych) |
   | api_match_id   | BIGINT        | UNIQUE                                    | Identyfikator meczu z api-football.com |
   | is_scored      | BOOLEAN       | NOT NULL, DEFAULT FALSE                   | Flaga czy punkty zostały przyznane     |

   **Klucze obce:**
   - `tournament_id` → `tournaments.id`

   **Indeksy:**
   - PRIMARY KEY na `id`
   - INDEX na `tournament_id`
   - INDEX na `match_datetime`
   - INDEX na `status`
   - UNIQUE INDEX na `api_match_id`
   - INDEX na `is_scored` (dla optymalizacji zapytań o mecze do punktowania)

   **RLS Policies:**

   ```sql
   -- Włączenie RLS
   ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

   -- Wszyscy uwierzytelnieni użytkownicy mogą odczytywać mecze
   CREATE POLICY "matches_select_authenticated" ON matches
     FOR SELECT
     TO authenticated
     USING (true);

   -- Tylko serwis może modyfikować mecze (przez service_role)
   ```

   **Relacje:**
   - tournaments (1) ← (N) matches - Jeden turniej zawiera wiele meczów
   - matches (1) ← (N) bets - Jeden mecz może mieć wiele zakładów od różnych użytkowników

   ### bets (powiązane)

   Przechowuje zakłady użytkowników.

   | Kolumna       | Typ           | Ograniczenia                              | Opis                        |
   | ------------- | ------------- | ----------------------------------------- | --------------------------- |
   | id            | BIGINT        | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | Klucz główny                |
   | user_id       | UUID          | NOT NULL, FOREIGN KEY                     | Referencja do użytkownika   |
   | match_id      | BIGINT        | NOT NULL, FOREIGN KEY                     | Referencja do meczu         |
   | picked_result | match_outcome | NOT NULL                                  | Wytypowany wynik            |
   | created_at    | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                   | Data utworzenia zakładu     |
   | updated_at    | TIMESTAMPTZ   | NULL                                      | Data ostatniej aktualizacji |

   **Klucze obce:**
   - `user_id` → `profiles.id` (ON DELETE CASCADE)
   - `match_id` → `matches.id`

   **RLS Policies:**

   ```sql
   -- Użytkownik może odczytywać tylko swoje zakłady
   CREATE POLICY "bets_select_own" ON bets
     FOR SELECT
     TO authenticated
     USING (auth.uid() = user_id);
   ```

   </related_db_resources>

3. Definicje typów:
   <type_definitions>
   [text](../src/types.ts)
   </type_definitions>

4. Tech stack:
   <tech_stack>
   [text](../.ai/tech-stack.md)
   </tech_stack>

5. Implementation rules:
   <implementation_rules>
   [text](../CLAUDE.md)
   </implementation_rules>

Twoim zadaniem jest stworzenie kompleksowego planu wdrożenia endpointu interfejsu API REST. Przed dostarczeniem ostatecznego planu użyj znaczników <analysis>, aby przeanalizować informacje i nakreślić swoje podejście. W tej analizie upewnij się, że:

1. Podsumuj kluczowe punkty specyfikacji API.
2. Wymień wymagane i opcjonalne parametry ze specyfikacji API.
3. Wymień niezbędne typy DTO i Command Modele.
4. Zastanów się, jak wyodrębnić logikę do service (istniejącego lub nowego, jeśli nie istnieje).
5. Zaplanuj walidację danych wejściowych zgodnie ze specyfikacją API endpointa, zasobami bazy danych i regułami implementacji.
6. Określenie sposobu rejestrowania błędów w tabeli błędów (jeśli dotyczy).
7. Identyfikacja potencjalnych zagrożeń bezpieczeństwa w oparciu o specyfikację API i stack technologiczny.
8. Nakreśl potencjalne scenariusze błędów i odpowiadające im kody stanu.

Po przeprowadzeniu analizy utwórz szczegółowy plan wdrożenia w formacie markdown. Plan powinien zawierać następujące sekcje:

1. Przegląd punktu końcowego
2. Szczegóły żądania
3. Szczegóły odpowiedzi
4. Przepływ danych
5. Względy bezpieczeństwa
6. Obsługa błędów
7. Wydajność
8. Kroki implementacji

W całym planie upewnij się, że

- Używać prawidłowych kodów stanu API:
  - 200 dla pomyślnego odczytu
  - 201 dla pomyślnego utworzenia
  - 400 dla nieprawidłowych danych wejściowych
  - 401 dla nieautoryzowanego dostępu
  - 404 dla nie znalezionych zasobów
  - 500 dla błędów po stronie serwera
- Dostosowanie do dostarczonego stacku technologicznego
- Postępuj zgodnie z podanymi zasadami implementacji

Końcowym wynikiem powinien być dobrze zorganizowany plan wdrożenia w formacie markdown. Oto przykład tego, jak powinny wyglądać dane wyjściowe:

``markdown

# API Endpoint Implementation Plan: [Nazwa punktu końcowego]

## 1. Przegląd punktu końcowego

[Krótki opis celu i funkcjonalności punktu końcowego]

## 2. Szczegóły żądania

- Metoda HTTP: [GET/POST/PUT/DELETE]
- Struktura URL: [wzorzec URL]
- Parametry:
  - Wymagane: [Lista wymaganych parametrów]
  - Opcjonalne: [Lista opcjonalnych parametrów]
- Request Body: [Struktura treści żądania, jeśli dotyczy]

## 3. Wykorzystywane typy

[DTOs i Command Modele niezbędne do implementacji]

## 3. Szczegóły odpowiedzi

[Oczekiwana struktura odpowiedzi i kody statusu]

## 4. Przepływ danych

[Opis przepływu danych, w tym interakcji z zewnętrznymi usługami lub bazami danych]

## 5. Względy bezpieczeństwa

[Szczegóły uwierzytelniania, autoryzacji i walidacji danych]

## 6. Obsługa błędów

[Lista potencjalnych błędów i sposób ich obsługi]

## 7. Rozważania dotyczące wydajności

[Potencjalne wąskie gardła i strategie optymalizacji]

## 8. Etapy wdrożenia

1. [Krok 1]
2. [Krok 2]
3. [Krok 3]
   ...

```

Końcowe wyniki powinny składać się wyłącznie z planu wdrożenia w formacie markdown i nie powinny powielać ani powtarzać żadnej pracy wykonanej w sekcji analizy.

Pamiętaj, aby zapisać swój plan wdrożenia jako .ai/[nazwa-endopinta]-implementation-plan.md. Upewnij się, że plan jest szczegółowy, przejrzysty i zapewnia kompleksowe wskazówki dla zespołu programistów.
```
