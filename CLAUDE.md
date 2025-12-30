# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

betMate is a web application built with Astro 5, React 19, TypeScript 5, Tailwind 4, and Shadcn/ui. It uses Supabase for backend services and authentication.

## Tech Stack

- **Astro 5**: Server-side rendering framework (configured in server mode with node adapter)
- **TypeScript 5**: Type-safe development with strict configuration
- **React 19**: Interactive UI components (using react-jsx transform)
- **Tailwind 4**: Utility-first CSS framework
- **Shadcn/ui**: Pre-built accessible components
- **Supabase**: Backend services, authentication, and database

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier

# Pre-commit hooks
# Husky + lint-staged automatically run on commit:
# - ESLint fix for .ts, .tsx, .astro files
# - Prettier format for .json, .css, .md files
```

## Project Structure

```
./src
├── layouts/           # Astro layouts
├── pages/             # Astro pages (file-based routing)
│   └── api/          # API endpoints (server-side only)
├── middleware/        # Astro middleware (index.ts)
├── db/               # Supabase clients and types
├── types.ts          # Shared types (Entities, DTOs)
├── components/       # UI components
│   ├── ui/          # Shadcn/ui components
│   └── hooks/       # Custom React hooks
├── lib/              # Services and helpers
│   └── utils.ts     # Utility functions (cn, etc.)
├── assets/           # Static internal assets
└── public/           # Public assets

./supabase
└── functions/         # Supabase Edge Functions (Deno runtime)
    ├── deno.json      # Deno configuration + import maps
    └── sync-matches/  # Match synchronization function

Key architectural notes:
- Path alias `@/*` maps to `./src/*` (configured in tsconfig.json)
- Astro runs in server mode with Node.js adapter (standalone mode)
- Server runs on port 3000 by default
```

## Architecture Patterns

### Component Strategy

- **Astro components (.astro)**: Use for static content and layouts
- **React components**: Only when client-side interactivity is needed
- Never use Next.js directives like "use client" (React runs within Astro)

### API Routes

- Location: `src/pages/api/` (server-side only)
- Use uppercase HTTP method handlers: `GET`, `POST`, etc.
- Add `export const prerender = false` to all API routes
- Validate inputs with Zod schemas
- Extract business logic to services in `src/lib/services`

### Supabase Integration

The project uses two Supabase clients with `@supabase/ssr` for proper cookie-based session management:

**1. Server Client (`src/db/supabase.server.ts`)**
- Used in: middleware, API routes, Astro page components (server-side)
- Access via: `context.locals.supabase` or `Astro.locals.supabase`
- Creates new client per-request for proper cookie handling
- Uses: `SUPABASE_URL` + `SUPABASE_KEY`

**2. Browser Client (`src/db/supabase.browser.ts`)**
- Used in: React components (client-side)
- Import: `import { supabaseBrowser } from '@/db/supabase.browser'`
- Singleton that shares session via cookies
- Uses: `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY`

**Usage Rules:**
- NEVER import `supabase.browser.ts` in server-side code
- NEVER import `supabase.server.ts` in React components
- In Astro components use `Astro.locals.supabase`
- In React components use `supabaseBrowser`

**Additional guidelines:**
- Store client setup and type definitions in `src/db/`
- Use Zod schemas to validate data exchanged with backend
- Auth redirects use `window.location.href` (full page reload) for session sync

### Supabase Edge Functions

Edge Functions are located in `supabase/functions/` and run on Deno runtime.

**Development setup:**
- VSCode uses Deno LSP for this folder (configured in `.vscode/settings.json`)
- Install Deno extension: `denoland.vscode-deno`
- Cache dependencies: `deno cache supabase/functions/<function>/index.ts`

**sync-matches function:**

Synchronizes matches from api-football.com to database. Two modes of operation:

| Mode | Endpoint | Schedule | Description |
|------|----------|----------|-------------|
| `full` | `?mode=full` | Every 2-6h | Fetches only NEW matches (not in DB) |
| `live` | `?mode=live` | Every 5-15 min | Updates IN_PLAY matches + starting games |

Smart optimizations:
- `full`: Uses `from` date filter, INSERT only new `api_match_id`
- `live`: Skips API call if no matches need updating

### Error Handling Pattern

- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions (avoid deeply nested if statements)
- Place happy path last in the function
- Avoid unnecessary else statements; use if-return pattern
- Use guard clauses for preconditions and invalid states
- Implement proper error logging and user-friendly error messages

## Frontend Guidelines

### Styling with Tailwind

- Use `@layer` directive to organize styles
- Use arbitrary values with square brackets (e.g., `w-[123px]`)
- Use `theme()` function in CSS for accessing Tailwind theme values
- Use `dark:` variant for dark mode
- Use responsive variants (`sm:`, `md:`, `lg:`, etc.)
- Use state variants (`hover:`, `focus-visible:`, `active:`, etc.)
- Use `cn()` utility from `@/lib/utils` to merge class names

### Accessibility

- Use semantic HTML elements as the foundation
- Use ARIA landmarks (main, navigation, search, etc.) for page regions
- Apply ARIA roles only for custom elements without semantic equivalents
- Set `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Use `aria-hidden` to hide decorative content from screen readers
- Use `aria-label` or `aria-labelledby` for elements without visible text
- Use `aria-describedby` for descriptive text with form inputs
- Avoid redundant ARIA that duplicates native HTML semantics

