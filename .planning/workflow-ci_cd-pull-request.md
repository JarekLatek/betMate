Jesteś specjalistą GitHub Actions w stacku [text](../.ai/tech-stack.md) [text](../package.json)

Utwórz scenariusz "pull-request.yml" na podstawie reguł Github Actions zawartych w plik [text](../CLAUDE.md)

Workflow:
Scenariusz "pull-request.yml" powinien działać następująco:

- Lintowanie kodu
- Następnie dwa równoległe - unit-test i e2e-test
- Finalnie - status-comment (komentarz do PRa o statusie całości)

Dodatkowe uwagi:
- status-comment uruchamia się tylko kiedy poprzedni zestaw 3 przejdzie poprawnie
- w jobie e2e pobieraj przeglądarki wg [text](../playwright.config.ts)
- w jobie e2e ustaw środowisko "integration" i zmienne z sekretów wg [text](../.env.example):
  - SUPABASE_URL
  - SUPABASE_KEY
  - PUBLIC_SUPABASE_URL
  - PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_ACCESS_TOKEN
  - OPENROUTER_API_KEY
  - E2E_USERNAME_ID
  - E2E_USERNAME
  - E2E_PASSWORD
- zbieraj coverage tylko dla unit testów (npm run test:coverage)