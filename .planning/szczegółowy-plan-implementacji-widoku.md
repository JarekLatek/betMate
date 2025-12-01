Jako starszy programista frontendu Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia nowego widoku w aplikacji internetowej. Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć widok.

Najpierw przejrzyj następujące informacje:

1. Product Requirements Document (PRD):
   <prd>
   [text](../.ai/prd.md)
   </prd>

2. Opis widoku:
   <view_description>

   ### 2.2. Widok Meczów (Ekran Główny)
   - **Ścieżka**: `/` (z opcjonalnym `?tournamentId=...`)
   - **Główny cel**: Prezentacja listy meczów i umożliwienie obstawiania wyników.
   - **Kluczowe informacje**:
     - Lista meczów (Drużyny, Data/Godzina).
     - Status meczu (Nadchodzący, Trwa, Zakończony).
     - Aktualny typ użytkownika (1, X, 2).
     - Wynik meczu (dla zakończonych).
   - **Kluczowe komponenty**:
     - `TournamentSelector` (w nagłówku).
     - `MatchListFilters` (Segmented Control: Nadchodzące / Zakończone).
     - `MatchCard` (z przyciskami do głosowania lub wynikiem).
     - `InfiniteScrollTrigger` (do ładowania kolejnych stron).
   - **UX/Dostępność**:
     - Blokada przycisków na 5 min przed meczem (wizualne wyszarzenie + kłódka).
     - Toast z informacją przy próbie edycji zablokowanego zakładu.
     - Wyraźne rozróżnienie trafionych (zielony/szczęśliwa buźka) i nietrafionych (szary/smutna buźka) typów.
       </view_description>

3. User Stories:
   <user_stories>
   - ID: US-003

   - Tytuł: Przeglądanie listy nadchodzących meczów
   - Opis: Jako zalogowany użytkownik, chcę widzieć listę nadchodzących meczów w ramach wybranego turnieju, aby móc zdecydować, które z nich chcę obstawić.
   - Kryteria akceptacji:
     - System wyświetla listę meczów pobraną z `api-football.com`.
     - Każdy element listy zawiera nazwy drużyn (i ich loga, jeśli dostępne), datę i godzinę rozpoczęcia meczu.
     - Godzina meczu jest wyświetlana w lokalnej strefie czasowej użytkownika.
     - Mecze, które już się rozpoczęły lub zakończyły, nie są widoczne na liście do obstawiania.

- ID: US-004
- Tytuł: Obstawianie wyniku meczu
- Opis: Jako zalogowany użytkownik, chcę móc łatwo obstawić wynik (wygrana gospodarzy, remis, wygrana gości) dla wybranego meczu z listy.
- Kryteria akceptacji:
  - Przy każdym meczu na liście znajdują się trzy klikalne opcje: "1" (wygrana gospodarzy), "X" (remis), "2" (wygrana gości).
  - Po wybraniu typu, system zapisuje go i wizualnie zaznacza wybór użytkownika.
  - Użytkownik może postawić typ na dowolną liczbę dostępnych meczów.
  - System uniemożliwia obstawienie meczu, do którego rozpoczęcia pozostało mniej niż 5 minut.

- ID: US-005
- Tytuł: Edycja postawionego typu
- Opis: Jako zalogowany użytkownik, chcę mieć możliwość zmiany mojego typu przed rozpoczęciem meczu, jeśli zmienię zdanie.
- Kryteria akceptacji:
  - Użytkownik może zmienić swój wybór (1, X, 2) dla danego meczu w dowolnym momencie.
  - Zmiana typu jest możliwa do 5 minut przed oficjalnym rozpoczęciem meczu.
  - Po upływie tego czasu opcja edycji jest blokowana.

- ID: US-007
  - Tytuł: Przełączanie się między turniejami
  - Opis: Jako użytkownik, chcę móc łatwo przełączać się między dostępnymi turniejami (Liga Mistrzów, MŚ 2026), aby zobaczyć listę meczów i oddzielny ranking dla każdego z nich.
  - Kryteria akceptacji:
    - W interfejsie znajduje się wyraźny przełącznik (np. zakładki, menu rozwijane) do wyboru turnieju.
    - Po wybraniu turnieju, zarówno lista meczów do obstawienia, jak i ranking, są aktualizowane i pokazują dane tylko dla tego turnieju.

    - ID: US-010
    - Tytuł: Obsługa meczów odwołanych lub przełożonych
    - Opis: Jako system, chcę poprawnie obsługiwać mecze, które zostały odwołane lub przełożone, aby nie wpływały one na punktację.
    - Kryteria akceptacji:
      - Jeśli mecz zostanie oznaczony w API jako odwołany lub przełożony, wszystkie postawione na niego zakłady są anulowane.
      - Za anulowane zakłady nie są przyznawane ani odejmowane żadne punkty.
      - Taki mecz nie jest brany pod uwagę przy obliczaniu statystyk trafień.
        </user_stories>

