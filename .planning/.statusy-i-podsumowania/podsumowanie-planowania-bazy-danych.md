<conversation_summary>
<decisions>

1. Zgodzono się na utworzenie tabeli `profiles` do przechowywania publicznych danych użytkownika, oddzielonej od `auth.users`.
2. Zdecydowano o użyciu typu `ENUM` dla wyników meczów (`match_outcome`) w celu zapewnienia spójności danych.
3. Zaakceptowano dodanie ograniczenia `UNIQUE` na parze `(user_id, match_id)` w tabeli `bets`, aby uniemożliwić podwójne zakłady.
4. Zgodzono się na wdrożenie polityki RLS, która blokuje edycję zakładu na 5 minut przed rozpoczęciem meczu.
5. Zdecydowano o utworzeniu zdenormalizowanej tabeli `scores` do przechowywania rankingów, aktualizowanej przez Edge Function.
6. Zaakceptowano strategię indeksowania kluczy obcych oraz kolumn używanych do filtrowania i sortowania (`match_datetime`, `points`).
7. Zgodzono się na użycie kolumny ze statusem meczu (np. `ENUM match_status`), aby poprawnie zarządzać logiką obliczania punktów.
8. Zdecydowano o użyciu `ON DELETE CASCADE` dla kluczy obcych powiązanych z `auth.users.id`, aby zapewnić integralność danych po usunięciu użytkownika.
9. Zaakceptowano polityki RLS, które ograniczają dostęp do zakładów (`bets`) tylko do ich właścicieli, jednocześnie pozwalając na publiczny odczyt rankingów (`scores`) i profili (`profiles`).
10. Zdecydowano o przechowywaniu zewnętrznych identyfikatorów z API w tabelach `tournaments` i `matches` w celu ułatwienia synchronizacji danych.
11. Zgodzono się na automatyczne tworzenie profilu użytkownika za pomocą triggera i funkcji PostgreSQL po rejestracji w `auth.users`.
12. Zdecydowano o używaniu typu `TIMESTAMPTZ` dla dat meczów, przechowując je w UTC.
13. Zaakceptowano dodanie flagi `is_scored` w tabeli `matches`, aby uniknąć wielokrotnego przyznawania punktów.
14. Zdefiniowano strukturę tabeli `scores` z kluczem złożonym `(user_id, tournament_id)` i kolumną `points`.
15. Sprecyzowano politykę RLS dla tabeli `bets`, łącząc warunki `USING` i `WITH CHECK` w celu zarządzania uprawnieniami.
16. Zdecydowano o przygotowaniu skryptu "seed" do początkowego zasilenia tabeli `tournaments`.
17. Ustalono, że do obsługi remisów w rankingu wystarczy standardowa funkcja okna `RANK()` w SQL.
18. Zdefiniowano szczegółowy zestaw statusów dla meczów (`SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`) i ich wpływ na logikę.
19. Zgodzono się na ustawienie wartości domyślnych (`DEFAULT`) dla kolumn takich jak `points`, `created_at` i `is_scored`.
20. Sprecyzowano polityki RLS dla tabel `profiles` i `scores`, zezwalając na odczyt dla wszystkich uwierzytelnionych użytkowników i blokując modyfikacje.
    </decisions>

<matched_recommendations>

