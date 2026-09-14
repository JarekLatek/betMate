<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Jedna przetestowana orkestracja scoringu (C1 + C4, guard C7)

- **Plan**: context/changes/refactor-opportunities/plan.md
- **Mode**: Deep
- **Date**: 2026-09-14
- **Verdict**: REVISE
- **Findings**: 1 critical, 5 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING |
| Lean Execution | WARNING |
| Architectural Fitness | WARNING |
| Blind Spots | FAIL |
| Plan Completeness | WARNING |

## Grounding

Grounding: 14/14 ścieżek do modyfikacji ✓ (5 nowych plików poprawnie nie istnieje), 12/12 symboli ✓ (`scoreFinishedMatches` index.ts:165, `Deno.serve` :492, `createClient` :522, wywołanie :532, filtr `result` :176, import stałej :19, `statusMap` :33-58, `Constants.public.Enums` database.types.ts:345-353, `createBetSchema`/`updateBetSchema` z `z.enum` bet.validation.ts:11,29, DTO types.ts:380-409, skrypt `deps:check`, mock `{data:null,error:null}` scoring.service.test.ts:130), brief↔plan ✓ (6 faz, decyzje i zakres zgodne; brief powiela błędną lokalizację ryzyka pokrycia z F6 zamiast F1, zob. F1), Progress↔Phase ✓ (6/6 nagłówków, 36/36 kryteriów ma wiersz, brak checkboxów poza Progress).

## Weryfikacja w kodzie (Step 3, wykonana samodzielnie)

Sonda w scratchpadzie (bez zmian w repo): test Vitest ze stubem `Deno` i fake PostgREST na `fetch`, importujący niezmieniony `index.ts`, scenariusze w stylu H1–H9, uruchomiony obok istniejących testów z konfiguracją repo (`vitest.config.ts`), coverage v8 do katalogu tymczasowego.

| # | Twierdzenie planu | Wynik | Dowód |
|---|---|---|---|
| 1 | Szew handlera działa bez edycji `index.ts` | potwierdzone | 8/8 scenariuszy sondy zielone na niezmienionym pliku; H2 (406), H7 (3→6 przy retry), H9 (nadpisanie 9→3) odtworzone |
| 2 | `.single()` wysyła `Accept: application/vnd.pgrst.object+json`, a 406 wraca jako `error`, nie wyjątek | potwierdzone | `node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js:111-113`, `PostgrestBuilder.js:119-147` (postgrest-js 2.77.0) |
| 3 | Po Fazie 1 `npm run test:coverage` przechodzi (kryterium 1.2) | **zaprzeczone** | globalnie Stmts 60.07 / Branch 61.29 / Funcs 63.63 / Lines 61.81 przy progach 70/60/80/70, exit 1; `index.ts` 36.57/37.5/27.27/38.32. Dziś: 98.14/92.53/100/98.14 |
| 4 | Ryzyko progów pojawia się dopiero w F6 | **zaprzeczone** (pojawia się w F1) | symulacja po F6 (bez `scoring.service.test.ts`): 54.61/56.15/52.94/56.43, exit 1; z wykluczonym `index.ts`: 97.29/95.23/100/97.29, exit 0 |
| 5 | H5 da się wyrazić przez `failOn(table, method)` | **zaprzeczone** | błąd `matches GET` trafia najpierw w zapytanie trybu live → `throw` (index.ts:403-411) → HTTP 500 `{"success":false,"error":"Failed to query matches for live update"}` |
| 6 | Rollback „redeploy sprzed F1” omija ryzyko bundlingu | **zaprzeczone** | import `../../../src/lib/scoring/score-rule.ts` istnieje od `2956e01` (2026-06-18), więc każdy SHA sprzed F1 ma ten sam import |
| 7 | Kryterium 6.1 (`rg` = 0) osiągalne w zakresie F6 | potwierdzone | dziś trafienia tylko w plikach edytowanych przez F6: `src/types.ts:382-395`, `context/foundation/test-plan.md:139`, `score-rule.ts:4`, serwis, test, route |
| 8 | Guard przejdzie od razu | potwierdzone | `statusMap` ma wszystkie 5 statusów (index.ts:33-58); `z.object(...).shape.picked_result.options` istnieje dla `z.enum` (zod 3.25.76) |

