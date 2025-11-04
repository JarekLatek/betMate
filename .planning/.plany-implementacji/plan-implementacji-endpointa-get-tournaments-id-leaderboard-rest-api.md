Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest stworzenie szczegółowego planu wdrożenia punktu końcowego REST API. Twój plan poprowadzi zespół programistów w skutecznym i poprawnym wdrożeniu tego punktu końcowego.

Zanim zaczniemy, zapoznaj się z poniższymi informacjami:

1. Route API specification:
   <route_api_specification>

   #### GET /api/tournaments/:tournament_id/leaderboard

   **Description:** Retrieve the public leaderboard (rankings) for a specific tournament.

   **Authentication:** Required

   **URL Parameters:**
   - `tournament_id` (required): Tournament ID

   **Query Parameters:**
   - `limit` (optional): Number of results per page (default: 100, max: 500)
   - `offset` (optional): Pagination offset (default: 0)

   **Response Body:**

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

   **Note:** Users with the same points share the same rank.

   **Success Response:**
   - **Code:** 200 OK

   **Error Responses:**
   - **Code:** 401 Unauthorized
     - **Message:** `{ "error": "Authentication required" }`
   - **Code:** 404 Not Found
     - **Message:** `{ "error": "Tournament not found" }`
       </route_api_specification>

2. Related database resources:
   <related_db_resources>

   ### scores

   Zdenormalizowana tabela do przechowywania punktów i rankingów.

   | Kolumna       | Typ         | Ograniczenia                             | Opis                        |
   | ------------- | ----------- | ---------------------------------------- | --------------------------- |
   | user_id       | UUID        | NOT NULL, FOREIGN KEY                    | Referencja do użytkownika   |
   | tournament_id | BIGINT      | NOT NULL, FOREIGN KEY                    | Referencja do turnieju      |
   | points        | INT         | NOT NULL, DEFAULT 0, CHECK (points >= 0) | Suma punktów użytkownika    |
   | updated_at    | TIMESTAMPTZ | NOT NULL, DEFAULT now()                  | Data ostatniej aktualizacji |

   **Klucze obce:**
   - `user_id` → `profiles.id` (ON DELETE CASCADE)
   - `tournament_id` → `tournaments.id`

   **Klucz główny:**
   - PRIMARY KEY(`user_id`, `tournament_id`)

   **Indeksy:**
   - PRIMARY KEY na `(user_id, tournament_id)`
   - INDEX na `tournament_id`
   - INDEX na `points` (dla optymalizacji sortowania w rankingach)

   **RLS Policies:**

   ```sql
   -- Włączenie RLS
   ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

   -- Wszyscy uwierzytelnieni użytkownicy mogą odczytywać wyniki (ranking publiczny)
   CREATE POLICY "scores_select_authenticated" ON scores
     FOR SELECT
     TO authenticated
     USING (true);

   -- Tylko serwis może modyfikować wyniki (przez service_role)
   ```

   **Relacje:**
   - profiles (1) ← (N) scores - Jeden użytkownik może mieć wiele wpisów w tabeli scores (po jednym na turniej)
   - tournaments (1) ← (N) scores - Jeden turniej ma wiele wpisów z wynikami użytkowników

   ### profiles (powiązane)

   Przechowuje publiczne dane użytkowników.

   | Kolumna    | Typ         | Ograniczenia            | Opis                                      |
   | ---------- | ----------- | ----------------------- | ----------------------------------------- |
   | id         | UUID        | PRIMARY KEY             | Klucz główny, referencja do auth.users.id |
   | username   | TEXT        | NOT NULL, UNIQUE        | Unikalna nazwa użytkownika                |
   | created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data utworzenia profilu                   |

   ### tournaments (powiązane)

   Przechowuje informacje o turniejach.

   | Kolumna           | Typ    | Ograniczenia                              | Opis                                      |
   | ----------------- | ------ | ----------------------------------------- | ----------------------------------------- |
   | id                | BIGINT | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | Klucz główny                              |
   | name              | TEXT   | NOT NULL                                  | Nazwa turnieju                            |
   | api_tournament_id | BIGINT | UNIQUE                                    | Identyfikator turnieju z api-football.com |

   **Triggery:**

   ```sql
   -- Automatyczna aktualizacja updated_at
   CREATE TRIGGER set_updated_at_scores
     BEFORE UPDATE ON scores
     FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
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
