# Plan implementacji widoku Uwierzytelniania (Logowanie / Rejestracja)

## 1. Przegląd

Widok uwierzytelniania składa się z dwóch stron: logowania i rejestracji. Jego celem jest umożliwienie użytkownikom uzyskania dostępu do aplikacji poprzez podanie danych uwierzytelniających lub utworzenie nowego konta.

Widok wykorzystuje Supabase Auth z pakietem `@supabase/ssr` do obsługi uwierzytelniania w środowisku SSR (Astro). Architektura wymaga dwóch osobnych klientów Supabase:

- **Browser Client** - używany w komponentach React (client-side) do operacji auth
- **Server Client** - używany w middleware i stronach Astro (server-side) do weryfikacji sesji

## 2. Routing widoku

- `/login` - Strona logowania
- `/register` - Strona rejestracji
- `/forgot-password` - Strona żądania resetu hasła (OPCJONALNE - poza MVP)
- `/reset-password` - Strona ustawienia nowego hasła (OPCJONALNE - poza MVP)
- `/auth/callback` - Obsługa callbacków Supabase Auth (OPCJONALNE - poza MVP)

## 3. Struktura komponentów

```
src/
├── db/
│   ├── supabase.server.ts  # Server client (middleware, Astro pages)
│   └── supabase.browser.ts # Browser client (React components)
├── middleware/
│   └── index.ts            # Weryfikacja sesji, ustawienie context.locals
├── pages/
│   ├── login.astro         # Strona logowania (wrapper)
│   ├── register.astro      # Strona rejestracji (wrapper)
│   ├── forgot-password.astro  # Strona żądania resetu hasła (OPCJONALNE)
│   ├── reset-password.astro   # Strona ustawienia nowego hasła (OPCJONALNE)
│   └── auth/
│       └── callback.astro     # Obsługa callbacków Supabase Auth (OPCJONALNE)
└── components/
    └── auth/
        ├── auth-form.tsx              # Formularz logowania/rejestracji (React)
        ├── forgot-password-form.tsx   # Formularz żądania resetu (OPCJONALNE)
        └── reset-password-form.tsx    # Formularz nowego hasła (OPCJONALNE)
```

## 4. Szczegóły komponentów

### `AuthForm` (`src/components/auth/auth-form.tsx`)

- **Opis komponentu**: Interaktywny komponent React obsługujący zarówno logowanie, jak i rejestrację. Zawiera formularz, walidację oraz logikę komunikacji z Supabase.
- **Główne elementy**:
  - `Card` (Shadcn UI) - kontener formularza.
  - `Form` (React Hook Form + Shadcn UI) - obsługa stanu formularza.
  - `Input` - pola dla email, hasła i nazwy użytkownika.
  - `Button` - przycisk submit.
  - Linki nawigacyjne do przełączania między trybami (Login <-> Register).
- **Obsługiwane interakcje**:
  - Wpisanie danych (email, hasło, username).
  - Przełączenie widoczności hasła (opcjonalnie).
  - Wysłanie formularza (Submit).
  - Kliknięcie linku "Zarejestruj się" / "Zaloguj się".
- **Obsługiwana walidacja**:
  - **Email**: Wymagany, poprawny format adresu e-mail.
  - **Hasło**: Wymagane, minimum 6 znaków.
  - **Nazwa użytkownika** (tylko rejestracja): Wymagana, minimum 3 znaki.
- **Typy**:
  - `AuthFormValues` (wywnioskowane ze schematu Zod).
  - `AuthMode`: `'login' | 'register'`.
- **Propsy**:
  - `mode`: `AuthMode` - określa, czy formularz jest w trybie logowania czy rejestracji.

### `login.astro` & `register.astro`

- **Opis**: Strony Astro służące jako kontenery dla komponentu `AuthForm`.
- **Główne elementy**:
  - `Layout` - główny układ aplikacji.
  - `AuthForm` - wyrenderowany z odpowiednim propsem `mode`.
- **Obsługiwane interakcje**: Brak (statyczne kontenery).
- **Typy**: Brak.
- **Propsy**: Brak.

---

## 4.1 Komponenty opcjonalne (poza zakresem MVP)

### `ForgotPasswordForm` (`src/components/auth/forgot-password-form.tsx`)

**Status:** OPCJONALNE - FR-001 nie wymaga odzyskiwania hasła

- **Opis komponentu**: Formularz żądania resetu hasła. Użytkownik podaje email, a system wysyła link do resetu.
- **Główne elementy**:
  - `Card` (Shadcn UI) - kontener formularza.
  - `Form` (React Hook Form) - obsługa stanu formularza.
  - `Input` - pole dla email.
  - `Button` - przycisk submit.
  - Link powrotny do `/login`.
