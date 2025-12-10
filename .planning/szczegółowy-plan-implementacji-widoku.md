Jako starszy programista frontendu Twoim zadaniem jest stworzenie szczegółowego planu wdrożenia nowego widoku w aplikacji internetowej. Plan ten powinien być kompleksowy i wystarczająco jasny dla innego programisty frontendowego, aby mógł poprawnie i wydajnie wdrożyć widok.

Najpierw przejrzyj następujące informacje:

1. Product Requirements Document (PRD):
   <prd>
   [text](../.ai/prd.md)
   </prd>

2. Opis widoku:
   <view_description>

   ### 2.6. Widok Moich Zakładów

- **Ścieżka**: `/my-bets` (z opcjonalnym `?tournamentId=...`)
- **Główny cel**: Przegląd historii typowań użytkownika oraz statystyk skuteczności.
- **Kluczowe informacje**:
  - Lista wszystkich zakładów użytkownika.
  - Status zakładu (oczekujący, trafiony, pudło).
  - Mecz powiązany z zakładem (drużyny, data, wynik).
  - Statystyki skuteczności (trafienia, pudła, %).
- **Kluczowe komponenty**:
  - `BetList` (paginowana lista zakładów użytkownika).
  - `BetFilters` (filtr po turnieju, statusie: wszystkie/oczekujące/rozstrzygnięte).
  - `BetStats` (podsumowanie: liczba trafień, pudła, % skuteczności).
  - `BetCard` (pojedynczy zakład z informacjami o meczu i wyniku).
- **UX/Dostępność**:
  - Kolorowe oznaczenie trafionych (zielony) i nietrafionych (szary/czerwony) zakładów.
  - Możliwość usunięcia zakładu (tylko dla meczów, które jeszcze się nie rozpoczęły).
  - Przycisk szybkiego przejścia do meczu w widoku głównym.
       </view_description>

3. User Stories:
   <user_stories>
   - ID: US-011
    - Tytuł: Przeglądanie historii własnych zakładów
    - Opis: Jako zalogowany użytkownik, chcę mieć dostęp do pełnej historii moich typów wraz ze statystykami skuteczności, aby móc analizować swoje wyniki i śledzić postępy.
    - Kryteria akceptacji:
      - Użytkownik może przejść do widoku "Moje Typy" z głównej nawigacji.
      - Widok wyświetla listę wszystkich zakładów użytkownika z informacjami o meczu (drużyny, data, wynik).
      - Każdy zakład ma oznaczony status: oczekujący (mecz nie rozegrany), trafiony (zielony), pudło (szary/czerwony).
      - Użytkownik może filtrować zakłady po turnieju oraz statusie (wszystkie/oczekujące/rozstrzygnięte).
      - Widok zawiera podsumowanie statystyk: liczba trafień, liczba pudel, procent skuteczności.
      - Użytkownik może usunąć zakład tylko dla meczów, które jeszcze się nie rozpoczęły (więcej niż 5 minut do rozpoczęcia).
        </user_stories>

4. Endpoint Description:
   <endpoint_description>
### 2.4 Bets

#### GET /api/me/bets

**Description:** Retrieve all bets for the authenticated user.

**Authentication:** Required

**Query Parameters:**

- `tournament_id` (optional): Filter bets by tournament
- `match_id` (optional): Filter bet for specific match
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response Body:**

```json
{
  "data": [
    {
      "id": 501,
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "match_id": 101,
      "picked_result": "HOME_WIN",
      "created_at": "2025-11-10T14:30:00Z",
      "updated_at": null,
      "match": {
        "id": 101,
        "tournament_id": 1,
        "home_team": "Real Madrid",
        "away_team": "Barcelona",
        "match_datetime": "2025-11-15T20:00:00Z",
        "status": "SCHEDULED",
        "result": null
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`

---

#### POST /api/bets

**Description:** Create a new bet for a match. Only one bet per user per match is allowed.

**Authentication:** Required

**Request Body:**

```json
{
  "match_id": 101,
  "picked_result": "HOME_WIN"
}
```

**Validation Rules:**

- `match_id`: Required, must reference an existing match
- `picked_result`: Required, must be one of: `HOME_WIN`, `DRAW`, `AWAY_WIN`
- Match must have status `SCHEDULED`
- Match must start more than 5 minutes from now
- User cannot already have a bet on this match

**Response Body:**

```json
{
  "data": {
    "id": 501,
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "match_id": 101,
    "picked_result": "HOME_WIN",
    "created_at": "2025-11-10T14:30:00Z",
    "updated_at": null
  }
}
```

**Success Response:**

- **Code:** 201 Created
  - **Headers:** `Location: /api/bets/501`

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 400 Bad Request
  - **Message:** `{ "error": "Invalid request body", "details": [...] }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot bet on this match", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 409 Conflict
  - **Message:** `{ "error": "Bet already exists for this match" }`

---

#### PUT /api/bets/:id

**Description:** Update an existing bet. Only allowed if match hasn't started and is more than 5 minutes away.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Bet ID

**Request Body:**

```json
{
  "picked_result": "DRAW"
}
```

**Validation Rules:**

- `picked_result`: Required, must be one of: `HOME_WIN`, `DRAW`, `AWAY_WIN`
- Bet must belong to authenticated user
- Associated match must have status `SCHEDULED`
- Associated match must start more than 5 minutes from now

**Response Body:**

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

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot modify this bet", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Bet not found" }`

---

#### DELETE /api/bets/:id

**Description:** Delete an existing bet. Only allowed if match hasn't started and is more than 5 minutes away.

**Authentication:** Required

**URL Parameters:**

- `id` (required): Bet ID

**Validation Rules:**

- Bet must belong to authenticated user
- Associated match must have status `SCHEDULED`
- Associated match must start more than 5 minutes from now

**Response Body:**

```json
{
  "message": "Bet deleted successfully"
}
```

**Success Response:**

- **Code:** 200 OK

**Error Responses:**

- **Code:** 401 Unauthorized
  - **Message:** `{ "error": "Authentication required" }`
- **Code:** 403 Forbidden
  - **Message:** `{ "error": "Cannot delete this bet", "reason": "Match starts in less than 5 minutes" }`
- **Code:** 404 Not Found
  - **Message:** `{ "error": "Bet not found" }`

---
</endpoint_description>

5. Endpoint Implementation:
   <endpoint_implementation>
   - [text](../.ai/get-me-bets-implementation-plan.md)
  - [text](../.ai/put-bets-id-implementation-plan.md)
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