1. Utwórz tabelę `profiles` z jednokierunkową relacją do `auth.users` do przechowywania danych publicznych.
2. Zdefiniuj niestandardowy typ `ENUM` (`match_outcome`) dla wyników meczów.
3. Dodaj ograniczenie `UNIQUE` na `(user_id, match_id)` w tabeli `bets`.
4. Zastosuj politykę RLS dla operacji `UPDATE` na tabeli `bets`, aby blokować edycję na 5 minut przed meczem.
5. Utwórz tabelę `scores` do przechowywania zagregowanych punktów, aktualizowaną przez Edge Function.
6. Utwórz indeksy na kluczach obcych oraz kolumnach `match_datetime` i `scores.points`.
7. Użyj typu `ENUM` (`match_status`) do zarządzania statusami meczów i logiką punktacji.
8. Zastosuj `ON DELETE CASCADE` dla relacji `profiles.id` -> `auth.users.id` oraz `bets.user_id` -> `profiles.id`.
9. Zastosuj polityki RLS: ograniczony dostęp do `bets` i publiczny (dla zalogowanych) dostęp do `scores` i `profiles`.
10. Przechowuj zewnętrzne identyfikatory z `api-football.com` w tabelach `tournaments` i `matches`.
11. Stwórz funkcję i trigger w PostgreSQL do automatycznego tworzenia profilu po rejestracji użytkownika.
12. Użyj typu danych `TIMESTAMPTZ` dla dat meczów, przechowując je w UTC.
13. Dodaj kolumnę `is_scored` typu `BOOLEAN` do tabeli `matches`, aby zapobiec ponownemu punktowaniu.
14. Zdefiniuj tabelę `scores` z kluczem złożonym `(user_id, tournament_id)`.
15. Zaimplementuj szczegółową politykę RLS dla tabeli `bets` z warunkami `USING` i `WITH CHECK`.
16. Przygotuj skrypt "seed" SQL do zasilenia tabeli `tournaments`.
17. Użyj funkcji okna `RANK()` do obsługi remisów w rankingu.
18. Zdefiniuj `ENUM` `match_status` z wartościami: `SCHEDULED`, `IN_PLAY`, `FINISHED`, `POSTPONED`, `CANCELED`.
19. Ustaw wartości `DEFAULT` dla kolumn `points`, `created_at` i `is_scored`.
20. Zdefiniuj polityki RLS dla `profiles` i `scores` zezwalające na odczyt dla uwierzytelnionych użytkowników (`auth.role() = 'authenticated'`).
    </matched_recommendations>

<database_planning_summary>
Na podstawie wymagań produktu i dyskusji, schemat bazy danych PostgreSQL dla MVP aplikacji betMate zostanie zaprojektowany w następujący sposób:

**a. Główne wymagania dotyczące schematu bazy danych**
Schemat będzie wspierał uwierzytelnianie użytkowników, obstawianie meczów, automatyczne obliczanie punktów i publiczne rankingi. Baza danych zostanie zoptymalizowana pod kątem wydajności zapytań o rankingi i bezpieczeństwa danych użytkowników.

**b. Kluczowe encje i ich relacje**

- **Custom Types**:
  - `match_outcome`: `ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN')`
  - `match_status`: `ENUM ('SCHEDULED', 'IN_PLAY', 'FINISHED', 'POSTPONED', 'CANCELED')`

- **`profiles`**: Przechowuje publiczne dane użytkowników.
  - `id` (UUID, PK, FK do `auth.users.id` z `ON DELETE CASCADE`)
  - `username` (TEXT, UNIQUE)
  - `created_at` (TIMESTAMPTZ, `DEFAULT now()`)
  - _Automatyzacja_: Trigger na `auth.users` będzie automatycznie tworzył profil dla nowego użytkownika.

- **`tournaments`**: Przechowuje informacje o turniejach.
  - `id` (BIGINT, PK, GENERATED ALWAYS AS IDENTITY)
  - `name` (TEXT, NOT NULL)
  - `api_tournament_id` (BIGINT, UNIQUE)

- **`matches`**: Zawiera dane o meczach.
  - `id` (BIGINT, PK, GENERATED ALWAYS AS IDENTITY)
  - `tournament_id` (BIGINT, FK do `tournaments.id`)
  - `match_datetime` (TIMESTAMPTZ, NOT NULL) - Przechowywane w UTC.
  - `status` (`match_status`, NOT NULL)
  - `result` (`match_outcome`, NULL)
  - `api_match_id` (BIGINT, UNIQUE)
  - `is_scored` (BOOLEAN, `DEFAULT FALSE`)

- **`bets`**: Przechowuje zakłady użytkowników.
  - `id` (BIGINT, PK, GENERATED ALWAYS AS IDENTITY)
  - `user_id` (UUID, FK do `profiles.id` z `ON DELETE CASCADE`)
  - `match_id` (BIGINT, FK do `matches.id`)
  - `picked_result` (`match_outcome`, NOT NULL)
  - `created_at` (TIMESTAMPTZ, `DEFAULT now()`)
  - `updated_at` (TIMESTAMPTZ)
  - _Ograniczenia_: `UNIQUE(user_id, match_id)`