Blast radius: brak innych importerów `scoreFinishedMatches`, `score-rule.ts` ani `vitest.config.ts` poza wskazanymi w planie; Playwright ma `testDir: "./tests/e2e"`, więc nie zbierze `supabase/functions/**/*.test.ts` ani `tests/support/`. `deno check --no-lock supabase/functions/sync-matches/index.ts` (Deno 2.9.6) dziś przechodzi.

## Właściwości wymagane przez kurs (Etap 3 pkt 7 + lekcja M4L4, Krok 4)

| # | Właściwość | Ocena | Dowód |
|---|---|---|---|
| 1 | Charakteryzacja przed dotknięciem, bez edycji chronionego kodu | spełnione (z zastrzeżeniem) | F1 przybija handler bez zmiany `index.ts` (sonda potwierdza szew); w F3/F4 kolejność „test → zmiana” mieści się w jednym commicie i nie zostawia śladu możliwego do sprawdzenia (F6 raportu) |
| 2 | Osobno odwracalne commity, od najtańszej i najbardziej samodzielnej | częściowo | jeden commit na fazę, revert w kolejności stosu działa; ale unknown bundlingu, który research wskazał jako „first prerequisite step” (research.md:575-578), sprawdzamy dopiero w F5 po trzech fazach pogłębiających import (F2 raportu) |
| 3 | Kryteria automatyczne i ręczne w każdej fazie | spełnione formalnie | każda z 6 faz ma obie sekcje; część komend automatycznych nie zadziała tak, jak zapisano (F1, F6 raportu) |
| 4 | Mechanizm ląduje na zielono, egzekwowanie włącza się osobnym krokiem | częściowo | F5→F6 rozdziela wdrożenie i wygaszenie, ale F1 ląduje na czerwono w bramce `test:coverage` (sonda, exit 1), a guard C7 i próg pokrycia Edge egzekwują od razu (F1, F9 raportu) |
| 5 | Jawne „czego NIE robimy”; fazy bez jednorazowego przepisania | spełnione | plan.md:124-142; 6 małych faz, bez migracji i bez przepisywania systemu |

**Rozbieżności między planem kursu a lekcją (wskazane, bez wybierania):**
- Plan kursu (Etap 3 pkt 7) wymaga „rozdzielenia wdrożenia mechanizmu od późniejszego włączenia egzekwowania”. Lekcja formułuje to jako „mechanizmy lądują na zielono, a egzekwowanie włącza się jawnie, osobnym krokiem”, na przykładzie walidacji domyślnie wyłączonej i aktywowanej plikiem wyjątków. Plan przyjął odczytanie „wdrożeniowe” (deploy F5, potem wygaszenie Node F6). Nie odpowiada ono dosłownie żadnemu z dwóch sformułowań.
- Lekcja (Krok 4) wymaga faz „ułożonych od najtańszej i najbardziej samodzielnej”. Plan kursu tego nie wymienia, pisze tylko „małe, samodzielne i odwracalne”.
- Plan kursu wymienia „jawne określenie tego, czego plan nie obejmuje”. Lista kontrolna Kroku 4 lekcji go nie zawiera, choć tekst lekcji o nim mówi.

## Findings

### F1 — Faza 1 łamie bramkę pokrycia (`test:coverage`), a nie Faza 6

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 1 — Konfiguracja runnerów; kryteria 1.2, 2.4, 3.3, 4.3, 5.3; plan-brief „Phases at a Glance” (F6 key risk)
- **Detail**: `vitest.config.ts:12-21` nie ma `coverage.include`. Vitest 4 z v8 liczy więc pokrycie plików załadowanych w teście, a progi są globalne (70/60/80/70). Test handlera ładuje cały `index.ts` (554 linie, w tym ingest `syncFullMode`, `determineActiveSeason`, batch live). Scenariusze H1–H9 w trybie live go nie pokrywają. Sonda na niezmienionym repo pokazała po Fazie 1 wynik 60.07/61.29/63.63/61.81 (Stmts/Branch/Funcs/Lines), exit 1 z „Coverage for functions (63.63%) does not meet global threshold (80%)”. `index.ts` ma 36.57/37.5/27.27/38.32. Kryterium 1.2 nie przejdzie, a CI (`pull-request.yml:31`) zrobi się czerwone. Po F6 jest gorzej: 54.61/56.15/52.94/56.43. Plan i brief lokalizują to ryzyko w F6 („Spadek progów pokrycia po usunięciu 19 testów”), więc implementer trafi na nie od razu w F1, bez przygotowanej decyzji. Fazy 2–3 nie poprawią sytuacji, bo reszta `index.ts` po ekstrakcji to prawie wyłącznie niepokryty ingest. Wpływu Fazy 4 (charakteryzacja `mode=full`) nie zmierzono.
- **Fix A ⭐ Recommended**: W Fazie 1 dopisać do `coverage.exclude` plik `supabase/functions/sync-matches/index.ts` jako cienką powłokę I/O (ingest to ryzyko #2 i §3 Phase 2 test-planu) z komentarzem uzasadniającym. Zachowujemy globalne progi. Od Fazy 2 mierzymy `scoring.ts` i `match-mapping.ts`. Ryzyko w briefie przenieść z F6 do F1.
  - Strength: Zmierzone: z tym wykluczeniem stan po F6 daje 97.29/95.23/100/97.29, exit 0. Progi dalej chronią całą logikę, łącznie z nowym modułem scoringu.
  - Tradeoff: Powłoka handlera nie ma metryki pokrycia, tylko testy zachowania. Wykluczenie jest jawnym osłabieniem pomiaru i trzeba je opisać.
  - Confidence: HIGH — wynik z uruchomienia na konfiguracji repo.
  - Blind spot: Liczby dla stanu po F2–F4 (osobny `scoring.ts`) nie zostały zmierzone.
- **Fix B**: Rozszerzyć charakteryzację w F1 o tryb `full` i tryb `live` z fixtures api-football (przenieść krok 4.1 do F1), aż `index.ts` sam przekroczy progi.
  - Strength: Bez wykluczeń. Ingest też dostaje piny, co pomaga ryzyku #2 test-planu.
  - Tradeoff: F1 znacznie rośnie (fake api-football, sezon, batch). Zakres wchodzi w ryzyko #2, którego plan nie obejmuje, a osiągnięcie 80% funkcji jest niepewne.
  - Confidence: MED — nie zmierzono, ile scenariuszy trzeba do 80% funkcji.
  - Blind spot: Stabilność testów zależnych od `new Date().getFullYear()` (index.ts:139).
- **Decision**: FIXED (Fix A) — coverage.exclude index.ts w F1; brief poprawiony

### F2 — Rollback i unknown bundlingu: SHA sprzed F1 ma ten sam import, a weryfikacja przychodzi za późno

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Blind Spots
- **Location**: Phase 5 — Implementation Note (rollback); Implementation Approach pkt 5; plan-brief „Open Risks”
- **Detail**: Plan zakłada rollback przez `git checkout <sha sprzed p1> -- supabase/functions` i redeploy (plan.md:528-530). Import `../../../src/lib/scoring/score-rule.ts` wszedł jednak w `2956e01` (2026-06-18), a od tamtej pory funkcji nie wdrażano (research: „No deploy was recorded”). Każdy SHA sprzed F1 ma więc ten sam niesprawdzony import. Jeśli hosted bundling albo runtime nie obsłuży ścieżki spoza `supabase/functions`, rollback odtworzy tę samą awarię. Bezpiecznym celem jest faktycznie wdrożony kod albo stan sprzed `2956e01`. Research wskazał potwierdzenie deployu jako „First prerequisite step… every Edge-touching change inherits that risk” (research.md:575-578). Plan przesuwa to na F5, po F2–F4, które przenoszą import do nowego `scoring.ts`, dokładają `pointsForBet` i guard. Plan nie ma też gałęzi „co jeśli bundling nie działa”, a wtedy kształt F2–F4 wymaga przeróbki.
- **Fix A ⭐ Recommended**: Przed F2 (jako manualny krok F1 albo osobna, bezkodowa faza 0) dodać kroki tylko do odczytu. Po pierwsze `supabase functions list` i `supabase functions download sync-matches` do katalogu poza repo, żeby ustalić wdrożony kod i sprawdzić, czy ma import cross-dir. Po drugie lokalny `supabase functions serve` na obecnym HEAD. Rollback celować w pobrane źródło, a gdy pobranie nie jest możliwe, w `2956e01~1`. Dopisać punkt decyzyjny: jeśli bundling zawiedzie, `score-rule.ts` trafia do `supabase/functions/_shared/`, a `src` importuje stamtąd.
  - Strength: Zamyka unknown przed pogłębieniem zależności, bez zapisu w produkcji. `download` istnieje w zainstalowanym CLI 2.72.7 (sprawdzone `--help`).
  - Tradeoff: Wymaga dostępu do projektu Supabase już w F1, a lokalny `serve` nie jest tym samym bundlerem co hosted deploy.
  - Confidence: MED — komendy istnieją, ale nie uruchomiono ich na projekcie.
  - Blind spot: Czy `download` zwraca źródło z importem względnym, czy spłaszczony bundle.
- **Fix B**: Przenieść prawdziwy deploy niezmienionego HEAD na początek zmiany (faza 0 „mechanizm deployu”), a F5 zostawić jako deploy zrefaktoryzowanej wersji.
  - Strength: Twardy sygnał z hosted bundlera przed jakimkolwiek refaktorem, zgodnie z kolejnością z research.
  - Tradeoff: Dodatkowy deploy produkcyjny commitu, którego nigdy nie wdrażano, i to w trakcie sezonu (zob. F3). Rollback dalej wymaga ustalenia wdrożonego kodu.
  - Confidence: MED — daje sygnał, ale przenosi ryzyko produkcyjne na początek.
  - Blind spot: Kalendarz meczów i harmonogram crona nie są znane.
- **Decision**: FIXED (Fix A) — nowa Phase 2 baseline (list/download --workdir tmp/serve), rollback do pobranego źródła, punkt decyzyjny _shared/; fazy przenumerowane

### F3 — Warunek bezpieczeństwa wywołania produkcyjnego w F5 jest niewystarczający

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details („Wywołanie w produkcji”); Phase 5 — kryteria 5.5, 5.6
- **Detail**: Plan uznaje wywołanie `?mode=live` za bezpieczne, gdy zapytanie o `FINISHED` z `is_scored=false` zwraca 0, bo „scoring nie ma czego zapisać”. Samo wdrożenie ma być bezpieczne (plan.md:186-190). Handler najpierw wykonuje jednak `syncLiveMode`, które może w tym samym wywołaniu ustawić mecz na `FINISHED` z wynikiem (index.ts:464-475), a zaraz potem uruchamia scoring (index.ts:532). Zero przed wywołaniem nie gwarantuje zera zapisów. Poza tym od chwili deployu cron (co 5–15 min wg `CLAUDE.md`) wykonuje nowy kod z prawdziwymi zapisami. „Bezpieczny” jest więc tylko brak ręcznego wywołania, nie wdrożenie. Poprzednia zmiana odrzuciła deploy Edge z powodu „mid-tournament” (testing-scoring-bet-lock-core/plan.md:100-101), a plan nie sprawdza okna czasowego dla turniejów z `TOURNAMENT_IDS` (index.ts:22-26).
- **Fix**: Rozszerzyć warunek z 5.5. Oprócz 0 nierozliczonych `FINISHED` wymagać 0 wierszy dla zapytania trybu live (`status=IN_PLAY` lub `SCHEDULED` z `match_datetime <= now()`) i wybrać okno deployu poza dniami meczowymi. Opisać deploy jako start produkcyjnego wykonania przez cron. W `deploy-verification.md` zapisać oba wyniki zapytań i wybrane okno.
  - Strength: Warunek odpowiada rzeczywistej sekwencji handlera (ingest, potem scoring), a nie tylko jego drugiej połowie.
  - Tradeoff: Okno deployu zależy od kalendarza, co może opóźnić F5 i F6.
  - Confidence: HIGH — sekwencja wynika wprost z index.ts:525-532.
  - Blind spot: Faktyczny harmonogram crona i jego lokalizacja (P18 w research) nie są znane.
- **Decision**: FIXED — okno poza dniami meczowymi + 2 zapytania read-only (nierozliczone, kandydaci live) w F6

### F4 — Plan deklaruje zgodność z test-plan §6.2, a faktycznie od niej odchodzi

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Current State Analysis („test-plan.md §6.2: mockujemy wyłącznie na brzegu sieci”); Phase 1 — fake PostgREST; Phase 6 — Dokumenty
- **Detail**: §6.2 brzmi: „mock only at the network edge (api-football via MSW); run against a real local Supabase schema. Never mock internal services.” (context/foundation/test-plan.md:152-153). Plan cytuje tylko pierwszą połowę (plan.md:50). Fałszuje bazę (PostgREST) i świadomie odrzuca MSW, które §4 wskazuje dla api-football (test-plan.md:104). Faza 6 aktualizuje tylko §6.1, więc po zmianie cookbook sam sobie przeczy: kanoniczny wzorzec testów scoringu (fake DB) łamie regułę §6.2. Wytyczna ryzyka #1 każe „extend existing service tests” (test-plan.md:70), a F6 te testy usuwa. Do tego dochodzi wierność: Vitest używa `@supabase/supabase-js` 2.77.0 z `node_modules`, a Deno rozwiązuje `npm:@supabase/supabase-js@^2.77.0` bez locka (deno.json:7; `deno check --no-lock`). Piny działają więc na innej wersji klienta niż produkcja. Fake nie ma też RLS, constraintów (`points >= 0`) ani współbieżności.
- **Fix**: Zapisać odejście jawnie. W F6 dopisać do §6.2 notę: „harness charakteryzacji: fake PostgREST na brzegu `fetch`; integracja z prawdziwą bazą nadal §3 Phase 2 / opcja #2”. Zaktualizować wskazanie „cheapest layer” dla #1 w §2 Risk Response Guidance. W Testing Strategy wymienić znane ograniczenia wierności fake'a: wersja klienta, brak RLS i constraintów, brak współbieżności.
  - Strength: Cookbook, który `/10x-tdd` czyta jako kanon, nie będzie sprzeczny. Decyzja „fake zamiast lokalnej bazy” staje się jawna i odwracalna.
  - Tradeoff: Plan dotyka §2 i §6.2 test-planu, czyli trochę więcej dokumentów niż teraz (statusy §3 dalej poza zakresem).
  - Confidence: HIGH — rozbieżność jest dosłowna w tekście §6.2.
  - Blind spot: Nie sprawdzono, którą wersję supabase-js rozwiązuje dziś Deno.
- **Decision**: FIXED — usunięta deklaracja zgodności z §6.2; granice fake'a; F7 aktualizuje §2 #1 i §6.2

### F5 — Kontrakt fake'a nie wyraża H5, H6 i H8 ani potrzeb trybu `full` z F4

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 — Fake PostgREST (Contract: `failOn(table, method, status, body)`), scenariusze H5/H6/H8; Phase 4 — Charakteryzacja mapowania statusów
- **Detail**: Wstrzykiwanie błędu per (tabela, metoda) jest za grube. H5: `matches GET` obejmuje też zapytanie trybu live, więc sonda dała HTTP 500 i `success:false` (index.ts:403-411), a nie obiecane `{0,0,1}` z HTTP 200. H6: „kolejne mecze są przetwarzane” wymaga błędu `bets GET` tylko dla jednego `match_id`. H8: „UPSERT jednego gracza pada, drugi dostaje punkty” wymaga błędu tylko dla jednego `user_id`, a sonda z `failOn(scores, POST)` dała `errors 2`. Faza 4 (`mode=full`) potrzebuje możliwości, których kontrakt nie zawiera i których sekcja „Changes Required” F4 nie wymienia: tabeli `tournaments` z upsert `on_conflict=api_tournament_id` plus `select().single()` (index.ts:279-289), `order` i `limit` z `.single()` na 0 wierszy (:301-307), `POST matches` jako insert (:369), hosta api-football z `last=1` i `fixtures?league&season` (:142, :318). Filtr trybu live wymaga też `lte` i zagnieżdżonego `and(...)` w `or=` (:406).
- **Fix**: Zmienić kontrakt na `failOn(predicate: (req) => boolean, status, body)`, z predykatem po parametrach zapytania i treści. W F4 dopisać plik `tests/support/postgrest-fake.ts` z listą rozszerzeń: `tournaments`, insert, `order`/`limit`, host api-football, a w F1 operatory `lte` i `and()`.
- **Decision**: FIXED — failOn(predicate), H5 na zapytaniu scoringu + H5b (live → 500), H6/H8 per match_id/user_id, rozszerzenia fake'a w F5

### F6 — Komendy weryfikacji nie pasują do rytuału commita `/10x-implement`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Completeness
- **Location**: Kryteria 1.4, 2.1, 2.5 (manual), 4.1, 5.1; Implementation Notes F3 i F4
- **Detail**: `/10x-implement` uruchamia kryteria automatyczne i ręczne **przed** commitem fazy, a SHA wpisuje do Progress po commicie (.claude/skills/10x-implement/SKILL.md:127, :269). (a) `git diff --stat HEAD~1 -- '*.test.ts'` w F2 (plan.md:330) porówna drzewo z `HEAD~1`, czyli ze stanem sprzed F1. Pokaże nowe pliki testów z F1, więc kryterium fałszywie padnie. To samo dotyczy `--color-moved HEAD~1` w 2.5 (szum z F1). W 1.4 działa tylko przypadkiem. (b) 5.1 „`git status --porcelain` pusty” jest niewykonalne: Progress w `plan.md` jest odhaczany krok po kroku, SHA z F4 czeka niezacommitowany, a `deploy-verification.md` powstaje w tej fazie. (c) 4.1 „zielona przed przeniesieniem (kolejność kroków w opisie commita)” nie jest automatyczne. W F3 i F4 kolejność „test przed dotknięciem” mieści się w jednym commicie, więc historia nie pozwala jej sprawdzić (właściwość kursu nr 1).
- **Fix**: Zamienić porównania na `git diff HEAD --stat -- …` (drzewo względem ostatniego commita). 5.1 zastąpić przez `git diff HEAD --quiet -- supabase/functions src/lib/scoring` i zapis `git rev-parse HEAD` w `deploy-verification.md`. 4.1 przenieść do Manual albo podzielić F3 i F4 na dwa commity każda (najpierw testy lub charakteryzacja, potem zmiana), żeby kolejność była widoczna w `git log`.
  - Strength: Kryteria da się wykonać w realnym przebiegu `/10x-implement`, a „test przed dotknięciem” zostawia sprawdzalny ślad.
  - Tradeoff: Podział commitów zmienia strukturę „jedna faza = jeden commit” zapisaną w planie, co wymaga decyzji, bo kurs wymaga osobnego commita na fazę.
  - Confidence: HIGH — mechanika `HEAD~1` i kolejność rytuału wynikają wprost z SKILL.md.
  - Blind spot: Czy `/10x-implement` dopuszcza dwa commity w jednej fazie bez rozjazdu z SHA w Progress.
- **Decision**: FIXED (Fix A) — porównania do HEAD, 6.1 git diff HEAD --quiet + rev-parse, kolejność test→zmiana w Manual

### F7 — Faza 3 w dużej części dubluje piny H1–H9

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 3 — Testy modułu (mapowanie 19 testów Node)
- **Detail**: Plan przenosi happy path (5), edge cases (3), błędy pobrania typów i oznaczenia oraz wiele błędów. Około 12 z 17 przenoszonych scenariuszy pokrywa się z H1–H4 i H6–H8 na poziomie handlera, na tym samym fake'u. Są to pusty wynik = H4, jeden i wiele typów = H1, istniejący wynik = H1, wiele meczów = H3, brak wiersza = H2, błędy bets/upsert/mark = H6/H8/H7. Nowy sygnał dają tylko: brak typów, wszystkie nietrafione, macierz dokładnego trafienia W/D/W, kształt UPSERT (`on_conflict`, `updated_at`).
- **Fix**: W F3 przenieść tylko scenariusze bez odpowiednika w H1–H9. Pozostałe zmapować w opisie commita na ID H jako „pokryte przez charakteryzację”.
- **Decision**: FIXED — F4 tylko M1–M5, mapa Node→H-ID

### F8 — Guard w `src` odwraca kierunek zależności do drzewa Edge

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architectural Fitness
- **Location**: Phase 4 — Test-guard (`src/lib/scoring/vocabulary.test.ts`)
- **Detail**: Produkcyjny kierunek to `supabase/functions` → `src` (index.ts:19). Guard w `src/lib/scoring` importujący `supabase/functions/sync-matches/match-mapping.ts` wprowadza odwrotną krawędź. dependency-cruiser wyklucza pliki testów (.dependency-cruiser.cjs:47), więc żadna bramka tego nie pokaże, a `tsconfig.json:4` wyklucza `supabase/functions`.
- **Fix**: Umieścić guard w `supabase/functions/sync-matches/vocabulary.test.ts`. Importuje on `../../../src/db/database.types.ts`, `../../../src/lib/validation/bet.validation.ts` i `score-rule.ts`, więc kierunek zależności zostaje jeden. Include Vitest z F1 już go zbierze, a `deno.json` go wykluczy.
- **Decision**: FIXED — guard w supabase/functions/sync-matches/vocabulary.test.ts

### F9 — Mapowanie „mechanizm vs egzekwowanie” jest niejawne wobec lekcji

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: End-State Alignment
- **Location**: Overview (lista kontraktu M4L4); Implementation Approach pkt 5–6; plan-brief „Mechanizm vs egzekwowanie”
- **Detail**: Plan nazywa deploy (F5) mechanizmem, a usunięcie ścieżki Node (F6) egzekwowaniem. Elementy, które faktycznie egzekwują, czyli include Vitest z progami pokrycia (F1) i guard C7 (F4), włączają się jednak w momencie wylądowania. Lekcja opisuje mechanizm lądujący na zielono i egzekwowanie włączane osobnym krokiem. Plan kursu mówi o rozdzieleniu „wdrożenia mechanizmu od włączenia egzekwowania” (zob. rozbieżności wyżej). Bez F1 raportu mechanizm z F1 ląduje na czerwono.
- **Fix**: W Overview dopisać jawne mapowanie: guard C7 i zakres pokrycia to „mechanizm = egzekwowanie w chwili wylądowania, dopuszczalne, bo zielone od razu (zweryfikowane)”, a F5→F6 to wygaszenie po potwierdzeniu mechanizmu. Wskazać rozbieżność sformułowań kursu i lekcji zamiast deklarować pełną zgodność.
- **Decision**: FIXED (Fix A) — jawne mapowanie w Overview + zapis rozbieżności kurs/lekcja
