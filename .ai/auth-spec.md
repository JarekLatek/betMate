# Specyfikacja Architektury Modułu Autentykacji - betMate

## Status implementacji

**Stan na dzień opracowania:** Moduł autentykacji jest w znacznej mierze zaimplementowany. Poniższa specyfikacja opisuje docelową architekturę oraz wskazuje elementy już istniejące i brakujące.

### Elementy zaimplementowane:
- Strony `/login` i `/register`
- Komponent `AuthForm` (formularz logowania i rejestracji)
- Komponent `LogoutButton`
- Middleware do zarządzania sesją
- Klienty Supabase (browser i server)
- Walidacja formularzy z Zod
- Ochrona stron i endpointów API
- Komunikaty błędów w języku polskim

### Elementy brakujące (wymagane przez PRD):
- **Walidacja unikalności nazwy użytkownika** - kluczowy wymóg US-001

### Elementy opcjonalne (poza zakresem MVP):
- Funkcjonalność odzyskiwania hasła - nie wymagana przez FR-001
- Weryfikacja email - nie wymagana przez PRD
- Profil użytkownika i edycja danych - wprost wykluczone w PRD (sekcja 4)

---

## 1. Architektura Interfejsu Użytkownika

### 1.1 Struktura stron i nawigacji

#### Strony autentykacji (tryb non-auth):

| Ścieżka | Typ | Opis | Status |
|---------|-----|------|--------|
| `/login` | Astro Page | Strona logowania | Zaimplementowana |
| `/register` | Astro Page | Strona rejestracji | Zaimplementowana |
| `/forgot-password` | Astro Page | Formularz żądania resetu hasła | Brak |
| `/reset-password` | Astro Page | Formularz ustawienia nowego hasła | Brak |
| `/auth/callback` | Astro Page | Obsługa callbacków Supabase Auth | Brak |

#### Strony chronione (tryb auth):

| Ścieżka | Typ | Opis | Wymagana autentykacja |
|---------|-----|------|----------------------|
| `/` | Astro Page | Strona główna z listą meczów | Tak |
| `/my-bets` | Astro Page | Historia zakładów użytkownika | Tak |
| `/leaderboard` | Astro Page | Ranking graczy | Tak |

### 1.2 Komponenty React

#### AuthForm (`src/components/auth/auth-form.tsx`)
**Status:** Zaimplementowany

**Odpowiedzialność:**
- Renderowanie formularza logowania lub rejestracji w zależności od `mode`
- Walidacja pól po stronie klienta (email, hasło, nazwa użytkownika)
- Wywołanie odpowiednich metod Supabase Auth
- Wyświetlanie błędów walidacji i błędów serwera
- Przekierowanie po pomyślnej operacji

**Props:**
```typescript
interface AuthFormProps {
  mode: 'login' | 'register';
}
```

**Pola formularza:**
- `email` - adres email (wymagany, format email)
- `password` - hasło (wymagane, min. 6 znaków)
- `username` - nazwa użytkownika (tylko rejestracja, wymagana, min. 3 znaki)

**Interakcja z backendem:**
- Login: `supabaseBrowser.auth.signInWithPassword({ email, password })`
- Register: Dwuetapowy proces:
  1. Wywołanie `POST /api/auth/check-username` w celu weryfikacji unikalności username
  2. Po pozytywnej walidacji: `supabaseBrowser.auth.signUp({ email, password, options: { data: { username } } })`

#### ForgotPasswordForm (`src/components/auth/forgot-password-form.tsx`)
**Status:** Opcjonalny (poza zakresem MVP - FR-001 nie wymaga odzyskiwania hasła)

**Odpowiedzialność:**
- Renderowanie formularza żądania resetu hasła
- Walidacja pola email
- Wywołanie `supabaseBrowser.auth.resetPasswordForEmail()`
- Wyświetlanie komunikatu o wysłaniu emaila lub błędu

**Pola formularza:**
- `email` - adres email (wymagany, format email)