- **Obsługiwane interakcje**:
  - Wpisanie adresu email.
  - Wysłanie formularza.
- **Obsługiwana walidacja**:
  - **Email**: Wymagany, poprawny format adresu e-mail.
- **Typy**:
  ```typescript
  const forgotPasswordSchema = z.object({
    email: z.string().email('Nieprawidłowy adres email'),
  });
  type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
  ```
- **Integracja API**:
  - **Metoda**: `supabaseBrowser.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
  - **Sukces**: Wyświetlenie komunikatu "Sprawdź swoją skrzynkę email"
  - **Błąd**: Wyświetlenie komunikatu błędu

### `ResetPasswordForm` (`src/components/auth/reset-password-form.tsx`)

**Status:** OPCJONALNE - FR-001 nie wymaga odzyskiwania hasła

- **Opis komponentu**: Formularz ustawienia nowego hasła. Dostępny po kliknięciu linku z emaila.
- **Główne elementy**:
  - `Card` (Shadcn UI) - kontener formularza.
  - `Form` (React Hook Form) - obsługa stanu formularza.
  - `Input` - pola dla nowego hasła i potwierdzenia.
  - `Button` - przycisk submit.
- **Obsługiwane interakcje**:
  - Wpisanie nowego hasła i potwierdzenia.
  - Wysłanie formularza.
- **Obsługiwana walidacja**:
  - **Hasło**: Wymagane, minimum 6 znaków.
  - **Potwierdzenie hasła**: Musi być identyczne z hasłem.
- **Typy**:
  ```typescript
  const resetPasswordSchema = z.object({
    password: z.string().min(6, 'Hasło musi mieć minimum 6 znaków'),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Hasła muszą być identyczne',
    path: ['confirmPassword'],
  });
  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
  ```
- **Integracja API**:
  - **Metoda**: `supabaseBrowser.auth.updateUser({ password })`
  - **Sukces**: Przekierowanie do `/login` z komunikatem sukcesu
  - **Błąd**: Wyświetlenie komunikatu błędu

### `callback.astro` (`src/pages/auth/callback.astro`)

**Status:** OPCJONALNE - wymagany tylko dla weryfikacji email i resetu hasła

- **Opis**: Strona Astro obsługująca callbacki z Supabase Auth (weryfikacja email, reset hasła).
- **Logika**:
  ```typescript
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
- **Konfiguracja Supabase**: Wymaga dodania URL callbacka w Supabase Dashboard:
  - `http://localhost:3000/auth/callback` (dev)
  - `https://production-domain.com/auth/callback` (prod)

### Weryfikacja Email (OPCJONALNE)

**Status:** OPCJONALNE - PRD nie wymaga weryfikacji email

Jeśli w Supabase Dashboard włączona jest opcja "Confirm email", użytkownik po rejestracji otrzyma email z linkiem weryfikacyjnym.

**Przepływ:**
1. Użytkownik rejestruje się przez `AuthForm`
2. Supabase Auth tworzy konto z `email_confirmed_at = NULL`
3. Supabase wysyła email weryfikacyjny z linkiem do `/auth/callback`
4. Użytkownik klika link w emailu
5. `/auth/callback` wymienia kod na sesję i ustawia `email_confirmed_at`
6. Użytkownik jest przekierowany na stronę główną

**Obsługa w AuthForm:**
```typescript
// Po signUp() sprawdź czy sesja została utworzona
const { data, error } = await supabaseBrowser.auth.signUp({ ... });

if (data.user && !data.session) {
  // Email confirmation required
  setSuccessMessage('Sprawdź swoją skrzynkę email, aby potwierdzić rejestrację');
} else if (data.session) {
  // No email confirmation, redirect immediately
  window.location.href = '/';
}
```

**Konfiguracja Supabase Dashboard:**
- Authentication > Settings > Email > "Enable email confirmations"
- Email Templates > Customize verification email template (język polski)

---

## 5. Typy

Wymagane definicje typów (np. w `src/lib/validation/auth.validation.ts` lub wewnątrz komponentu):

```typescript
// Schemat walidacji Zod
const authSchema = z
  .object({
    email: z.string().email("Nieprawidłowy adres email"),
    password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
    username: z.string().min(3, "Nazwa użytkownika musi mieć minimum 3 znaki").optional(),
  })
  .refine((data) => {
    // Username jest wymagany tylko w trybie rejestracji - walidacja warunkowa
    // będzie obsłużona dynamicznie w komponencie lub przez osobne schematy
    return true;
  });

type AuthFormValues = z.infer<typeof authSchema>;

type AuthMode = "login" | "register";
```

## 6. Zarządzanie stanem

Zarządzanie stanem odbywa się lokalnie w komponencie `AuthForm` przy użyciu:

