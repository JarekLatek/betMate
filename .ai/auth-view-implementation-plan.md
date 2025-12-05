# Plan implementacji widoku Uwierzytelniania (Logowanie / Rejestracja)

## 1. Przegląd

Widok uwierzytelniania składa się z dwóch stron: logowania i rejestracji. Jego celem jest umożliwienie użytkownikom uzyskania dostępu do aplikacji poprzez podanie danych uwierzytelniających lub utworzenie nowego konta.

Widok wykorzystuje Supabase Auth z pakietem `@supabase/ssr` do obsługi uwierzytelniania w środowisku SSR (Astro). Architektura wymaga dwóch osobnych klientów Supabase:

- **Browser Client** - używany w komponentach React (client-side) do operacji auth
- **Server Client** - używany w middleware i stronach Astro (server-side) do weryfikacji sesji

## 2. Routing widoku

- `/login` - Strona logowania
- `/register` - Strona rejestracji

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
│   └── register.astro      # Strona rejestracji (wrapper)
└── components/
    └── auth/
        └── auth-form.tsx   # Główny komponent formularza (React)
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
- **Błąd**: Wyświetlenie komunikatu błędu (np. użytkownik już istnieje)

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
- **Nazwa użytkownika**: Wymagana tylko przy rejestracji.
- **Unikalność**:
  - Email: Weryfikowany przez Supabase przy rejestracji (zwraca błąd, jeśli zajęty).
  - Username: Powinien być weryfikowany. Jeśli Supabase zwróci błąd (np. z triggera bazy danych), należy go wyświetlić.

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
