# Architektura UI dla betMate

## 1. Przegląd struktury UI

Interfejs użytkownika aplikacji betMate został zaprojektowany zgodnie z podejściem "Mobile First", kładąc nacisk na szybkość działania i intuicyjność obsługi na urządzeniach przenośnych, przy jednoczesnym zachowaniu pełnej funkcjonalności na komputerach stacjonarnych.

Architektura opiera się na frameworku **Astro 5** (SSR) z wykorzystaniem **React 19** dla interaktywnych elementów ("wysp"). Warstwa wizualna wykorzystuje **Tailwind 4** oraz bibliotekę komponentów **Shadcn/ui**.

Kluczowe założenia:

- **Globalny kontekst turnieju**: Wybór turnieju odbywa się w nagłówku i wpływa na treść głównych widoków (Mecze, Ranking) poprzez parametr URL `?tournamentId=...`.
- **Nawigacja kontekstowa**: Dostosowana do urządzenia (Dolny pasek na mobile, Nagłówek na desktop).
- **Optymistyczne UI**: Natychmiastowa reakcja interfejsu na akcje użytkownika (np. obstawianie) z obsługą błędów w tle.

## 2. Lista widoków

### 2.1. Ekran Logowania / Rejestracji

- **Ścieżka**: `/login`, `/register`
- **Główny cel**: Uwierzytelnienie użytkownika lub utworzenie nowego konta.
- **Kluczowe informacje**: Formularze logowania/rejestracji, komunikaty błędów walidacji.
- **Kluczowe komponenty**:
  - `AuthForm` (komponent React z obsługą Supabase Auth).
  - Linki przełączające między logowaniem a rejestracją.
- **UX/Bezpieczeństwo**: Walidacja haseł po stronie klienta, jasne komunikaty błędów, przekierowanie do `/` po sukcesie.

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

### 2.3. Widok Rankingu

- **Ścieżka**: `/leaderboard` (z opcjonalnym `?tournamentId=...`)
- **Główny cel**: Prezentacja pozycji użytkowników w wybranym turnieju.
- **Kluczowe informacje**: Pozycja, Nazwa użytkownika, Liczba punktów.
- **Kluczowe komponenty**:
  - `LeaderboardTable` (lista wirtualizowana lub paginowana).
  - `StickyUserRow` (przypięty wiersz z wynikiem zalogowanego użytkownika na dole ekranu).
- **UX**: Wyróżnienie wiersza zalogowanego użytkownika. Sticky footer zapewnia, że użytkownik zawsze widzi swój wynik bez konieczności przewijania.

### 2.4. Widok Profilu

- **Ścieżka**: `/profile`
- **Główny cel**: Zarządzanie kontem użytkownika.
- **Kluczowe informacje**: Nazwa użytkownika, E-mail, Podsumowanie punktów.
- **Kluczowe komponenty**:
  - `ProfileDetails` (read-only info).
  - `ChangePasswordForm`.
  - Przycisk "Wyloguj".
- **Bezpieczeństwo**: Wymagane ponowne uwierzytelnienie przy zmianie hasła (jeśli wymagane przez Supabase) lub bezpieczna sesja.

### 2.5. Modal Zasad Gry

- **Ścieżka**: Dostępny globalnie (nakładka).
- **Główny cel**: Wyjaśnienie zasad punktacji.
- **Kluczowe informacje**: Punktacja (1 pkt za trafienie), zasady blokady (5 min przed), obsługa odwołanych meczów.
- **Kluczowe komponenty**: `RulesModal` (Dialog z Shadcn/ui).

## 3. Mapa podróży użytkownika

### Scenariusz Główny: Codzienne Obstawianie

1.  **Wejście**: Użytkownik wchodzi na stronę główną `/`.
2.  **Auth Check**:
    - Jeśli niezalogowany -> Przekierowanie do `/login`.
    - Jeśli zalogowany -> Wyświetlenie listy meczów dla domyślnego/ostatniego turnieju.
