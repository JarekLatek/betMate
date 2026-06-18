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

## CI/CD

### GitHub Actions Guidelines

When creating or modifying GitHub Actions workflows, follow these best practices:

**Pre-flight checks:**
- Check if `package.json` exists in project root and summarize key scripts
- Check if `.nvmrc` exists in project root
- Check if `.env.example` exists in project root to identify key `env:` variables
- Always use `git branch -a | cat` to verify whether we use `main` or `master` branch

**Workflow configuration:**
- Always use `env:` variables and secrets attached to jobs instead of global workflows
- Always use `npm ci` for Node-based dependency setup (not `npm install`)
- Extract common steps into composite actions in separate files

**Action version verification (final step):**

Once workflow is complete, verify all public actions are up-to-date and not deprecated:

1. For each public action, check the most up-to-date version (use only major version):
```bash
curl -s https://api.github.com/repos/{owner}/{repo}/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

2. (Ask if needed) Fetch README.md to verify we're not using deprecated actions:
```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/tags/v{TAG_VERSION}/README.md
```

3. (Ask if needed) Fetch repo metadata to check if action is archived:
```bash
curl -s https://api.github.com/repos/{owner}/{repo} | grep '"archived":'
```

4. (Ask if needed) In case of linter issues related to action parameters, fetch action description:
```bash
curl -s https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{main/master}/action.yml
```

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 3, Lesson 1

Open Module 3 by producing a **durable, risk-first quality contract** before any test is written — then drive each rollout phase through the standard change chain.

```
PRD + roadmap + archive
        │
        ▼
   /10x-test-plan  ──►  context/foundation/test-plan.md  (strategy §1–§5 frozen + cookbook §6 grows)
        │
        ▼  (one rollout phase at a time, /clear between handoffs)
   /10x-new ──► /10x-research ──► /10x-plan ──► /10x-implement
```

`/10x-test-plan` is a **stateful orchestrator**, not a one-shot generator. On first run it writes the phased rollout to `context/foundation/test-plan.md`. On every subsequent run it re-derives state from on-disk artifacts and presents the next handoff. The lesson focus is **strategy and rollout sequencing, not configuration**. Hooks, MCP servers, and CI YAML are configured in later lessons of this module.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Quality strategy as a rules-file (lesson focus)** | |
| `/10x-test-plan` | You have a PRD (and ideally a roadmap and a few archived slices) and you are about to write the project's first tests, or you noticed that AI-generated tests are landing on helpers while critical flows go uncovered. First invocation runs discovery (PRD + roadmap + archive + hot-spot scan), a 5-question user interview, and a synthesis pass with a mandatory challenger check, then writes `test-plan.md` in `context/foundation/` with a risk map (5–7 failure scenarios), a phased rollout table, a stack table, a quality-gates table, a cookbook section (`§6`, fills in as phases ship), and a negative-space section (what we deliberately don't test). Subsequent invocations advance the rollout one handoff at a time. |
| `/10x-test-plan --status` | A `test-plan.md` already exists and you want a compact snapshot of where the rollout stands — which phases are `not started`, `change opened`, `researched`, `planned`, `implementing`, or `complete`, and what the next action is. Does no work; safe to run any time. |
| `/10x-test-plan --refresh` | A `test-plan.md` already exists and one of: a new top-3 risk surfaced from the roadmap or archive, a tool's `checked:` date is older than three months, the project's tech stack changed, or §7 negative-space no longer matches what the team believes. Opens a new `test-plan-refresh-<YYYY-MM-DD>` change folder rather than editing the guide in place. |

### Rollout chain — what happens after the guide is written

The guide's §3 *Phased Rollout* table is the orchestrator's state. For each non-`complete` row the orchestrator selects the next handoff based on which artifacts exist in `context/changes/<change-id>/`:

| State on disk | Next handoff | Status transitions to |
| --- | --- | --- |
| change folder missing | `/10x-new <change-id>` | `change opened` |
| `change.md` only | `/10x-research` (with a risks-to-verify brief) | `researched` |
| `+ research.md` | `/10x-plan` (with cost × signal + cookbook-update constraints) | `planned` |
| `+ plan.md` with pending `## Progress` items | `/10x-implement <change-id> phase <N>` | `implementing` / `complete` |
| `+ plan.md` fully `[x]` | Mark §3 row `complete`; loop to next pending row | — |

