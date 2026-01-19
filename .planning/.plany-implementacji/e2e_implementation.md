# Instrukcja wdrożenia testów E2E w projekcie betMate

## Krok 1: Konfiguracja projektu Supabase dla testów E2E

### 1.1 Utworzenie nowego projektu na Supabase
- Wejdź na https://supabase.com/dashboard/projects
- Kliknij "New project"
- Wprowadź i zapisz bezpiecznie "database password" (potrzebne do migracji)

### 1.2 Pobranie kluczy dostępowych
- Po utworzeniu projektu skopiuj z dashboardu:
  - Project URL
  - Public key (anon key)
- Wartości te znajdziesz również przez "Connect" w górnej nawigacji

### 1.3 Utworzenie pliku `.env.test`

Dodaj do `.gitignore`:
```
.env.test
```

Utwórz plik `.env.test` w głównym katalogu projektu:
```env
# Supabase E2E Test Database
SUPABASE_URL=### twój URL ###
SUPABASE_PUBLIC_KEY=### twój klucz publiczny ###

# E2E Test User
E2E_USERNAME_ID=### ID użytkownika ###
E2E_USERNAME=### email użytkownika ###
E2E_PASSWORD=### hasło użytkownika ###
```

### 1.4 Utworzenie testowego użytkownika
- W dashboardzie Supabase przejdź do: Authentication > Users
- Kliknij "Add user"
- Wprowadź email i hasło
- Skopiuj ID, email i hasło do `.env.test`

## Krok 2: Migracja schematu bazy danych

### 2.1 Połączenie z projektem testowym
```bash
# Podepnij CLI do projektu testowego E2E
supabase link --project-ref [ID_PROJEKTU_TESTOWEGO]

# Zaloguj się hasłem do bazy danych (nie hasłem użytkownika!)
```

### 2.2 Wykonanie migracji
```bash
# Zastosuj wszystkie migracje na bazie testowej
supabase db push

# Poczekaj na: "Finished supabase db push."
```

### 2.3 Weryfikacja
- Sprawdź w dashboardzie Supabase czy tabele zostały utworzone (Table Editor)

## Krok 3: Instalacja i konfiguracja Playwright

### 3.1 Instalacja zależności
```bash
npm install -D @playwright/test dotenv
npx playwright install chromium
```

### 3.2 Konfiguracja Playwright

Utwórz `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Załaduj zmienne środowiskowe z .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.3 Dodanie skryptów do package.json

Dodaj do sekcji `scripts`:
```json
{
  "dev:e2e": "astro dev --mode test",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
}
```

## Krok 4: Dodanie selektorów testowych do komponentów

Dodaj atrybuty `data-testid` do kluczowych elementów UI w komponentach, które będą testowane:

```tsx
// Przykład w komponencie React
<button data-testid="login-button">Login</button>
<input data-testid="email-input" type="email" />
<nav data-testid="main-navigation">...</nav>
```

**Zasada:** Dodawaj selektory WEWNĄTRZ komponentów, nie na zewnątrz.

## Krok 5: Utworzenie struktury testów

### 5.1 Struktura katalogów
```
tests/
├── e2e/
│   ├── fixtures/         # Fixtures i pomocnicze funkcje
│   ├── pages/           # Page Object Models
│   └── specs/           # Scenariusze testowe
└── global-teardown.ts   # Czyszczenie danych po testach
```

### 5.2 Utworzenie Page Object Model (przykład)

Utwórz `tests/e2e/pages/login.page.ts`:
```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-button');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async goto() {
    await this.page.goto('/login');
  }
}
```

## Krok 6: Napisanie pierwszego testu

Utwórz `tests/e2e/specs/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Authentication', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USERNAME!,
      process.env.E2E_PASSWORD!
    );

    // Weryfikacja po zalogowaniu
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });
});
```

## Krok 7: Konfiguracja Global Teardown

### 7.1 Utworzenie skryptu czyszczącego

Utwórz `tests/global-teardown.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

async function globalTeardown() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLIC_KEY!
  );

  // Zaloguj się jako użytkownik testowy (dla RLS)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_USERNAME!,
    password: process.env.E2E_PASSWORD!,
  });

  if (signInError) {
    console.error('Error signing in:', signInError);
    throw signInError;
  }

  // Wyczyść dane testowe z tabel
  const tablesToClean = ['bets', 'matches', 'tournaments'];

  for (const table of tablesToClean) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Usuń wszystkie oprócz dummy

    if (error) {
      console.error(`Error cleaning ${table}:`, error);
    } else {
      console.log(`Cleaned ${table} table`);
    }
  }
}

export default globalTeardown;
```

### 7.2 Rejestracja w konfiguracji

Dodaj do `playwright.config.ts`:
```typescript
export default defineConfig({
  // ... reszta konfiguracji
  globalTeardown: './tests/global-teardown.ts',
});
```

## Krok 8: Uruchomienie testów

```bash
# Uruchom testy
npm run test:e2e

# Tryb interaktywny (UI mode)
npm run test:e2e:ui

# Z widocznymi oknami przeglądarki
npm run test:e2e:headed
```

## Dodatkowe wskazówki

### Optymalizacja logowania
- Rozważ zapisanie sesji do pliku i jej reużycie między testami
- Alternatywnie: logowanie przez API zamiast UI
- Dokumentacja: https://playwright.dev/docs/auth

### Praca zespołowa
Jeśli kilka osób równolegle pracuje nad projektem, rozważ:
- Osobnych użytkowników testowych dla każdego dewelopera
- Supabase Branching
- Czyszczenie cykliczne (np. o północy) zamiast po każdej sesji

### Reguły dla AI (opcjonalne)
- Możesz dodać reguły Playwright do pliku konfiguracyjnego AI w projekcie
- Pobierz z: https://assets-v2.circle.so/j4hglbhml3clcka1jmus5j1v2mts