#### ResetPasswordForm (`src/components/auth/reset-password-form.tsx`)
**Status:** Opcjonalny (poza zakresem MVP)

**Odpowiedzialność:**
- Renderowanie formularza ustawienia nowego hasła
- Walidacja pól hasła i potwierdzenia hasła
- Wywołanie `supabaseBrowser.auth.updateUser({ password })`
- Przekierowanie do strony logowania po sukcesie

**Pola formularza:**
- `password` - nowe hasło (wymagane, min. 6 znaków)
- `confirmPassword` - potwierdzenie hasła (musi być identyczne z `password`)

#### LogoutButton (`src/components/auth/logout-button.tsx`)
**Status:** Zaimplementowany

**Odpowiedzialność:**
- Wywołanie `supabaseBrowser.auth.signOut()`
- Przekierowanie do strony logowania

### 1.3 Layouty Astro

#### Layout (`src/layouts/Layout.astro`)
**Odpowiedzialność:**
- Bazowy layout dla wszystkich stron
- Renderowanie nagłówka z nawigacją
- Warunkowe wyświetlanie elementów w zależności od stanu autentykacji
- Integracja z View Transitions API

**Elementy nawigacji (zalogowany użytkownik):**
- Link do strony głównej (mecze)
- Link do historii zakładów (`/my-bets`)
- Link do rankingu (`/leaderboard`)
- Nazwa użytkownika
- Przycisk wylogowania (`LogoutButton`)

**Elementy nawigacji (niezalogowany użytkownik):**
- Link do logowania (`/login`)
- Link do rejestracji (`/register`)

### 1.4 Walidacja i komunikaty błędów

#### Schematy walidacji (`src/lib/validation/auth.validation.ts`)
**Status:** Zaimplementowany (do rozszerzenia)

**Istniejące schematy:**
```typescript
export const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
});

export const registerSchema = loginSchema.extend({
  username: z.string().min(3, 'Nazwa użytkownika musi mieć co najmniej 3 znaki'),
});
```

**Nowe schematy do dodania:**
```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Hasła muszą być identyczne',
  path: ['confirmPassword'],
});
```

#### Komunikaty błędów z serwera

| Źródło | Kod błędu | Komunikat dla użytkownika |
|--------|-----------|---------------------------|
| API check-username | `username_taken` | Nazwa użytkownika jest już zajęta |
| Supabase Auth | `invalid_credentials` | Nieprawidłowy email lub hasło |
| Supabase Auth | `user_already_registered` | Użytkownik z tym adresem email już istnieje |
| Supabase Auth | `weak_password` | Hasło jest zbyt słabe |
| Supabase Auth | `email_not_confirmed` | Adres email nie został potwierdzony |
| Supabase Auth | `user_not_found` | Nie znaleziono użytkownika z podanym adresem email |
| - | Domyślny | Wystąpił błąd. Spróbuj ponownie później. |

### 1.5 Scenariusze użytkownika

#### US-001: Rejestracja nowego użytkownika
1. Użytkownik wchodzi na `/register`
2. Wypełnia formularz: email, hasło, nazwa użytkownika
3. System waliduje dane po stronie klienta (format email, długość hasła, długość username)
4. Po zatwierdzeniu, formularz wywołuje `POST /api/auth/check-username` aby sprawdzić unikalność username
5. Jeśli username jest zajęty - wyświetlenie błędu, formularz pozostaje wypełniony
6. Jeśli username jest wolny - wywołanie `signUp()` do Supabase Auth
7. Supabase tworzy konto i automatycznie loguje użytkownika
8. Trigger w bazie danych tworzy rekord w tabeli `profiles` z username
9. Użytkownik jest przekierowany na stronę główną (`/`)

**Obsługa błędów:**
- **Username zajęty:** wyświetlenie komunikatu "Nazwa użytkownika jest już zajęta" (z API check-username)
- **Email zajęty:** wyświetlenie komunikatu "Użytkownik z tym adresem email już istnieje" (z Supabase Auth)
- **Słabe hasło:** wyświetlenie komunikatu, pole hasła zostaje wyczyszczone
- **Błąd sieci:** wyświetlenie ogólnego komunikatu błędu

#### US-002: Logowanie do systemu
1. Użytkownik wchodzi na `/login`
2. Wypełnia formularz: email, hasło
3. System waliduje dane po stronie klienta
4. Po zatwierdzeniu, formularz wysyła dane do Supabase Auth
5. Supabase weryfikuje dane i tworzy sesję
6. Użytkownik jest przekierowany na stronę główną (`/`)

**Obsługa błędów:**
- Nieprawidłowe dane: wyświetlenie komunikatu "Nieprawidłowy email lub hasło"
- Konto nieaktywne: wyświetlenie odpowiedniego komunikatu

#### Odzyskiwanie hasła (do implementacji)
1. Użytkownik wchodzi na `/forgot-password`
2. Wpisuje adres email
3. System wysyła email z linkiem do resetu hasła
4. Użytkownik klika link i trafia na `/reset-password` z tokenem
5. Wypełnia nowe hasło i potwierdzenie
6. Po zatwierdzeniu jest przekierowany do `/login`

---

## 2. Logika Backendowa

### 2.1 Middleware (`src/middleware/index.ts`)
**Status:** Zaimplementowany

**Odpowiedzialność:**
- Utworzenie klienta Supabase dla każdego żądania
- Pobranie aktualnie zalogowanego użytkownika
- Udostępnienie danych użytkownika i klienta przez `context.locals`

**Implementacja:**
```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = createSupabaseServerClient(context.cookies);
  const { data: { user } } = await context.locals.supabase.auth.getUser();
  context.locals.user = user ?? null;
  return next();
});
```

### 2.2 Endpointy API

Wszystkie endpointy API w `src/pages/api/` korzystają z autentykacji przez `context.locals`.

**Wzorzec ochrony endpointu:**
```typescript
export const GET: APIRoute = async (context) => {
  const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Logika endpointu...
};
```

**Istniejące chronione endpointy:**
- `GET /api/matches` - lista meczów
- `POST /api/bets` - tworzenie zakładu
- `GET /api/me/bets` - zakłady użytkownika
- `PUT /api/bets/[id]` - aktualizacja zakładu
- `DELETE /api/bets/[id]` - usunięcie zakładu
- `GET /api/tournaments/[tournament_id]/leaderboard` - ranking

### 2.3 Endpoint walidacji nazwy użytkownika (DO IMPLEMENTACJI)

**Endpoint:** `POST /api/auth/check-username`
**Status:** Wymagany (US-001: "System weryfikuje, czy nazwa użytkownika nie jest już zajęta")

**Odpowiedzialność:**
- Sprawdzenie czy podana nazwa użytkownika jest już używana
- Zwrócenie odpowiedzi z informacją o dostępności

**Request:**
```typescript
interface CheckUsernameRequest {
  username: string;
}
```

**Response:**
```typescript
interface CheckUsernameResponse {
  available: boolean;
  message?: string;  // "Nazwa użytkownika jest już zajęta"
}
```

**Implementacja:**
```typescript
// src/pages/api/auth/check-username.ts
export const prerender = false;

export const POST: APIRoute = async (context) => {
  const body = await context.request.json();
  const { username } = body;

  // Walidacja wejścia
  if (!username || username.length < 3) {
    return new Response(
      JSON.stringify({ available: false, message: 'Nazwa użytkownika musi mieć co najmniej 3 znaki' }),
      { status: 400 }
    );
  }

  // Sprawdzenie unikalności w tabeli auth.users (user_metadata->>'username')
  const { data, error } = await context.locals.supabase
    .from('auth.users')  // lub dedykowana tabela profiles
    .select('id')
    .eq('raw_user_meta_data->>username', username)
    .single();

  if (error && error.code !== 'PGRST116') {  // PGRST116 = no rows found
    return new Response(
      JSON.stringify({ available: false, message: 'Błąd serwera' }),
      { status: 500 }
    );
  }

  const available = !data;
  return new Response(
    JSON.stringify({
      available,
      message: available ? undefined : 'Nazwa użytkownika jest już zajęta'
    }),
    { status: 200 }
  );
};
```