3.  **Wybór Turnieju**: Użytkownik klika w dropdown w nagłówku i wybiera np. "MŚ 2026". URL zmienia się, lista meczów odświeża się.
4.  **Przeglądanie**: Użytkownik scrolluje listę "Nadchodzące".
5.  **Obstawianie**:
    - Użytkownik klika "1" przy meczu Polska - Argentyna.
    - UI natychmiast podświetla wybór (Optimistic UI).
    - W tle wysyłane jest żądanie `POST /api/bets`.
    - Jeśli sukces -> brak akcji. Jeśli błąd -> cofnięcie zmiany i Toast z błędem.
6.  **Sprawdzenie Wyników**:
    - Użytkownik przełącza filtr na "Zakończone".
    - Widzi mecz z wczoraj. Karta jest zielona z uśmiechniętą buźką (trafiony typ).
7.  **Sprawdzenie Rankingu**:
    - Użytkownik klika "Ranking" w dolnym pasku nawigacji.
    - Widzi tabelę. Jego wiersz jest przyklejony na dole ekranu.

## 4. Układ i struktura nawigacji

### Layout Główny (`MainLayout.astro`)

Struktura layoutu zmienia się w zależności od szerokości ekranu (Responsive Design).

#### Desktop (> 768px)

- **Nagłówek (Sticky Top)**:
  - Lewa: Logo betMate.
  - Środek: Linki nawigacyjne [Mecze | Ranking].
  - Prawa:
    - `TournamentSelector` (Dropdown).
    - `UserMenu` (Avatar -> Dropdown: Profil, Zasady, Dark Mode, Wyloguj).
- **Content**: Centralna kolumna o maksymalnej szerokości (np. `max-w-3xl`).

#### Mobile (< 768px)

- **Nagłówek (Sticky Top)**:
  - Lewa: Logo (ikona).
  - Środek: `TournamentSelector` (skrócona nazwa).
  - Prawa: `UserMenu` (Avatar).
- **Content**: Pełna szerokość z paddingiem.
- **Dolny Pasek Nawigacyjny (Fixed Bottom)**:
  - Ikona + Etykieta: "Mecze" (kieruje do `/`).
  - Ikona + Etykieta: "Ranking" (kieruje do `/leaderboard`).
  - Aktywny element jest wyróżniony kolorem akcentowym.

## 5. Kluczowe komponenty

### 5.1. `TournamentSelector`

Dropdown (Select z Shadcn/ui) umieszczony w nagłówku.

- Pobiera listę turniejów z `GET /api/tournaments`.
- Po zmianie aktualizuje parametr URL `?tournamentId=ID`.
- Zachowuje stan wyboru między przejściami stron (dzięki URL).

### 5.2. `MatchCard`

Karta reprezentująca pojedynczy mecz.

- **Stan "Przed meczem"**: Wyświetla przyciski `BetToggle` (1, X, 2).
  - Logika blokady: Jeśli `now() > match_start - 5min`, przyciski są `disabled`, a na karcie pojawia się ikona kłódki.
- **Stan "Po meczu"**: Wyświetla wynik końcowy (np. 2:1).
  - Wizualizacja zakładu użytkownika: Porównanie typu z wynikiem.
  - Stylizacja: Zielone tło/obramowanie dla trafienia, szare dla pudła.

### 5.3. `BetToggle`

Grupa trzech przycisków (Toggle Group).

- Obsługuje stany: `selected`, `unselected`, `disabled`, `loading`.
- Kliknięcie wyzwala mutację (React Query) do API.

### 5.4. `LeaderboardTable`

Tabela prezentująca ranking.

- Kolumny: # (Pozycja), Gracz (Avatar + Nick), Pkt (Punkty).
- Wiersze parzyste/nieparzyste dla czytelności.
- Wyróżnienie wiersza "Ty" (np. pogrubienie, inny kolor tła).

### 5.5. `StickyUserRow`

Komponent React renderowany warunkowo w widoku rankingu.

- Pobiera pozycję zalogowanego użytkownika.
- Jest pozycjonowany `fixed bottom-0` (nad dolnym paskiem nawigacji na mobile).
- Zapewnia szybki podgląd własnego wyniku bez scrollowania.
