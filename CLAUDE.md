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

- Access via `context.locals.supabase` in Astro routes (not direct imports)
- Import `SupabaseClient` type from `src/db/supabase.client.ts` (not `@supabase/supabase-js`)
- Store client setup and type definitions in `src/db/`
- Use Zod schemas to validate data exchanged with backend

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
