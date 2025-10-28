# Schemat Bazy Danych PostgreSQL - betMate MVP

## Integracja z Supabase Auth

Aplikacja wykorzystuje **Supabase Auth** do zarządzania uwierzytelnianiem użytkowników. Supabase Auth automatycznie tworzy i zarządza schematem `auth` z tabelą `auth.users`, która przechowuje dane uwierzytelniania (email, hasło, metadata).

### Kluczowe punkty integracji:

1. **Rejestracja użytkownika** (FR-001):
   - Użytkownik rejestruje się podając email, hasło i nazwę użytkownika
   - Supabase Auth tworzy rekord w `auth.users`
   - Trigger automatycznie tworzy odpowiadający profil w tabeli `public.profiles`
   - Username jest przekazywany jako `raw_user_meta_data` podczas rejestracji

2. **Uwierzytelnianie**:
   - Logowanie odbywa się przez Supabase Auth (email + hasło)
   - `auth.uid()` zwraca UUID zalogowanego użytkownika
   - RLS policies używają `auth.uid()` do weryfikacji uprawnień

3. **Relacja auth.users ↔ profiles**:
   - `profiles.id` to klucz obcy do `auth.users.id`
   - Relacja 1:1 (jeden użytkownik auth = jeden profil publiczny)
   - `ON DELETE CASCADE` zapewnia usunięcie profilu gdy użytkownik zostanie usunięty z auth.users

## 1. Custom Types (ENUM)

### match_outcome

```sql
CREATE TYPE match_outcome AS ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN');
```

### match_status

```sql
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'IN_PLAY', 'FINISHED', 'POSTPONED', 'CANCELED');
```

## 2. Tabele

### profiles

Przechowuje publiczne dane użytkowników.

| Kolumna    | Typ         | Ograniczenia            | Opis                                      |
| ---------- | ----------- | ----------------------- | ----------------------------------------- |
| id         | UUID        | PRIMARY KEY             | Klucz główny, referencja do auth.users.id |
| username   | TEXT        | NOT NULL, UNIQUE        | Unikalna nazwa użytkownika                |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Data utworzenia profilu                   |

**Klucze obce:**

- `id` → `auth.users.id` (ON DELETE CASCADE)

**Indeksy:**

- PRIMARY KEY na `id`
- UNIQUE INDEX na `username`

### tournaments

Przechowuje informacje o turniejach.

| Kolumna           | Typ    | Ograniczenia                              | Opis                                      |
| ----------------- | ------ | ----------------------------------------- | ----------------------------------------- |
| id                | BIGINT | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | Klucz główny                              |
| name              | TEXT   | NOT NULL                                  | Nazwa turnieju                            |
| api_tournament_id | BIGINT | UNIQUE                                    | Identyfikator turnieju z api-football.com |

**Indeksy:**

- PRIMARY KEY na `id`
- UNIQUE INDEX na `api_tournament_id`

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

### bets

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

**Ograniczenia:**

- UNIQUE(`user_id`, `match_id`) - jeden użytkownik może postawić tylko jeden zakład na dany mecz

**Indeksy:**

- PRIMARY KEY na `id`
- INDEX na `user_id`
- INDEX na `match_id`
- UNIQUE INDEX na `(user_id, match_id)`

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

## 3. Relacje między tabelami

### profiles (1) ← (N) bets

- Jeden użytkownik może mieć wiele zakładów
- Usunięcie użytkownika powoduje usunięcie wszystkich jego zakładów (CASCADE)

### profiles (1) ← (N) scores

- Jeden użytkownik może mieć wiele wpisów w tabeli scores (po jednym na turniej)
- Usunięcie użytkownika powoduje usunięcie wszystkich jego wyników (CASCADE)

### tournaments (1) ← (N) matches

- Jeden turniej zawiera wiele meczów
- Relacja bez CASCADE - turniej nie powinien być usuwany, jeśli istnieją mecze

### tournaments (1) ← (N) scores

- Jeden turniej ma wiele wpisów z wynikami użytkowników
- Relacja bez CASCADE - turniej nie powinien być usuwany, jeśli istnieją wyniki

### matches (1) ← (N) bets

- Jeden mecz może mieć wiele zakładów od różnych użytkowników
- Relacja bez CASCADE - mecz nie powinien być usuwany, jeśli istnieją zakłady

### auth.users (1) → (1) profiles

- Jeden użytkownik w systemie auth ma jeden profil publiczny
- Usunięcie użytkownika z auth.users powoduje usunięcie profilu (CASCADE)

## 4. Row-Level Security (RLS) Policies

### profiles

```sql
-- Włączenie RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Wszyscy uwierzytelnieni użytkownicy mogą odczytywać profile
CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Tylko właściciel może aktualizować swój profil (na przyszłość)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### tournaments

```sql
-- Włączenie RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Wszyscy uwierzytelnieni użytkownicy mogą odczytywać turnieje
CREATE POLICY "tournaments_select_authenticated" ON tournaments
  FOR SELECT
  TO authenticated
  USING (true);

-- Tylko serwis może modyfikować turnieje (przez service_role)
```

### matches

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

### bets

```sql
-- Włączenie RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Użytkownik może odczytywać tylko swoje zakłady
CREATE POLICY "bets_select_own" ON bets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Użytkownik może wstawiać zakłady tylko dla siebie
-- z warunkiem, że mecz rozpoczyna się za więcej niż 5 minut
CREATE POLICY "bets_insert_own" ON bets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.match_datetime > (now() + interval '5 minutes')
      AND matches.status = 'SCHEDULED'
    )
  );

-- Użytkownik może aktualizować swoje zakłady
-- z warunkiem, że mecz rozpoczyna się za więcej niż 5 minut
CREATE POLICY "bets_update_own" ON bets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.match_datetime > (now() + interval '5 minutes')
      AND matches.status = 'SCHEDULED'
    )
  );

-- Użytkownik może usuwać swoje zakłady
-- z warunkiem, że mecz rozpoczyna się za więcej niż 5 minut
CREATE POLICY "bets_delete_own" ON bets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.match_datetime > (now() + interval '5 minutes')
      AND matches.status = 'SCHEDULED'
    )
  );
```

### scores

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

## 5. Triggery i Funkcje

### Automatyczne tworzenie profilu po rejestracji

```sql
-- Funkcja tworząca profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger wywoływany po wstawieniu nowego użytkownika
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Automatyczna aktualizacja updated_at

```sql
-- Funkcja aktualizująca updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla tabeli bets
CREATE TRIGGER set_updated_at_bets
  BEFORE UPDATE ON bets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger dla tabeli scores
CREATE TRIGGER set_updated_at_scores
  BEFORE UPDATE ON scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## 6. Dodatkowe uwagi i wyjaśnienia

### Integracja z Supabase Auth

- Aplikacja używa **Supabase Auth** jako systemu uwierzytelniania (zgodnie z FR-001)
- Tabela `auth.users` jest zarządzana automatycznie przez Supabase
- Podczas rejestracji przez Supabase Auth SDK:
  ```typescript
  const { data, error } = await supabase.auth.signUp({
    email: "user@example.com",
    password: "password",
    options: {
      data: {
        username: "chosen_username",
      },
    },
  });
  ```
- Username przekazany w `options.data` jest zapisywany w `auth.users.raw_user_meta_data`
- Trigger `on_auth_user_created` automatycznie tworzy profil w `public.profiles`
- Funkcje RLS wykorzystują `auth.uid()` do identyfikacji zalogowanego użytkownika
- Użytkownik musi być uwierzytelniony (`auth.role() = 'authenticated'`) aby korzystać z aplikacji

### Bezpieczeństwo

- Wszystkie tabele mają włączone RLS (Row-Level Security)
- Dostęp do modyfikacji danych systemowych (tournaments, matches, scores) jest możliwy tylko przez service_role
- Użytkownicy mogą zarządzać tylko swoimi zakładami
- Publiczne rankingi są dostępne dla wszystkich uwierzytelnionych użytkowników

### Wydajność

- Indeksy zostały dodane na wszystkich kluczach obcych
- Dodatkowe indeksy na kolumnach używanych do filtrowania (match_datetime, status, points)
- Tabela scores jest zdenormalizowana w celu optymalizacji zapytań o rankingi
- Indeks na is_scored w tabeli matches przyspiesza wyszukiwanie meczów do punktowania

### Automatyzacja

- Profile użytkowników są tworzone automatycznie po rejestracji przez trigger
- Kolumny updated_at są automatycznie aktualizowane przez triggery
- Punkty są obliczane przez Edge Function uruchamianą co 2 godziny, która:
  1. Znajduje mecze ze statusem 'FINISHED' i is_scored = FALSE
  2. Dla każdego takiego meczu porównuje zakłady użytkowników z wynikiem
  3. Aktualizuje tabelę scores
  4. Ustawia is_scored = TRUE dla przetworzonych meczów

### Obsługa stref czasowych

- Wszystkie timestamps są przechowywane w formacie TIMESTAMPTZ (z informacją o strefie czasowej)
- Daty meczów są przechowywane w UTC
- Konwersja na lokalną strefę czasową użytkownika odbywa się na poziomie aplikacji

### Obsługa meczów odwołanych/przełożonych

- Mecze ze statusem 'POSTPONED' lub 'CANCELED' nie są brane pod uwagę przy obliczaniu punktów
- Zakłady na takie mecze pozostają w bazie, ale nie wpływają na ranking
- Edge Function pomija mecze z tymi statusami

### Scalability considerations

- Użycie BIGINT dla id w tabelach o wysokim potencjale wzrostu (matches, bets)
- Denormalizacja tabeli scores redukuje konieczność kosztownych agregatów
- Indeksy zostały zaprojektowane z myślą o najczęstszych zapytaniach:
  - Pobieranie nadchodzących meczów dla turnieju
  - Pobieranie rankingu dla turnieju (sortowanie po points)
  - Sprawdzanie zakładów użytkownika dla konkretnego meczu
  - Wyszukiwanie meczów do punktowania (status + is_scored)