### Astro-Specific Patterns

- Use View Transitions API for smooth page transitions (ClientRouter enabled)
- Use content collections with type safety for structured content
- Use `Astro.cookies` for server-side cookie management
- Use `import.meta.env` for environment variables
- Use image optimization with Astro Image integration
- Implement middleware in `src/middleware/index.ts` for request/response modification

### React Best Practices

- Use functional components with hooks (no class components)
- Extract custom logic into hooks in `src/components/hooks/`
- Use `React.memo()` for expensive components with stable props
- Use `React.lazy()` and `Suspense` for code-splitting
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive calculations
- Use `useId()` for generating unique IDs for accessibility
- Use `useOptimistic` for optimistic UI updates in forms
- Use `useTransition` for non-urgent state updates

## Testing

### Unit Tests with Vitest

- Leverage the `vi` object for test doubles - Use `vi.fn()` for function mocks, `vi.spyOn()` to monitor existing functions, and `vi.stubGlobal()` for global mocks. Prefer spies over mocks when you only need to verify interactions without changing behavior.
- Master `vi.mock()` factory patterns - Place mock factory functions at the top level of your test file, return typed mock implementations, and use `mockImplementation()` or `mockReturnValue()` for dynamic control during tests. Remember the factory runs before imports are processed.
- Create setup files for reusable configuration - Define global mocks, custom matchers, and environment setup in dedicated files referenced in your `vitest.config.ts`. This keeps your test files clean while ensuring consistent test environments.
- Use inline snapshots for readable assertions - Replace complex equality checks with `expect(value).toMatchInlineSnapshot()` to capture expected output directly in your test file, making changes more visible in code reviews.
- Monitor coverage with purpose and only when asked - Configure coverage thresholds in `vitest.config.ts` to ensure critical code paths are tested, but focus on meaningful tests rather than arbitrary coverage percentages.
- Make watch mode part of your workflow - Run `vitest --watch` during development for instant feedback as you modify code, filtering tests with `-t` to focus on specific areas under development.
- Explore UI mode for complex test suites - Use `vitest --ui` to visually navigate large test suites, inspect test results, and debug failures more efficiently during development.
- Handle optional dependencies with smart mocking - Use conditional mocking to test code with optional dependencies by implementing `vi.mock()` with the factory pattern for modules that might not be available in all environments.
- Configure jsdom for DOM testing - Set `environment: 'jsdom'` in your configuration for frontend component tests and combine with testing-library utilities for realistic user interaction simulation.
- Structure tests for maintainability - Group related tests with descriptive `describe` blocks, use explicit assertion messages, and follow the Arrange-Act-Assert pattern to make tests self-documenting.
- Leverage TypeScript type checking in tests - Enable strict typing in your tests to catch type errors early, use `expectTypeOf()` for type-level assertions, and ensure mocks preserve the original type signatures.

### E2E Tests with Playwright

- Initialize configuration only with Chromium/Desktop Chrome browser
- Use browser contexts for isolating test environments
- Implement the Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Implement visual comparison with `expect(page).toHaveScreenshot()`
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures
- Implement test hooks for setup and teardown
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs
