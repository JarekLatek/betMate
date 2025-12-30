# Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

# Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

# Testowanie:

- Vitest jako framework do testów jednostkowych - szybki, kompatybilny z Vite/Astro, natywne wsparcie TypeScript
- Playwright do testów E2E - cross-browser, stabilne API async/await, wbudowane narzędzia do debugowania
- Testing Library (@testing-library/react) do testowania komponentów React - podejście user-centric
- MSW (Mock Service Worker) do mockowania API - realistyczne testy bez modyfikacji kodu produkcyjnego

# CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