4. Endpoint Description:
   <endpoint_description>

   ### 2.2 Tournaments

   #### GET /api/tournaments

   **Description:** Retrieve list of all available tournaments.

   **Authentication:** Required

   **Query Parameters:** None

   **Response Body:**

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
       }
     ]
   }
   ```

   **Success Response:**
   - **Code:** 200 OK

   **Error Responses:**
   - **Code:** 401 Unauthorized
     - **Message:** `{ "error": "Authentication required" }`

   ***

   #### GET /api/tournaments/:id

   **Description:** Get details of a specific tournament.

   **Authentication:** Required

   **URL Parameters:**
   - `id` (required): Tournament ID

   **Response Body:**

   ```json
   {
     "data": {
       "id": 1,
       "name": "UEFA Champions League",
       "api_tournament_id": 2
     }
   }
   ```

   **Success Response:**
   - **Code:** 200 OK

   **Error Responses:**
   - **Code:** 401 Unauthorized
     - **Message:** `{ "error": "Authentication required" }`
   - **Code:** 404 Not Found
     - **Message:** `{ "error": "Tournament not found" }`

   ***

   ### 2.3 Matches

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

---

#### GET /api/matches/:id

**Description:** Get details of a specific match including the authenticated user's bet if exists.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Match ID

**Response Body:**

```json
{
  "data": {
    "id": 101,
    "tournament_id": 1,
    "home_team": "Real Madrid",
    "away_team": "Barcelona",
    "match_datetime": "2025-11-15T20:00:00Z",
    "status": "SCHEDULED",
    "result": null,
    "api_match_id": 12345,
    "can_bet": true,
    "betting_closes_at": "2025-11-15T19:55:00Z",
    "user_bet": {
      "id": 501,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null
    }
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Match not found" }`

---

</endpoint_description>

5. Endpoint Implementation:
   <endpoint_implementation>
   - [text](../.ai/get-matches-implementation-plan.md)
   - [text](../.ai/get-tournaments-implementation-plan.md)
   - [text](../.ai/put-bets-id-implementation-plan.md)
   - [text](../.ai/post-api-bets-implementation-plan.md)
     </endpoint_implementation>

6. Type Definitions:
   <type_definitions>
   [text](../src/types.ts)
   </type_definitions>

7. Tech Stack:
   <tech_stack>
   [text](../.ai/tech-stack.md)
   </tech_stack>

Przed utworzeniem ostatecznego planu wdrożenia przeprowadź analizę i planowanie wewnątrz tagów <implementation_breakdown> w swoim bloku myślenia. Ta sekcja może być dość długa, ponieważ ważne jest, aby być dokładnym.

W swoim podziale implementacji wykonaj następujące kroki:

1. Dla każdej sekcji wejściowej (PRD, User Stories, Endpoint Description, Endpoint Implementation, Type Definitions, Tech Stack):

- Podsumuj kluczowe punkty
- Wymień wszelkie wymagania lub ograniczenia
- Zwróć uwagę na wszelkie potencjalne wyzwania lub ważne kwestie

2. Wyodrębnienie i wypisanie kluczowych wymagań z PRD
3. Wypisanie wszystkich potrzebnych głównych komponentów, wraz z krótkim opisem ich opisu, potrzebnych typów, obsługiwanych zdarzeń i warunków walidacji
4. Stworzenie wysokopoziomowego diagramu drzewa komponentów
5. Zidentyfikuj wymagane DTO i niestandardowe typy ViewModel dla każdego komponentu widoku. Szczegółowo wyjaśnij te nowe typy, dzieląc ich pola i powiązane typy.
6. Zidentyfikuj potencjalne zmienne stanu i niestandardowe hooki, wyjaśniając ich cel i sposób ich użycia
7. Wymień wymagane wywołania API i odpowiadające im akcje frontendowe
8. Zmapuj każdej historii użytkownika do konkretnych szczegółów implementacji, komponentów lub funkcji
9. Wymień interakcje użytkownika i ich oczekiwane wyniki
10. Wymień warunki wymagane przez API i jak je weryfikować na poziomie komponentów
11. Zidentyfikuj potencjalne scenariusze błędów i zasugeruj, jak sobie z nimi poradzić
12. Wymień potencjalne wyzwania związane z wdrożeniem tego widoku i zasugeruj możliwe rozwiązania

Po przeprowadzeniu analizy dostarcz plan wdrożenia w formacie Markdown z następującymi sekcjami:

1. Przegląd: Krótkie podsumowanie widoku i jego celu.
2. Routing widoku: Określenie ścieżki, na której widok powinien być dostępny.
3. Struktura komponentów: Zarys głównych komponentów i ich hierarchii.
4. Szczegóły komponentu: Dla każdego komponentu należy opisać:

- Opis komponentu, jego przeznaczenie i z czego się składa
- Główne elementy HTML i komponenty dzieci, które budują komponent
- Obsługiwane zdarzenia
- Warunki walidacji (szczegółowe warunki, zgodnie z API)
- Typy (DTO i ViewModel) wymagane przez komponent
- Propsy, które komponent przyjmuje od rodzica (interfejs komponentu)

5. Typy: Szczegółowy opis typów wymaganych do implementacji widoku, w tym dokładny podział wszelkich nowych typów lub modeli widoku według pól i typów.
6. Zarządzanie stanem: Szczegółowy opis sposobu zarządzania stanem w widoku, określenie, czy wymagany jest customowy hook.
7. Integracja API: Wyjaśnienie sposobu integracji z dostarczonym punktem końcowym. Precyzyjnie wskazuje typy żądania i odpowiedzi.
8. Interakcje użytkownika: Szczegółowy opis interakcji użytkownika i sposobu ich obsługi.
9. Warunki i walidacja: Opisz jakie warunki są weryfikowane przez interfejs, których komponentów dotyczą i jak wpływają one na stan interfejsu
10. Obsługa błędów: Opis sposobu obsługi potencjalnych błędów lub przypadków brzegowych.
11. Kroki implementacji: Przewodnik krok po kroku dotyczący implementacji widoku.

Upewnij się, że Twój plan jest zgodny z PRD, historyjkami użytkownika i uwzględnia dostarczony stack technologiczny.

Ostateczne wyniki powinny być w języku polskim i zapisane w pliku o nazwie .ai/{view-name}-view-implementation-plan.md. Nie uwzględniaj żadnej analizy i planowania w końcowym wyniku.

Oto przykład tego, jak powinien wyglądać plik wyjściowy (treść jest do zastąpienia):

```markdown
# Plan implementacji widoku [Nazwa widoku]

## 1. Przegląd

[Krótki opis widoku i jego celu]

## 2. Routing widoku

[Ścieżka, na której widok powinien być dostępny]

## 3. Struktura komponentów

[Zarys głównych komponentów i ich hierarchii]

## 4. Szczegóły komponentów

### [Nazwa komponentu 1]

- Opis komponentu [opis]
- Główne elementy: [opis]
- Obsługiwane interakcje: [lista]
- Obsługiwana walidacja: [lista, szczegółowa]
- Typy: [lista]
- Propsy: [lista]

### [Nazwa komponentu 2]

[...]

## 5. Typy

[Szczegółowy opis wymaganych typów]

## 6. Zarządzanie stanem

[Opis zarządzania stanem w widoku]

## 7. Integracja API

[Wyjaśnienie integracji z dostarczonym endpointem, wskazanie typów żądania i odpowiedzi]

## 8. Interakcje użytkownika

[Szczegółowy opis interakcji użytkownika]

## 9. Warunki i walidacja

[Szczegółowy opis warunków i ich walidacji]

## 10. Obsługa błędów

[Opis obsługi potencjalnych błędów]

## 11. Kroki implementacji

1. [Krok 1]
2. [Krok 2]
3. [...]
```

Rozpocznij analizę i planowanie już teraz. Twój ostateczny wynik powinien składać się wyłącznie z planu wdrożenia w języku polskim w formacie markdown, który zapiszesz w pliku .ai/{view-name}-view-implementation-plan.md i nie powinien powielać ani powtarzać żadnej pracy wykonanej w podziale implementacji.