- **React Hook Form (`useForm`)**: Do zarządzania wartościami pól, ich stanem (touched, dirty) oraz błędami walidacji.
- **`useState`**:
  - `isLoading` (boolean): Do blokowania formularza podczas wysyłania żądania.
  - `serverError` (string | null): Do wyświetlania błędów zwróconych przez Supabase (np. "Invalid login credentials").

## 7. Integracja API

Integracja wykorzystuje pakiet `@supabase/ssr` z dwoma osobnymi klientami dla prawidłowej synchronizacji sesji między client i server.

### 7.1 Klienty Supabase

**Browser Client (`src/db/supabase.browser.ts`):**

- Używany w komponencie `AuthForm` (React, client-side)
- Tworzony przez `createBrowserClient` z `@supabase/ssr`
- Używa publicznych zmiennych: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- Automatycznie zarządza cookies sesji

```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export const supabaseBrowser = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

**Server Client (`src/db/supabase.server.ts`):**

- Używany w middleware i stronach Astro (server-side)
- Tworzony per-request przez `createServerClient` z `@supabase/ssr`
- Używa prywatnych zmiennych: `SUPABASE_URL`, `SUPABASE_KEY`
- Wymaga przekazania `AstroCookies` dla dostępu do cookies

```typescript
import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        get: (key) => cookies.get(key)?.value,
        set: (key, value, options) => cookies.set(key, value, options),
        remove: (key, options) => cookies.delete(key, options),
      },
    }
  );
}
```

### 7.2 Middleware

Middleware (`src/middleware/index.ts`) weryfikuje sesję przy każdym request:

```typescript
import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "@/db/supabase.server";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = createSupabaseServerClient(context.cookies);

  const {
    data: { session },
  } = await context.locals.supabase.auth.getSession();

  context.locals.user = session?.user ?? null;

  return next();
});
```

### 7.3 Operacje Auth

**Logowanie (`mode === 'login'`):**

- **Klient**: `supabaseBrowser` (browser client)
- **Metoda**: `supabase.auth.signInWithPassword`
- **Parametry**: `{ email, password }`
- **Sukces**: Przekierowanie na stronę główną `/`
- **Błąd**: Wyświetlenie komunikatu błędu

**Rejestracja (`mode === 'register'`):**

Rejestracja wymaga dwuetapowego procesu zgodnie z US-001 ("System weryfikuje, czy nazwa użytkownika nie jest już zajęta"):

**Krok 1: Walidacja unikalności username**
- **Endpoint**: `POST /api/auth/check-username`
- **Parametry**: `{ username: data.username }`
- **Sukces (`available: true`)**: Przejście do kroku 2
- **Błąd (`available: false`)**: Wyświetlenie komunikatu "Nazwa użytkownika jest już zajęta"

**Krok 2: Utworzenie konta**
- **Klient**: `supabaseBrowser` (browser client)
- **Metoda**: `supabase.auth.signUp`
- **Parametry**:
  ```typescript
  {
    email,
    password,
    options: {
      data: {
        username: data.username
      }
    }
  }
  ```
- **Sukces z sesją**: Przekierowanie na stronę główną `/`
- **Sukces bez sesji**: Informacja o konieczności potwierdzenia emaila (jeśli włączone w Supabase)
- **Błąd**: Wyświetlenie komunikatu błędu (np. email już istnieje)

**Przykładowa implementacja w komponencie:**

```typescript
const onSubmit = async (data: RegisterFormValues) => {
  setIsLoading(true);
  setServerError(null);

  try {
    // Krok 1: Sprawdzenie unikalności username
    const checkResponse = await fetch('/api/auth/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username }),
    });

    const checkResult = await checkResponse.json();

    if (!checkResult.available) {
      setServerError(checkResult.message || 'Nazwa użytkownika jest już zajęta');
      setIsLoading(false);
      return;
    }

    // Krok 2: Utworzenie konta w Supabase Auth
    const { data: authData, error } = await supabaseBrowser.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { username: data.username } },
    });

    if (error) {
      setServerError(mapSupabaseError(error.message));
      return;
    }

    // Przekierowanie po sukcesie
    window.location.href = '/';
  } catch (err) {
    setServerError('Wystąpił błąd. Spróbuj ponownie później.');
  } finally {
    setIsLoading(false);
  }
};
```

### 7.4 Zasady użycia klientów

| Kontekst | Klient | Import |
|----------|--------|--------|
| Komponenty React | `supabaseBrowser` | `@/db/supabase.browser` |
| Middleware | `createSupabaseServerClient()` | `@/db/supabase.server` |
| Strony Astro (server) | `Astro.locals.supabase` | (z middleware) |
| API Routes | `context.locals.supabase` | (z middleware) |

**⚠️ WAŻNE:**
- NIGDY nie importuj `supabase.browser.ts` w kodzie server-side
- NIGDY nie importuj `supabase.server.ts` w komponencie React

## 8. Interakcje użytkownika

1. **Wejście na stronę**: Użytkownik wchodzi na `/login` lub `/register`.
2. **Wypełnienie formularza**: Użytkownik wpisuje dane. Walidacja "onBlur" lub "onChange" informuje o błędach formatowania.
3. **Próba wysłania (Błąd walidacji)**: Jeśli dane są niepoprawne, formularz nie jest wysyłany, a pola z błędami są podświetlone.
4. **Wysłanie formularza (Sukces)**:
   - Przycisk zmienia stan na "Loading".
   - Wywołanie API Supabase.
   - Przekierowanie do `/`.
5. **Wysłanie formularza (Błąd API)**:
   - Przycisk wraca do stanu normalnego.
   - Wyświetla się ogólny komunikat błędu (np. "Nieprawidłowe dane logowania") nad formularzem lub przy konkretnym polu.
6. **Nawigacja**: Kliknięcie linku "Zarejestruj się" na stronie logowania przenosi do `/register`.

## 9. Warunki i walidacja

- **Email**: Musi być poprawnym adresem e-mail.
- **Hasło**: Minimum 6 znaków.
- **Nazwa użytkownika**: Wymagana tylko przy rejestracji, minimum 3 znaki.
- **Unikalność**:
  - **Email**: Weryfikowany przez Supabase Auth przy rejestracji (zwraca błąd `user_already_registered`, jeśli zajęty).
  - **Username**: Weryfikowany przez endpoint `POST /api/auth/check-username` PRZED wywołaniem `signUp()`. Endpoint sprawdza unikalność w tabeli `profiles` z constraint UNIQUE na kolumnie `username`.

**Kolejność walidacji przy rejestracji:**
1. Walidacja client-side (Zod) - format email, długość hasła, długość username
2. Walidacja server-side - unikalność username (`POST /api/auth/check-username`)
3. Walidacja Supabase Auth - unikalność email, siła hasła

## 10. Obsługa błędów

- **Błędy walidacji formularza**: Obsługiwane przez `react-hook-form` i wyświetlane bezpośrednio pod polami input (komponenty `FormMessage` z Shadcn).
- **Błędy API (Supabase)**:
  - Przechwytywanie wyjątków z `signInWithPassword` / `signUp`.
  - Mapowanie kodów błędów na przyjazne komunikaty (np. `invalid_credentials` -> "Nieprawidłowy email lub hasło").
  - Wyświetlanie błędu w widocznym miejscu (np. `Alert` z Shadcn UI nad formularzem).

## 11. Kroki implementacji

1. **Przygotowanie środowiska**:
   - Upewnienie się, że `shadcn/ui` jest skonfigurowany i zainstalowane są komponenty `card`, `input`, `button`, `form`, `label`, `alert`.
   - Instalacja pakietu `@supabase/ssr`: `npm install @supabase/ssr`

2. **Konfiguracja klientów Supabase**:
   - Utworzenie `src/db/supabase.server.ts` z funkcją `createSupabaseServerClient()`.
   - Utworzenie/aktualizacja `src/db/supabase.browser.ts` z użyciem `createBrowserClient`.
   - Usunięcie starego `src/db/supabase.client.ts` (jeśli istnieje).

3. **Konfiguracja middleware**:
   - Aktualizacja `src/middleware/index.ts` do tworzenia server client per-request.
   - Weryfikacja sesji i ustawienie `context.locals.user`.

4. **Definicja walidacji**: Utworzenie pliku `src/lib/validation/auth.validation.ts` ze schematami Zod dla logowania i rejestracji.

5. **Implementacja komponentu `AuthForm`**:
   - Stworzenie szkieletu z `react-hook-form`.
   - Dodanie pól formularza z walidacją.
   - Implementacja logiki `onSubmit` z obsługą `supabaseBrowser.auth`.
   - Dodanie obsługi stanów ładowania i błędów.
   - Implementacja warunkowego przekierowania po rejestracji (z/bez email confirmation).

6. **Stworzenie stron Astro**:
   - Utworzenie `src/pages/login.astro` z `export const prerender = false` i `AuthForm` z `mode="login"`.
   - Utworzenie `src/pages/register.astro` z `export const prerender = false` i `AuthForm` z `mode="register"`.
   - Dodanie przekierowania zalogowanych użytkowników do `/`.

7. **Weryfikacja**: Przetestowanie procesu rejestracji i logowania:
   - Sprawdzenie czy middleware widzi zalogowanego użytkownika.
   - Sprawdzenie czy sesja utrzymuje się między odświeżeniami.
   - Sprawdzenie przekierowań i obsługi błędów.