- **`scores`**: Zdenormalizowana tabela do przechowywania punktów i rankingów.
  - `user_id` (UUID, FK do `profiles.id`)
  - `tournament_id` (BIGINT, FK do `tournaments.id`)
  - `points` (INT, `DEFAULT 0`, `CHECK (points >= 0)`)
  - `updated_at` (TIMESTAMPTZ)
  - _Klucz główny_: `PRIMARY KEY (user_id, tournament_id)`

**c. Ważne kwestie dotyczące bezpieczeństwa i skalowalności**

- **Row-Level Security (RLS)**:
  - **`bets`**: Użytkownicy mogą zarządzać (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) tylko swoimi zakładami (`auth.uid() = user_id`). Aktualizacja jest dodatkowo ograniczona do 5 minut przed rozpoczęciem meczu.
  - **`profiles` & `scores`**: Wszyscy uwierzytelnieni użytkownicy (`auth.role() = 'authenticated'`) mają dostęp do odczytu (`SELECT`), co umożliwia wyświetlanie publicznych rankingów. Modyfikacje są zablokowane na poziomie RLS.

- **Wydajność i Skalowalność**:
  - **Indeksowanie**: Kluczowe kolumny, w tym wszystkie klucze obce, `matches.match_datetime` i `scores.points`, zostaną zindeksowane w celu przyspieszenia zapytań.
  - **Automatyzacja**: Obliczanie punktów będzie realizowane przez asynchroniczną funkcję brzegową (Supabase Edge Function), która przetwarza zakończone mecze (`status = 'FINISHED'`) z flagą `is_scored = FALSE`, a następnie aktualizuje tabelę `scores`. To odciąża bazę danych od kosztownych obliczeń w czasie rzeczywistym.

**d. Wszelkie nierozwiązane kwestie lub obszary wymagające dalszego wyjaśnienia**
Na tym etapie planowania wszystkie kluczowe kwestie dotyczące schematu bazy danych, bezpieczeństwa i logiki biznesowej dla MVP zostały omówione i uzgodnione. Nie ma nierozwiązanych problemów. Następnym krokiem jest implementacja schematu za pomocą skryptów migracyjnych SQL.
</database_planning_summary>

<unresolved_issues>
Brak nierozwiązanych kwestii na tym etapie.
</unresolved_issues>
</conversation_summary>

---

Jesteś asystentem AI, którego zadaniem jest podsumowanie rozmowy na temat planowania bazy danych dla MVP i przygotowanie zwięzłego podsumowania dla następnego etapu rozwoju. W historii konwersacji znajdziesz następujące informacje:

1. Dokument wymagań produktu (PRD)
2. Informacje o stacku technologicznym
3. Historia rozmów zawierająca pytania i odpowiedzi
4. Zalecenia dotyczące modelu

Twoim zadaniem jest:

1. Podsumować historii konwersacji, koncentrując się na wszystkich decyzjach związanych z planowaniem bazy danych.
2. Dopasowanie zaleceń modelu do odpowiedzi udzielonych w historii konwersacji. Zidentyfikuj, które zalecenia są istotne w oparciu o dyskusję.
3. Przygotuj szczegółowe podsumowanie rozmowy, które obejmuje:
   a. Główne wymagania dotyczące schematu bazy danych
   b. Kluczowe encje i ich relacje
   c. Ważne kwestie dotyczące bezpieczeństwa i skalowalności
   d. Wszelkie nierozwiązane kwestie lub obszary wymagające dalszego wyjaśnienia
4. Sformatuj wyniki w następujący sposób:

<conversation_summary>
<decisions>
[Wymień decyzje podjęte przez użytkownika, ponumerowane].
</decisions>

<matched_recommendations>
[Lista najistotniejszych zaleceń dopasowanych do rozmowy, ponumerowanych]
</matched_recommendations>

<database_planning_summary> [Podsumowanie planowania bazy danych]
[Podaj szczegółowe podsumowanie rozmowy, w tym elementy wymienione w kroku 3].
</database_planning_summary>

<unresolved_issues>
[Wymień wszelkie nierozwiązane kwestie lub obszary wymagające dalszych wyjaśnień, jeśli takie istnieją]
</unresolved_issues>
</conversation_summary>

Końcowy wynik powinien zawierać tylko treść w formacie markdown. Upewnij się, że Twoje podsumowanie jest jasne, zwięzłe i zapewnia cenne informacje dla następnego etapu planowania bazy danych.