**Alternatywna implementacja z tabelą `profiles`:**

Zalecane podejście to utworzenie dedykowanej tabeli `profiles` z constraint UNIQUE na kolumnie `username`:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger do automatycznego tworzenia profilu po rejestracji
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.4 Obsługa callbacków Supabase Auth (OPCJONALNE)

**Status:** Opcjonalny (poza zakresem MVP - wymagany tylko dla weryfikacji email i resetu hasła)

**Strona:** `/auth/callback`

**Odpowiedzialność:**
- Obsługa redirectów po weryfikacji email
- Obsługa redirectów po resecie hasła
- Wymiana kodu autoryzacyjnego na sesję

**Implementacja (Astro page):**
```typescript
// src/pages/auth/callback.astro
---
export const prerender = false;

const { url } = Astro;
const code = url.searchParams.get('code');
const next = url.searchParams.get('next') ?? '/';

if (code) {
  const { error } = await Astro.locals.supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return Astro.redirect(next);
  }
}

return Astro.redirect('/login?error=auth_callback_error');
---
```

### 2.5 Ochrona stron Astro

**Wzorzec przekierowania dla stron chronionych:**
```typescript
---
export const prerender = false;

const user = Astro.locals.user;

if (!user) {
  return Astro.redirect('/login');
}
---
```

**Wzorzec przekierowania dla stron autentykacji (login, register):**
```typescript
---
export const prerender = false;

const user = Astro.locals.user;

if (user) {
  return Astro.redirect('/');
}
---
```

### 2.6 Struktura danych użytkownika

**User metadata (przechowywane w Supabase Auth):**
```typescript
interface UserMetadata {
  username: string;  // Unikalna nazwa użytkownika
}
```

**Dostęp do danych użytkownika:**
```typescript
// W Astro pages/components
const user = Astro.locals.user;
const username = user?.user_metadata?.username;
const email = user?.email;
const userId = user?.id;
```

---

## 3. System Autentykacji (Supabase Auth)

### 3.1 Konfiguracja klientów Supabase

#### Browser Client (`src/db/supabase.browser.ts`)
**Status:** Zaimplementowany

**Użycie:** Wyłącznie w komponentach React (client-side)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export const supabaseBrowser = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

#### Server Client (`src/db/supabase.server.ts`)
**Status:** Zaimplementowany

**Użycie:** W middleware, API routes, Astro pages (server-side)

```typescript
import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { Database } from './database.types';

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        getAll: () => cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### 3.2 Metody Supabase Auth wykorzystywane w aplikacji

| Metoda | Użycie | Lokalizacja |
|--------|--------|-------------|
| `signUp()` | Rejestracja nowego użytkownika | `AuthForm` (register mode) |
| `signInWithPassword()` | Logowanie email/hasło | `AuthForm` (login mode) |
| `signOut()` | Wylogowanie | `LogoutButton` |
| `getUser()` | Pobranie aktualnego użytkownika | Middleware, API routes |
| `resetPasswordForEmail()` | Wysłanie maila z linkiem do resetu | `ForgotPasswordForm` (do impl.) |
| `updateUser()` | Aktualizacja hasła | `ResetPasswordForm` (do impl.) |
| `exchangeCodeForSession()` | Wymiana kodu na sesję | `/auth/callback` (do impl.) |

### 3.3 Zarządzanie sesją

**Mechanizm:** Cookie-based session management przez `@supabase/ssr`

**Przepływ:**
1. Po zalogowaniu, Supabase ustawia cookies z tokenami sesji
2. Middleware przy każdym żądaniu odczytuje cookies i weryfikuje sesję
3. Dane użytkownika są dostępne przez `context.locals.user`
4. Przy wylogowaniu cookies są usuwane

**Ważne uwagi:**
- Przekierowania auth używają `window.location.href` (pełne przeładowanie strony) dla synchronizacji sesji
- Nie używać nawigacji SPA dla operacji autentykacji

### 3.4 Zmienne środowiskowe

**Wymagane zmienne:**
```env
# Server-side (prywatne)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Client-side (publiczne)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.5 Konfiguracja Supabase Auth (Dashboard)

**Wymagane ustawienia w Supabase Dashboard:**

1. **Site URL:** URL produkcyjny aplikacji
2. **Redirect URLs:**
   - `http://localhost:3000/auth/callback` (dev)
   - `https://production-domain.com/auth/callback` (prod)
3. **Email Templates:** Dostosowane szablony w języku polskim
4. **Password Policy:** Minimalna długość 6 znaków

---

## 4. Podsumowanie implementacji

### 4.1 Zgodność z wymaganiami PRD

| Wymaganie | Status | Uwagi |
|-----------|--------|-------|
| FR-001: System uwierzytelniania | ⚠️ Częściowo | Brak walidacji unikalności username |
| US-001: Rejestracja | ⚠️ Niekompletny | Wymaga implementacji `POST /api/auth/check-username` |
| US-002: Logowanie | ✅ Zaimplementowany | Pełna funkcjonalność |

### 4.2 Plan dokończenia implementacji MVP

**Priorytet 1 - WYMAGANE dla MVP (US-001):**
1. Utworzenie endpointu `POST /api/auth/check-username`
2. Utworzenie tabeli `profiles` z UNIQUE constraint na `username`
3. Dodanie triggera do automatycznego tworzenia profilu
4. Aktualizacja `AuthForm` o wywołanie check-username przed rejestracją
5. Obsługa błędu "Nazwa użytkownika jest już zajęta" w formularzu

**Priorytet 2 - OPCJONALNE (poza zakresem MVP):**
- Odzyskiwanie hasła (strony `/forgot-password`, `/reset-password`)
- Weryfikacja email (callback route)
- Usprawnienia UX (toast notifications, wskaźnik siły hasła)

---

## 5. Diagram przepływu autentykacji

```
┌─────────────────────────────────────────────────────────────────┐
│                        UŻYTKOWNIK                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Czy użytkownik zalogowany?   │
              └───────────────────────────────┘
                    │              │
                   TAK            NIE
                    │              │
                    ▼              ▼
        ┌─────────────────┐  ┌─────────────────┐
        │  Strona główna  │  │ Strona logowania│
        │       (/)       │  │    (/login)     │
        └─────────────────┘  └─────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │     Wypełnienie formularza    │
                    │    (email, hasło, username*)  │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Walidacja client-side (Zod)  │
                    └───────────────────────────────┘
                           │              │
                         OK           BŁĄD
                           │              │
                           ▼              ▼
              ┌─────────────────┐  ┌─────────────────┐
              │  Supabase Auth  │  │ Wyświetl błędy  │
              │   API Call      │  │   walidacji     │
              └─────────────────┘  └─────────────────┘
                     │
          ┌──────────┴──────────┐
        OK                   BŁĄD
          │                     │
          ▼                     ▼
┌─────────────────┐    ┌─────────────────┐
│ Sesja utworzona │    │ Wyświetl błąd   │
│  (cookies set)  │    │    serwera      │
└─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│  Redirect do /  │
│ (window.href)   │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│   Middleware    │
│ getUser() check │
└─────────────────┘
          │
          ▼
┌─────────────────┐
│  context.locals │
│ .user = User    │
└─────────────────┘
```

---

*Dokument wygenerowany na podstawie analizy istniejącej implementacji oraz wymagań z PRD (FR-001, US-001, US-002) i tech-stack.*