Each handoff is a **STOP point**. The orchestrator copies the next command to the clipboard, asks the user to `/clear` and run it, then exits. Re-invoke `/10x-test-plan` (no arguments) to advance.

### Risk-first prioritization rules

- Risks are **failure scenarios in user / business terms**, not test names. "Logged-out user reaches paid content via stale token" is a risk; "test the login form" is not.
- 5 to 7 risks. Fewer is too coarse; more makes prioritization useless.
- Impact and likelihood are user/business ratings, not technical complexity.
- Every risk traces to a source: PRD section, archived slice, roadmap entry, Phase 2 interview question, hot-spot **directory** with churn count, or a tech-stack constraint. No invented risks.
- **Signal, not knowledge.** §2 cites *evidence that raised the risk*, never a file as "where the failure lives." File:line anchors, function names, schema names, and module names are forbidden in §2 — they belong in `/10x-research`'s output, produced per rollout phase against current code. The plan is a QA spec; it is not a code audit.
- Coverage is not the metric. **Risk coverage** is the metric.

### Dual-layer mapping rules

- Classic layer first: the cheapest test that gives a real signal wins. Promote to e2e only when no cheaper layer covers the risk.
- AI-native layer second, and only where it adds signal classic tests do not give cheaply.
- Every AI-native row has a **"When NOT to use"** line. If you cannot write one, drop the row.
- Every tool name carries a `checked: <YYYY-MM-DD>` date. Tool names are examples of the category, not endorsements.
- Both layers must be non-empty in the final guide if the project warrants them. Classic-only is a 2020 plan; AI-native-only is hype. AI-native phases are not mandatory — include them only when the brief justified them under cost × signal.

### Quality gates rules

- Required gates (lint, typecheck, unit+integration, e2e on critical flows) must map to actual CI steps. If a required gate is not yet wired, mark it as `required after §3 Phase <N>` and let the named rollout phase wire it.
- Post-edit hook is **recommended local**, not a CI substitute.
- Multimodal visual review is **selective**, applied to 1–3 critical screens, not to every page.
- Vision-driven fallback (Anthropic Computer Use or OpenAI CUA) is reserved for DOM-unreachable surfaces; expensive per action.

### Cookbook patterns (§6) — fills in over time

`test-plan.md` is both a phased strategy and a **growing cookbook**. §6 starts as placeholders (`TBD — see §3 Phase <N>`) and fills in incrementally — each rollout phase's plan ends with a sub-phase that updates the relevant §6 entry (location, naming, reference test, run command). After Module 3 completes, §6 becomes the canonical answer to "how do I add a test for X in this project?" — and is what `/10x-tdd` reads in Lesson 2.

### Lesson boundaries

- Do not write test code. That is Lesson 2 (`/10x-tdd` and unit-test authoring).
- Do not configure hooks, hook lifecycle, or debugging hooks. That is Lesson 3.
- Do not configure MCP servers, Playwright API, e2e code, or multimodal scenario code. That is Lesson 4.
- Do not run the bug-to-fix-to-regression-test workflow. That is Lesson 5.
- Do not author CI/CD pipelines from scratch or write GitHub Actions YAML. The guide names gates; configuration is owned by Module 1 Lesson 5 and Module 2 Lesson 5.
- Do not benchmark multimodal models. Cite criteria (cost, latency, agent-friendliness), never a ranking.
- Do not read the codebase for knowledge (call graphs, schemas, "which file owns this failure"). That is `/10x-research`'s job, per rollout phase.

### Paths used by this lesson

- `context/foundation/test-plan.md` — the quality contract produced and maintained by `/10x-test-plan`
- `context/foundation/prd.md` — primary risk source
- `context/foundation/roadmap.md` — likelihood weighting
- `context/foundation/tech-stack.md` — stack input (when present)
- `context/archive/<change-id>/plan.md` — implemented risk surface
- `context/changes/<change-id>/` — per-rollout-phase change folder (one per row in §3)

<!-- END @przeprogramowani/10x-cli -->
