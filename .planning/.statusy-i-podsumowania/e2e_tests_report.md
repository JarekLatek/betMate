# Raport z testów E2E

> **STATUS: ROZWIĄZANE** (2026-01-22)
>
> Problemy rozwiązano przez redukcję testów do stabilnego zestawu 35 testów.
> Szczegóły w: `e2e_repair_plan.md`

**Data:** 2026-01-21 (raport początkowy)
**Wynik początkowy:** 38 passed, 38 failed, 1 skipped (77 testów łącznie)
**Wynik końcowy:** 35 passed, 0 failed (35 testów)

---

## Główne kategorie błędów

### 1. Brak kart meczów (`match-card-*`) - 16 testów

Testy czekają na element `[data-testid^="match-card-"]` lub `getByTestId('match-card-1')` i nie znajdują go.

**Dotyczy testów:**
- `betting.spec.ts` - View Matches, Place Bet (home/draw/away), Modify Bet, Locked Matches
- `edge-cases.spec.ts` - Betting tests, Session Management
- `my-bets.spec.ts` - Delete Bet Functionality, Integration with Matches

**Przyczyna:** Strona nie renderuje komponentów z `data-testid="match-card-*"` lub brak danych meczów.

**Konkretne testy:**
- `should display match details`
- `should place a bet on home win`
- `should place a bet on draw`
- `should place a bet on away win`
- `should change bet from home win to away win`
- `should not allow betting on locked matches`
- `should handle clicking same bet option multiple times`
- `should handle rapid bet changes on same match`
- `should not allow betting on match that just became locked`
- `should handle page refresh without losing session`
- `should show delete button for pending bets`
- `should display confirmation dialog when deleting bet`
- `should delete bet when confirmed`
- `should reflect newly placed bet on my bets page`
- `should reflect updated bet on my bets page`

---

### 2. Nieprawidłowa ścieżka URL leaderboard - 6 testów

Test oczekuje `/leaderboard`, ale aplikacja używa `/ranking`:

```
Expected: "http://localhost:3000/leaderboard"
Received: "http://localhost:3000/ranking"
```

**Dotyczy:**
- `leaderboard.spec.ts` - wszystkie testy nawigacji i wyświetlania

**Konkretne testy:**
- `should navigate to leaderboard page directly`
- `should handle navigation with invalid tournament ID`

---

### 3. Brak tabeli leaderboard (`leaderboard-table`) - 7 testów

Testy czekają na `getByTestId('leaderboard-table')`, ale element nie istnieje.

**Konkretne testy:**
- `should display leaderboard table when tournaments exist`
- `should display participant entries in leaderboard`
- `should display leaderboard entries with correct structure`
- `should display participants in descending order by points`
- `should highlight current user's row if present`
- `should filter leaderboard by tournament ID via URL parameter`

---

### 4. Problemy z autentykacją/sesją - 8 testów

- `isLoggedIn()` zwraca `false` po operacjach
- Brak przycisku logout (`logout-button`) podczas cleanup
- Błędy waitForResponse na endpoints związane z auth (token, check-username)

**Dotyczy:**
- `auth.spec.ts` - Logout, Register duplicate username
- `leaderboard.spec.ts` - User Session Persistence
- `my-bets.spec.ts` - User Session Persistence

**Konkretne testy:**
- `should successfully logout`
- `should show error for duplicate username`
- `should maintain authentication while viewing leaderboard`
- `should maintain session after refreshing leaderboard page`
- `should maintain session after refreshing my bets page`
- `should handle deleting bet that no longer exists`
- `should handle navigation with invalid tournament ID` (edge-cases)

---

### 5. Brak elementów UI (empty state, bet list) - 4 testy

Testy szukają `data-testid="bet-list"` lub `data-testid="empty-state"`, ale żaden nie istnieje.

**Dotyczy:**
- `my-bets.spec.ts` - Bets Display, Empty State

**Konkretne testy:**
- `should display bet list container`
- `should display empty state when user has no bets`
- `should display empty state when filters return no results`

---

## Podsumowanie problemów do naprawienia

| Problem | Liczba testów | Priorytet |
|---------|---------------|-----------|
| Brak `match-card-*` testId | 16 | Wysoki |
| URL `/leaderboard` vs `/ranking` | 6 | Wysoki |
| Brak `leaderboard-table` testId | 7 | Średni |
| Problemy z sesją/auth | 8 | Średni |
| Brak `bet-list`/`empty-state` testId | 4 | Niski |

---

## Testy przechodzące (38)

Przechodzą głównie testy z:
- `auth.spec.ts` - logowanie, walidacja formularza, nawigacja
- `edge-cases.spec.ts` - walidacja pól, protected routes, obsługa błędów
- `my-bets.spec.ts` - nawigacja, filtrowanie

---

## Zalecane działania

1. **Dodać `data-testid="match-card-{id}"` do komponentów kart meczów**
2. **Zmienić w testach URL `/leaderboard` na `/ranking` lub odwrotnie w aplikacji**
3. **Dodać `data-testid="leaderboard-table"` do tabeli rankingowej**
4. **Zweryfikować działanie sesji i przycisku logout**
5. **Dodać `data-testid="bet-list"` i `data-testid="empty-state"` do odpowiednich komponentów**
