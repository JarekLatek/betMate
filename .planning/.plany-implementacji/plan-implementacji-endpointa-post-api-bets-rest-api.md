Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest stworzenie szczegółowego planu wdrożenia punktu końcowego REST API. Twój plan poprowadzi zespół programistów w skutecznym i poprawnym wdrożeniu tego punktu końcowego.

Zanim zaczniemy, zapoznaj się z poniższymi informacjami:

1. Route API specification:
   <route_api_specification>

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
    </route_api_specification>

2. Related database resources:
   <related_db_resources>

   #### Bets

**Field Validation:**

- `match_id`: Required, must reference existing match
- `picked_result`: Required, must be enum value (`HOME_WIN`, `DRAW`, `AWAY_WIN`)

**Business Rule Validation:**

1. **Time Lock:** Match must start more than 5 minutes from now
2. **Match Status:** Match must have status `SCHEDULED`
3. **One Bet Per Match:** Unique constraint on (user_id, match_id)
4. **Ownership:** User can only create/modify their own bets

**RLS Policy Enforcement:**

```sql
-- From bets_insert_own policy
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_id
    AND matches.match_datetime > (now() + interval '5 minutes')
    AND matches.status = 'SCHEDULED'
  )
)
```

**Related Tables:**

- `bets` table: Stores user predictions
- `matches` table: Referenced by match_id foreign key
- `profiles` table: Referenced by user_id foreign key (auth.uid())

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

Pamiętaj, aby zapisać swój plan wdrożenia jako .ai/[nazwa-endpointa]-implementation-plan.md. Upewnij się, że plan jest szczegółowy, przejrzysty i zapewnia kompleksowe wskazówki dla zespołu programistów.

```

```

```
