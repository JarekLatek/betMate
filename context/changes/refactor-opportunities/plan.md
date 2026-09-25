# Jedna przetestowana orkestracja scoringu (C1 + C4, guard C7) — Implementation Plan

> Rewizja po `/10x-plan-review` (2026-09-14, raport: `reviews/plan-review.md`, ustalenia
> F1–F9 naniesione). Dodana faza baseline wdrożenia (F2), fazy przenumerowane (plan przed
> implementacją).

## Overview

Realizujemy opcję **#1** z rankingu `research.md` (C1 + C4) plus tani guard z **C7**.
Punktacja ma dziś dwie implementacje: produkcyjną w Edge Function (Deno, bez testów,
nie da się jej zaimportować) i diagnostyczną w Node (19 testów, ale ścieżka
nieprodukcyjna, a route ma tylko uwierzytelnienie). Po tej zmianie zostaje **jedna**
orkestracja w Edge. Wydzielamy ją do importowalnego modułu i obejmujemy testami
charakteryzującymi. Ścieżkę Node (route, serwis, testy, DTO) usuwamy. Guard pilnuje,
żeby ręcznie pisane kopie słownika statusów i wyników zgadzały się z enumami bazy.

To refaktor **zachowujący zachowanie**. Znane błędy scoringu (C2/C3) są przypięte
testami jako „known bug”, a nie naprawiane. Ich naprawa to opcja #2, czyli osobna zmiana.

### Właściwości wymagane przez kurs i ich realizacja

Źródła: `context/course/tydzien-4-10xarchitect-plan.md` Etap 3 pkt 7 oraz lekcja L4
„Zadania praktyczne → Krok 4”.

- **Charakteryzacja przed dotknięciem.** F1 przybija zachowanie scoringu przez handler
  bez edycji `index.ts`. F5 przybija mapowanie statusów przed jego przeniesieniem.
  W F4 i F5 kolejność „test → zmiana” mieści się w jednym commicie. Potwierdzają ją
  kryteria ręczne i opis commita.
- **Osobno odwracalne commity, od najtańszej i najbardziej samodzielnej fazy.** F1 zawiera
  tylko testy. F2 to baseline wdrożenia wykonany tylko odczytem, zanim cokolwiek pogłębi
  import spoza folderu funkcji. Potem ekstrakcja, testy i guard, a na końcu deploy
  i usunięcie ścieżki Node.
- **Kryteria automatyczne i ręczne** są w każdej fazie.
- **Mechanizm vs egzekwowanie.** F6 wdraża nowy kształt Edge (mechanizm w produkcji),
  a route Node wciąż istnieje. F7 włącza egzekwowanie jednej orkestracji, usuwając
  alternatywę. Testy charakteryzujące i guard C7 egzekwują od chwili wylądowania.
  Wolno im, bo lądują na zielono, a zakres pokrycia jest ustawiony w F1.
  **Rozbieżność kurs/lekcja:** plan kursu mówi o „rozdzieleniu wdrożenia mechanizmu od
  późniejszego włączenia egzekwowania”, a lekcja o mechanizmie domyślnie wyłączonym
  i włączanym osobnym krokiem. Przyjęte odczytanie, zatwierdzone przez użytkownika
  w triage F9: mechanizmem jest nowa orkestracja wdrożona obok starej ścieżki, a
  egzekwowaniem jej wyłączność. Nie dodajemy sztucznej flagi do diagnostycznego route.
- **Jawne „czego NIE robimy”** jest w sekcji niżej.

## Current State Analysis

Źródło prawdy: `context/changes/refactor-opportunities/research.md` (twierdzenia
zweryfikowane ast-grep, V1–V39). Najważniejsze fakty:

- **Dwie kopie orkestracji.** Deno `scoreFinishedMatches` jest prywatna
  (`supabase/functions/sync-matches/index.ts:165-256`), a plik ma `Deno.serve` na
  najwyższym poziomie (`:492`) i zero eksportów (V4). Node `scoreMatches` jest
  eksportowana (`src/lib/services/scoring.service.ts:100-146`). Interfejsy
  `UnscoredMatch`/`BetToScore` są zdublowane (V8). Semantyka błędów jest przeciwna:
  - Edge oznacza mecz jako rozliczony mimo błędu UPSERT, więc nagroda ginie (V19, V20).
  - Node pomija oznaczenie, więc przy ponownym uruchomieniu nalicza podwójnie (V21).
- **Wspólna reguła jest martwa.** `pointsForBet` nie ma produkcyjnego wywołania (V2).
  Oba runtime'y importują tylko stałą (V3).
- **Route diagnostyczny.** `src/pages/api/admin/score-matches.ts` sprawdza tylko
  `getUser()` (V10) i woła serwis klientem sesyjnym (RLS). W efekcie update flagi dotyka
  0 wierszy bez błędu. Poza jego testami nie ma innych wywołań (V6). DTO
  `ScoreMatchesCommand` jest nieużywane, a `ScoreMatchesResponseDTO` używa tylko serwis (V9).
- **Siatka bezpieczeństwa.**
  - Vitest zbiera tylko `src/**` (`vitest.config.ts:8`, V12).
  - Coverage v8 nie ma `coverage.include`, a progi 70/60/80/70 są globalne
    (`vitest.config.ts:12-21`). Liczy się każdy załadowany plik.
  - Nie ma testów Edge. `deno check` przechodzi (V14).
  - CI (`pull-request.yml`) uruchamia lint, `test:coverage` i E2E. Nie ma typechecku,
    `deno check` ani deployu (V27).
  - `tsconfig.json` wyklucza `supabase/functions`, a ESLint obejmuje ten katalog
    (`no-console: off`). dependency-cruiser wyklucza testy (`.dependency-cruiser.cjs:47`).
- **Test-plan.**
  - §6.2 zakłada integrację z prawdziwym lokalnym schematem Supabase i MSW dla
    api-football (`context/foundation/test-plan.md:152-153`).
  - §2, wiersz ryzyka #1, wskazuje „unit (extend existing service tests)” (`:70`).
  - Ten plan **odchodzi** od §6.2 świadomie. Fake PostgREST to warstwa charakteryzacji,
    a nie integracja z bazą. F7 aktualizuje oba miejsca.
- **Słownik (C7).** Źródłem są enumy SQL, a ich lustrem `Constants.public.Enums.*`
  (`src/db/database.types.ts:345-353`). Ręczne kopie:
  - unie i mapa statusów w Edge (`index.ts:29-61`),
  - `ScoreRuleOutcome` (`score-rule.ts:22`, świadomie inline dla Deno),
  - literały zod `picked_result` (`bet.validation.ts:11,29`; plik importuje tylko `zod`).
- **Deploy.**
  - Import `../../../src/lib/scoring/score-rule.ts` jest w repo od `2956e01`
    (2026-06-18). Nie wiadomo, czy wdrożona wersja go zawiera ani czy hostowany bundler
    go obsługuje.
  - Wdrożony SHA jest nieznany. Harmonogram crona nie jest zapisany w repo.
  - Supabase CLI lokalnie to 2.110.0, projekt jest podlinkowany.
  - Dostępne komendy: `functions list`, `functions download [--use-api]` (zapisuje do
    `<workdir>/supabase/functions/<name>`) oraz `functions deploy [--use-api]`.

### Zweryfikowane uruchomieniem (sondy w scratchpadzie, bez zmian w repo)

- **Szew handlera działa.** Stub `Deno` (`serve` przechwytuje handler, `env.get`)
  i globalny `fetch` z fałszywym PostgREST pozwalają zaimportować **niezmieniony**
  `index.ts`. `?mode=live` zwraca HTTP 200 i `scoring {1,1,0}`, a sekwencja żądań to
  GET matches (live) → GET matches (scoring) → GET bets → GET scores → POST scores → PATCH
  matches. Recenzja odtworzyła też H2, H7 i H9.
- **`.single()` w postgrest-js 2.77.0** wysyła `Accept: application/vnd.pgrst.object+json`,
  a 406 zwraca jako `error`, bez wyjątku.
- **Bramka pokrycia.** Z testem handlera i bez wykluczeń pokrycie wynosi 60/61/64/62,
  exit 1. Po wykluczeniu `index.ts` z coverage: 97/95/100/97, exit 0.
- **Błąd zapytania live** (`matches` z `or=`) kończy się HTTP 500, `success:false`
  (`index.ts:403-411`), a scoring się nie wykonuje.

## Desired End State

- `supabase/functions/sync-matches/scoring.ts` eksportuje `scoreFinishedMatches`
  i jest jedyną implementacją orkestracji scoringu. `index.ts` tylko go wywołuje.
- Scoring używa `pointsForBet`.
- `supabase/functions/sync-matches/match-mapping.ts` zawiera słownik Edge
  (`MATCH_STATUSES`, `MATCH_OUTCOMES`, `API_STATUS_MAP`, `mapApiStatus`, `calculateResult`).
- Testy Vitest obejmują Edge na poziomie handlera (charakteryzacja scoringu i mapowania)
  oraz modułu. Znane błędy C2/C3 są przypięte jako `known bug (C2|C3)`.
- Guard `supabase/functions/sync-matches/vocabulary.test.ts` pada, gdy któraś kopia
  słownika rozjedzie się z `Constants.public.Enums.*`.
- `deploy-verification.md` zapisuje dwa etapy:
  - baseline: wdrożona wersja przed refaktorem, jej źródło do rollbacku, lokalny serve
    na niezmienionym HEAD;
  - wdrożenie po refaktorze: SHA, warunki okna, odpowiedź produkcyjna.
- `POST /api/admin/score-matches`, `scoring.service.ts` z testami i DTO scoringu nie
  istnieją. Test-plan §2 i §6.1–6.2, `.ai/*`, `CLAUDE.md` i nagłówek `score-rule.ts`
  wskazują nowy stan.

Weryfikacja końcowa:
- `npm run test:coverage`, `npm run lint`, `npm run build` i
  `deno check --no-lock supabase/functions/sync-matches/index.ts` są zielone.
- `rg` odwołań do ścieżki Node poza artefaktami historycznymi zwraca 0.
- Wdrożona funkcja odpowiada `success: true` z blokiem `scoring`.

### Key Discoveries:

- Szew handlera działa bez edycji `index.ts`. Handler jest rejestrowany przy imporcie
  (`index.ts:492`), a `createClient` tworzony per request (`:522`), więc stub `fetch`
  ustawiony przed importem obejmuje każde wywołanie.
- Scoring filtruje `result=not.is.null` (`index.ts:176`), więc `pointsForBet(pick, result)`
  daje dla tych danych ten sam wynik co `pick === result ? 3 : 0`.
- `API_STATUS_MAP` pokrywa dziś wszystkie 5 statusów bazy (`index.ts:33-58`),
  więc guard równości zbiorów przejdzie od razu.
- `test-plan.md` §6.1 nakazuje asercje punktów literałem `3`, nie echem stałej.
- `testing-scoring-bet-lock-core/plan.md` Phase 2 („Scoring service correctness”) celuje
  w `scoring.service.ts`, który F7 usuwa. Pamięć projektu wskazywała tę fazę jako punkt
  wznowienia.

## What We're NOT Doing

- **C2** – atomowej jednostki scoringu w DB, migracji, RPC ani harnessu lokalnego
  Supabase z prawdziwym schematem (opcja #2). Znane błędy zostają i są tylko przypięte
  testami.
- **C3** – samodzielnego guarda „nie oznaczaj meczu po błędzie” (bez C2 zamienia utratę
  nagrody w podwójne naliczenie).
- **C5** (rank po paginacji) i **C6** (model uczestnika), a także P15, P16 i P17
  (fallback statusu, korekta wyniku, mecze odwołane i przełożone).
- Zmiany reguły wyświetlania hit/miss w `bet-utils.ts:66` (V1).
- Współdzielenia orkestracji między runtime'ami i zastępczego zapytania diagnostycznego
  (drift query) za `dry_run`.
- Charakteryzacji pełnego ingestu `sync-matches` (ryzyko #2 test-planu). Ingest jest
  wykluczony z pokrycia, a F5 dotyka tylko mapowania statusów i wyniku.
- Zmian w CI, w `context/map/*` (datowane snapshoty) i w statusach §3 test-planu.
- Adopcji MSW.
- Wznawiania faz 2–4 `testing-scoring-bet-lock-core`. F7 dopisuje tam tylko notę.
- Przeniesienia `score-rule.ts` do `supabase/functions/_shared/`. Wchodzi w zakres
  **tylko** wtedy, gdy F2 wykaże, że hostowany bundler nie obsługuje importu spoza
  folderu funkcji. Wtedy zatrzymujemy się i aktualizujemy plan.

## Implementation Approach

Strangler w mikroskali, porządek „test przed dotknięciem”:

1. **Charakteryzacja scoringu przez handler.** Obejmuje tylko pliki testów i konfigurację
   runnera (z wykluczeniem `index.ts` z coverage).
2. **Baseline wdrożenia, tylko odczyt.** Ustalamy, co jest wdrożone, pobieramy to jako
   źródło rollbacku i uruchamiamy niezmieniony HEAD lokalnie. To punkt decyzyjny dla
   importu spoza folderu funkcji.
3. **Ekstrakcja modułu jako dosłowne przeniesienie.** Testy z F1 bez edycji.
4. **Testy modułu tylko dla nowego sygnału**, potem `pointsForBet`.
5. **Guard słownika.** Najpierw charakteryzacja mapowania (`mode=full`), potem
   przeniesienie do `match-mapping.ts`, na końcu guard.
6. **Wdrożenie mechanizmu** w bezpiecznym oknie.
7. **Egzekwowanie:** usunięcie ścieżki Node i aktualizacja dokumentów.

Każda faza to jeden commit, np.
`refactor(refactor-opportunities): extract edge scoring module (p3)`, odwracalny
przez `git revert`. Fazy 1 i 3–5 nie wymagają deployu ani migracji.

**Sekwencja `/10x-implement`:** weryfikacja przed commitem fazy, SHA w Progress po nim.
Porównania „bez zmian w pliku X” liczymy więc względem `HEAD`, czyli ostatniego commita
poprzedniej fazy, a nie `HEAD~1`.

## Critical Implementation Details

- **Kolejność w testach handlera.** `vi.stubGlobal("Deno", …)` i
  `vi.stubGlobal("fetch", …)` muszą być ustawione **przed** dynamicznym
  `await import(".../index.ts")`. Import robimy raz (`beforeAll`), bo `Deno.serve`
  rejestruje handler przy ewaluacji modułu. Stan fake'a resetujemy w `beforeEach`.
  W trybie `live` każde żądanie do hosta api-football ma failować test.
- **Wierność fake'a PostgREST** (`tests/support/postgrest-fake.ts`). Fake musi mieć:
  - stan w pamięci dla `matches`, `bets` i `scores`,
  - filtry faktycznie używane przez kod (`eq.`, `not.is.null`, `or=` z `and()`/`lte.`),
  - UPSERT z `on_conflict`, który scala po `(user_id, tournament_id)`,
  - PATCH z `id=eq.N`,
  - dla `Accept: application/vnd.pgrst.object+json` przy 0 wierszach odpowiedź 406
    `{code:"PGRST116"}`,
  - wstrzykiwanie błędów przez **predykat na żądaniu**:
    `failOn(predicate(req) → boolean, status, body)`, gdzie
    `req = { method, table, params, headers, body }`. Dzięki temu da się trafić jedno
    zapytanie (np. tylko SELECT scoringu z `is_scored`, tylko bety jednego `match_id`,
    tylko UPSERT jednego `user_id`).

  Bez filtrowania `is_scored=eq.false` nie da się przypiąć podwójnego naliczenia.
- **Granice fake'a** (świadome). Fake nie ma RLS, constraintów, triggerów, transakcji ani
  współbieżności. Vitest używa supabase-js z `node_modules` (2.77.0), a Deno rozwiązuje
  `npm:@supabase/supabase-js@^2.77.0` bez locka (`deno.json:7`). Zielone testy nie
  dowodzą więc zachowania na prawdziwej bazie ani w wersji klienta z deployu. To
  pozostaje zakresem opcji #2.
- **`functions download` nadpisuje pliki** w `<workdir>/supabase/functions/sync-matches`.
  W F2 **nigdy nie uruchamiamy go w katalogu repo**. Używamy tymczasowego katalogu poza
  repo z `--workdir <tmp> --project-ref <ref>` (w razie potrzeby wcześniej
  `supabase init` w `<tmp>`).
- **Okno wywołania produkcyjnego (F6).**
  - `?mode=live` najpierw aktualizuje mecze (może ustawić `FINISHED`,
    `index.ts:464-475`), a zaraz potem uruchamia scoring (`:532`).
  - Od chwili deployu cron wykonuje nowy kod na prawdziwych danych.
  - Poprzednia zmiana odrzuciła deploy „mid-tournament”
    (`testing-scoring-bet-lock-core/plan.md:100-101`).
  - Dlatego deploy i wywołanie wykonujemy tylko w oknie poza dniami meczowymi i tylko
    wtedy, gdy oba zapytania tylko do odczytu zwracają 0:
    ```sql
    select count(*) from matches where status = 'FINISHED' and is_scored = false;
    select count(*) from matches where status = 'IN_PLAY' or (status = 'SCHEDULED' and match_datetime <= now());
    ```
- **Wyciągnięcie `statusMap`** do stałej modułu (F5) nie zmienia zachowania tylko wtedy,
  gdy obiekt jest tylko do odczytu (`as const` / `Readonly`).

---

## Phase 1: Charakteryzacja scoringu przez handler Edge

### Overview

Przybijamy obecne zachowanie produkcyjnego scoringu, obserwując je przez handler.
Zmieniają się wyłącznie pliki testów i konfiguracja runnerów. `index.ts` zostaje nietknięty.

### Changes Required:

#### 1. Fake PostgREST na brzegu sieci

**File**: `tests/support/postgrest-fake.ts` (nowy)

**Intent**: Stanowy fake REST Supabase podpinany przez `vi.stubGlobal("fetch")`, wspólny
dla testów handlera (F1, F5) i modułu (F4). Nie zależy od kolejności wywołań.

**Contract**:
- Fabryka zwraca `{ fetch, seed(tables), tables, requests, failOn(predicate, status, body), onExternal(handler) }`.
- Emulacja PostgREST opisana w Critical Implementation Details.
- `onExternal` obsługuje hosty inne niż Supabase (api-football). Domyślnie rzuca.
- Plik leży w `tests/`, więc obowiązuje go konfiguracja ESLint dla testów, a Deno go nie widzi.

#### 2. Testy charakteryzujące handler

**File**: `supabase/functions/sync-matches/handler.characterization.test.ts` (nowy)

**Intent**: Wywołujemy `GET ?mode=live` (0 meczów do aktualizacji) i asertujemy stan
tabel, blok `results.scoring` oraz status HTTP. Punkty literałami (3, 6, 9).

**Contract** (scenariusze):
- H1: jeden mecz, typ trafiony i nietrafiony, istniejący wynik 6. Trafiony dostaje 9,
  nietrafiony nie dostaje wiersza, mecz jest oznaczony, `scoring {1,1,0}`, HTTP 200.
- H2: brak wiersza `scores` (406 `PGRST116`), więc powstaje wiersz z 3 punktami.
- H3: wiele meczów w dwóch turniejach. Punkty kumulują się per `(user, tournament)`.
- H4: brak nierozliczonych meczów daje `{0,0,0}` i żadnych zapisów.
- H5: błąd **zapytania scoringu** (GET `matches` z parametrem `is_scored`) daje
  `scoring {0,0,1}`, a mimo to HTTP 200 i `success: true`.
- H5b: błąd **zapytania live** (GET `matches` z `or`) daje HTTP 500,
  `success: false` i żadnych żądań scoringu.
- H6: błąd pobrania typów tylko dla jednego `match_id`. Ten mecz nie jest oznaczony,
  `errors 1`, a drugi mecz jest rozliczony (`processed 1`).
- H7 `known bug (C2)`: PATCH flagi pada. Punkty są zapisane, mecz nieoznaczony.
  **Drugie** wywołanie handlera nalicza ponownie (3 → 6).
- H8 `known bug (C3)`: UPSERT tylko jednego `user_id` pada. Drugi gracz dostaje punkty,
  a mecz **jest** oznaczony (`errors 1`, `processed 1`).
- H9 `known bug (C2/P5)`: odczyt `scores` pada błędem 500 przy istniejących 9 punktach.
  UPSERT zapisuje 3, czyli nadpisuje sumę.

Nazwy testów known-bug wskazują opcję #2 z `research.md`.

#### 3. Konfiguracja runnerów i pokrycia

**File**: `vitest.config.ts`, `supabase/functions/deno.json`

**Intent**: Vitest zbiera testy Edge, bramka pokrycia pozostaje zielona, a Deno/LSP nie
sprawdza plików Vitest.

**Contract**:
- `test.include` dostaje `supabase/functions/**/*.test.ts`.
- `coverage.exclude` dostaje `supabase/functions/sync-matches/index.ts` z komentarzem:
  „powłoka handlera + ingest (ryzyko #2) poza zakresem pokrycia; scoring i mapowanie
  mierzone w wydzielonych modułach”.
- `deno.json` dostaje `"exclude": ["**/*.test.ts"]`.

### Success Criteria:

#### Automated Verification:

- Nowe testy charakteryzujące przechodzą: `npx vitest run supabase/functions`
- Cały zestaw i globalne progi pokrycia przechodzą: `npm run test:coverage` (exit 0)
- Lint przechodzi: `npm run lint`
- Kod produkcyjny Edge nietknięty względem ostatniego commita: `git diff HEAD --quiet -- supabase/functions/sync-matches/index.ts`
- `deno check --no-lock supabase/functions/sync-matches/index.ts` przechodzi

#### Manual Verification:

- Każdy test known-bug (H7–H9) czytelnie opisuje defekt i wskazuje opcję #2
- Mutacja kontrolna wykrywana: tymczasowa zmiana `POINTS_FOR_CORRECT_BET` na 4 wywala H1–H3 (potem revert)

**Implementation Note**: Po zielonej weryfikacji automatycznej zatrzymaj się na
potwierdzenie ręczne. Commit:
`test(refactor-opportunities): characterize edge scoring via handler (p1)`.

---

## Phase 2: Baseline wdrożenia (tylko odczyt)

### Overview

Zanim cokolwiek pogłębi zależność od importu spoza folderu funkcji, ustalamy, co jest
wdrożone. Pobieramy to jako źródło rollbacku i sprawdzamy niezmieniony HEAD lokalnie.
Bez zapisów w produkcji i bez zmian w kodzie.

### Changes Required:

#### 1. Rejestr baseline

**File**: `context/changes/refactor-opportunities/deploy-verification.md` (nowy, sekcja `## Baseline`)

**Intent**: Zamykamy unknowns z research (wdrożona wersja, zawartość deployu, bundling
importu spoza folderu funkcji) i ustalamy realny cel rollbacku.

**Contract** (zapis):
- data i wersje `supabase` CLI oraz Deno;
- wynik `supabase functions list`: wersja i data aktualizacji `sync-matches`;
- wynik `supabase functions download sync-matches --use-api --workdir <tmp> --project-ref <ref>`
  (katalog poza repo). Czy pobrane źródło zawiera `score-rule.ts` spoza folderu funkcji
  i czy jest zgodne z `2956e01` albo wcześniejszą wersją;
- lokalizacja kopii źródła do rollbacku (poza repo; do repo nie commitujemy kodu
  z produkcji);
- wynik `supabase functions serve sync-matches` na niezmienionym HEAD po `supabase start`
  (Docker), `curl '…/functions/v1/sync-matches?mode=live'`: status i blok `scoring`;
- gdzie skonfigurowany jest cron `sync-matches` i jaki ma harmonogram, jeśli da się
  ustalić (dashboard lub `pg_cron`);
- **decyzję**:
  - bundling importu spoza folderu funkcji potwierdzony (w źródle wdrożonym albo
    w lokalnym serve) → kontynuujemy F3;
  - bundling nie działa → **STOP**, aktualizacja planu o przeniesienie `score-rule.ts`
    do `supabase/functions/_shared/` przed F3.

Bez sekretów, kluczy i danych użytkowników.

### Success Criteria:

#### Automated Verification:

- Kod nietknięty względem ostatniego commita: `git diff HEAD --quiet -- supabase src tests vitest.config.ts`
- Pobrane źródło nie trafiło do repo: `git status --porcelain -- supabase/functions` pusty
- `deno check --no-lock supabase/functions/sync-matches/index.ts` przechodzi

#### Manual Verification:

- `supabase functions list` i `download` (w katalogu tymczasowym) wykonane, wynik zapisany
- Lokalny `functions serve` niezmienionego HEAD zwraca 200 z blokiem `scoring`
- Decyzja bundlingu (kontynuacja / STOP) zapisana w `deploy-verification.md` i zaakceptowana

**Implementation Note**: Komendy z dostępem do projektu i Docker wykonuje człowiek (lub
agent za jego zgodą). Commit:
`docs(refactor-opportunities): record edge deploy baseline (p2)`.

---

## Phase 3: Ekstrakcja modułu scoringu (dosłowne przeniesienie)

### Overview

Przenosimy orkestrację scoringu do importowalnego modułu bez zmiany logiki. Testy z F1
są siatką bezpieczeństwa i nie mogą być edytowane.

### Changes Required:

#### 1. Moduł scoringu

**File**: `supabase/functions/sync-matches/scoring.ts` (nowy)

**Intent**: Dosłownie przenosimy `scoreFinishedMatches` (`index.ts:161-256`) razem
z `UnscoredMatch`/`BetToScore` (`:118-128`).

**Contract**:
- `export async function scoreFinishedMatches(supabase: SupabaseClient): Promise<ScoringResult>`
  oraz `export interface ScoringResult { processed_matches; updated_scores; errors }`.
- Importy:
  - `import type { SupabaseClient } from "@supabase/supabase-js"`,
  - `POINTS_FOR_CORRECT_BET` z `../../../src/lib/scoring/score-rule.ts`,
  - `import type { MatchOutcome } from "./match-mapping.ts"`.
- Moduł nie odwołuje się do globalnego `Deno`.

#### 2. Typy słownika Edge

**File**: `supabase/functions/sync-matches/match-mapping.ts` (nowy)

**Intent**: Przenosimy tylko aliasy `MatchStatus`/`MatchOutcome` (`index.ts:29-30`).
Funkcje mapujące przenosimy dopiero w F5, po ich charakteryzacji.

**Contract**: `export type MatchStatus`, `export type MatchOutcome`, bez zmian treści.

#### 3. Wpięcie w handler

**File**: `supabase/functions/sync-matches/index.ts`

**Intent**: Usuwamy przeniesione bloki i importujemy je z nowych modułów.

**Contract**:
- `SyncResults.scoring` ma typ `ScoringResult`.
- Wywołanie w `:532` bez zmian.
- Import `POINTS_FOR_CORRECT_BET` przechodzi do `scoring.ts`.

### Success Criteria:

#### Automated Verification:

- Testy F1 przechodzą: `npx vitest run supabase/functions`
- Testy F1 i fake nieedytowane: `git diff HEAD --quiet -- supabase/functions/sync-matches/handler.characterization.test.ts tests/support`
- `deno check --no-lock supabase/functions/sync-matches/index.ts` przechodzi
- Graf zależności bez nowych naruszeń: `npm run deps:check`
- `npm run test:coverage` i `npm run lint` przechodzą

#### Manual Verification:

- `git diff HEAD --color-moved=zebra` pokazuje przeniesione bloki bez zmian treści (poza importami/eksportami)

**Implementation Note**: Zatrzymaj się na potwierdzenie ręczne. Commit:
`refactor(refactor-opportunities): extract edge scoring module (p3)`.

---

## Phase 4: Testy modułu i podpięcie wspólnej reguły

### Overview

Dodajemy testy bezpośrednie `scoring.ts` **tylko** dla sygnału, którego nie dają piny
handlera, a potem zastępujemy porównanie wywołaniem `pointsForBet`.

### Changes Required:

#### 1. Testy modułu

**File**: `supabase/functions/sync-matches/scoring.test.ts` (nowy)

**Intent**: Prawdziwy `createClient` z fake `fetch` (bez stubu `Deno`). Punkty literałem `3`.

**Contract** (scenariusze z nowym sygnałem):
- M1: mecz bez typów. Mecz oznaczony, brak żądań do `scores`.
- M2: wszystkie typy nietrafione. Mecz oznaczony, brak żądań do `scores`.
- M3: macierz W/D/W. Punkty tylko przy dokładnej zgodności `picked_result` i `result`
  dla każdej z 9 kombinacji.
- M4: żądanie UPSERT ma `on_conflict=user_id,tournament_id` i `updated_at` w treści.
- M5: kształt zwracanego `ScoringResult` przy wywołaniu bezpośrednim.

Pozostałe scenariusze Node mapujemy w opisie commita na ID handlera:

| Scenariusz Node | Pin handlera |
| --- | --- |
| happy path | H1–H4 |
| błędy pobrania typów i flagi | H6, H7 |
| błąd UPSERT | H8 |
| błąd pobrania meczów | H5 |
| nowy użytkownik | H2 |

Scenariusze `dryRun` (2) pomijamy, bo Edge nie ma tego trybu.

#### 2. Wspólna reguła w scoringu

**File**: `supabase/functions/sync-matches/scoring.ts`

**Intent**: Decyzję o nagrodzie podejmuje `pointsForBet`, co zamyka P2. Zachowanie się
nie zmienia.

**Contract**:
- `pointsForBet(bet.picked_result, match.result)`. Odczyt i UPSERT tylko dla wyniku
  `> 0`, `newPoints = existing + points`.
- Testy F1 i F4 bez zmian.

### Success Criteria:

#### Automated Verification:

- Testy modułu i handlera przechodzą: `npx vitest run supabase/functions`
- Testy handlera nieedytowane: `git diff HEAD --quiet -- supabase/functions/sync-matches/handler.characterization.test.ts`
- `pointsForBet` ma produkcyjne wywołanie: `npx -p @ast-grep/cli@0.45.3 ast-grep run -p 'pointsForBet($$$)' supabase/functions` zwraca trafienie w `scoring.ts`
- `deno check --no-lock supabase/functions/sync-matches/index.ts`, `npm run test:coverage`, `npm run lint` przechodzą

#### Manual Verification:

- Mapa scenariuszy Node → M1–M5 / H-ID kompletna (19 pozycji) w opisie commita
- Testy M1–M5 były zielone przed zamianą na `pointsForBet` (kolejność potwierdzona w opisie commita)

**Implementation Note**: Kolejność w fazie: najpierw testy modułu (zielone na
dotychczasowym porównaniu), dopiero potem zamiana. Oba kroki trafiają do jednego commita.
Commit: `refactor(refactor-opportunities): cover edge scoring module and use shared rule (p4)`.

---

## Phase 5: Guard słownika statusów i wyników (C7)

### Overview

„Guard, nie przebudowa”. Najpierw charakteryzujemy mapowanie statusów przez handler,
potem przenosimy je do `match-mapping.ts` z tablicami `as const`, na końcu dodajemy test
zgodności ze źródłem `Constants.public.Enums.*`.

### Changes Required:

#### 1. Rozszerzenie fake'a o tryb `full`

**File**: `tests/support/postgrest-fake.ts`

**Intent**: Fake obsługuje ścieżkę `syncFullMode` bez zmian w kodzie produkcyjnym.

**Contract**:
- tabela `tournaments`: UPSERT z `on_conflict=api_tournament_id` plus `select` i
  `.single()` (`index.ts:279-289`);
- `order` i `limit` przy odczycie ostatniego meczu (`:301-307`);
- insert do `matches` (`:369`);
- `onExternal` dla api-football:
  - `/fixtures?league&season&last=1` (sezon, `:142`),
  - `/fixtures?league&season[&from]` (`:318`);
  - odpowiada dla każdego sezonu, bo kod zależy od `new Date().getFullYear()` (`:139`).

#### 2. Charakteryzacja mapowania statusów

**File**: `supabase/functions/sync-matches/handler.characterization.test.ts`

**Intent**: Przez `GET ?mode=full` z pustymi `matches` przybijamy status i wynik
wstawionych meczów:
- każdy kod z mapy,
- nieznany kod → `SCHEDULED`,
- `FINISHED` z golami → wynik,
- inne statusy → `result: null`.

#### 3. Przeniesienie mapowania

**File**: `supabase/functions/sync-matches/match-mapping.ts`, `supabase/functions/sync-matches/index.ts`

**Intent**: Przenosimy `mapApiStatus` i `calculateResult` (`index.ts:32-71`). Mapę
statusów wynosimy do stałej modułu, a typy wyprowadzamy z tablic, żeby guard miał
wartości runtime (CI nie ma typechecku).

**Contract**:
- `export const MATCH_STATUSES = [...] as const`,
  `export type MatchStatus = (typeof MATCH_STATUSES)[number]`.
- Analogicznie `MATCH_OUTCOMES` / `MatchOutcome`.
- `export const API_STATUS_MAP: Readonly<Record<string, MatchStatus>>`.
- `mapApiStatus` i `calculateResult` eksportowane, bez zmian logiki.

#### 4. Tablica wyników reguły

**File**: `src/lib/scoring/score-rule.ts`

**Intent**: Wartość runtime dla zbioru wyników reguły, bez łamania czystości importu dla Deno.

**Contract**:
- `export const SCORE_RULE_OUTCOMES = ["HOME_WIN","DRAW","AWAY_WIN"] as const`.
- `ScoreRuleOutcome = (typeof SCORE_RULE_OUTCOMES)[number]`.

#### 5. Test-guard

**File**: `supabase/functions/sync-matches/vocabulary.test.ts` (nowy)

**Intent**: Deterministyczna asercja równości zbiorów (bez względu na kolejność) ze
źródłem `Constants.public.Enums`. Guard leży po stronie Edge, więc zachowuje kierunek
zależności `supabase/functions` → `src`.

**Contract**:
- `match_outcome` ≡ `MATCH_OUTCOMES` ≡ `SCORE_RULE_OUTCOMES` ≡
  `createBetSchema.shape.picked_result.options` ≡ `updateBetSchema.shape.picked_result.options`.
- `match_status` ≡ `MATCH_STATUSES` ≡ `new Set(Object.values(API_STATUS_MAP))`.
- Importy względne:
  - `../../../src/db/database.types.ts`,
  - `../../../src/lib/validation/bet.validation.ts`,
  - `../../../src/lib/scoring/score-rule.ts`,
  - `./match-mapping.ts`.

### Success Criteria:

#### Automated Verification:

- Testy Edge (charakteryzacja mapowania + guard) przechodzą: `npx vitest run supabase/functions`
- `deno check --no-lock supabase/functions/sync-matches/index.ts`, `npm run deps:check`, `npm run test:coverage`, `npm run lint`, `npm run build` przechodzą

#### Manual Verification:

- Charakteryzacja mapowania była zielona **przed** przeniesieniem (kolejność potwierdzona w opisie commita)
- Mutacja kontrolna: usunięcie `"DRAW"` z zod `createBetSchema` albo `PST` z `API_STATUS_MAP` wywala guard (potem revert)

**Implementation Note**: Zatrzymaj się na potwierdzenie ręczne. Commit:
`test(refactor-opportunities): guard match vocabulary copies (p5)`.

---

## Phase 6: Wdrożenie mechanizmu (Edge w produkcji)

### Overview

Wdrażamy zrefaktoryzowaną funkcję w bezpiecznym oknie i potwierdzamy jej działanie.
Route Node nadal istnieje, więc to czysto etap mechanizmu.

### Changes Required:

#### 1. Zapis wdrożenia

**File**: `context/changes/refactor-opportunities/deploy-verification.md` (sekcja `## Wdrożenie po refaktorze`)

**Intent**: Trwały ślad, że mechanizm działa, zanim włączymy egzekwowanie (F7).

**Contract**:
- data i okno (potwierdzenie: poza dniami meczowymi);
- SHA z `git rev-parse HEAD` (commit F5) oraz potwierdzenie, że kod funkcji nie ma
  niezacommitowanych zmian;
- wyniki obu zapytań tylko do odczytu z Critical Implementation Details (oba = 0);
- wynik lokalnego `functions serve` na HEAD (status, blok `scoring`);
- odpowiedź produkcyjna (`success`, blok `scoring`) i logi funkcji bez błędów importu;
- procedura rollbacku.

### Success Criteria:

#### Automated Verification:

- Kod funkcji i reguły bez niezacommitowanych zmian: `git diff HEAD --quiet -- supabase/functions src/lib/scoring` (SHA z `git rev-parse HEAD` zapisany w `deploy-verification.md`)
- `deno check --no-lock supabase/functions/sync-matches/index.ts` przechodzi
- `npm run test:coverage` przechodzi

#### Manual Verification:

- Lokalny `functions serve` na HEAD zwraca 200 z blokiem `scoring`
- Okno poza dniami meczowymi i oba zapytania tylko do odczytu (nierozliczone `FINISHED`, kandydaci live) zwracają 0
- Deploy produkcyjny (`supabase functions deploy sync-matches`) i jedno wywołanie `?mode=live` zwracają `success: true` z blokiem `scoring`; logi bez błędów importu
- `deploy-verification.md` uzupełniony i przejrzany

**Implementation Note**: Deploy i wywołanie produkcyjne wykonuje człowiek z dostępem do
projektu. Rollback: redeploy źródła pobranego w F2, np. `supabase functions deploy
sync-matches --workdir <tmp z F2> --project-ref <ref>`. Jeśli F2 wykazało, że wdrożona
wersja odpowiada commitowi z repo, wystarczy redeploy z worktree tego commita. Commit:
`docs(refactor-opportunities): record edge deploy verification (p6)`.

---

## Phase 7: Włączenie egzekwowania — wygaszenie ścieżki Node

### Overview

Wdrożona orkestracja Edge staje się jedyną ścieżką scoringu. Usuwamy diagnostyczną
ścieżkę Node i aktualizujemy dokumenty, które na nią wskazują.

### Changes Required:

#### 1. Usunięcie kodu

**File**: `src/pages/api/admin/score-matches.ts`, `src/lib/services/scoring.service.ts`, `src/lib/services/scoring.service.test.ts`, `src/types.ts`

**Intent**: Brak osiągalnej w produkcji trasy scoringu i brak drugiej kopii orkestracji.

**Contract**:
- Pliki route, serwisu i testu usunięte, pusty katalog `src/pages/api/admin/` też.
- Z `src/types.ts` znika sekcja `ScoreMatchesCommand` / `ScoreMatchesResponseDTO` (`:380-409`).

#### 2. Dokumenty

**File**: `.ai/api-plan.md`, `.ai/test-plan.md`, `context/foundation/test-plan.md`, `CLAUDE.md`, `src/lib/scoring/score-rule.ts`, `context/changes/testing-scoring-bet-lock-core/plan.md`

**Intent**: Dokumentacja i kanon testów (czytany przez `/10x-tdd`) wskazują jedną
orkestrację, nową lokalizację testów i uczciwe granice fake'a.

**Contract**:
- `.ai/api-plan.md` §`POST /api/admin/score-matches` (`:787`): nota „usunięty
  w `refactor-opportunities`; scoring wyłącznie w `sync-matches`”.
- `.ai/test-plan.md`: nota przy TC-SCORE-UNIT-* i TC route (`:289-551`, `:718-742`)
  wskazująca nowe testy.
- `context/foundation/test-plan.md`:
  - §2, wiersz ryzyka #1: „Likely cheapest layer” wskazuje testy Edge
    (`handler.characterization.test.ts`, `scoring.test.ts`) zamiast „extend existing
    service tests”;
  - §6.1: `scoring.service.test.ts` w reference test zastępują testy Edge;
  - §6.2: nota, że `tests/support/postgrest-fake.ts` to warstwa charakteryzacji
    (bez RLS, constraintów i współbieżności). Nie zastępuje integracji z prawdziwym
    lokalnym schematem, która pozostaje celem §3 Phase 2 i opcji #2.
- `CLAUDE.md` sekcja sync-matches: scoring w `scoring.ts`, słownik w `match-mapping.ts`,
  testy Vitest obok funkcji, brak ręcznego route.
- Nagłówek `score-rule.ts`: importerem jest `supabase/functions/sync-matches/scoring.ts`
  (plus guard), a fałszywe „There is no `prd.md` on disk” zastępuje odwołanie do `.ai/prd.md`.
- `testing-scoring-bet-lock-core/plan.md`: inline nota w bloku Phase 2 (bez zmiany
  tytułów w Progress), że cel `scoring.service.ts` został usunięty i pokrycie żyje
  w testach Edge z tej zmiany.

### Success Criteria:

#### Automated Verification:

- Brak odwołań: `rg -n "scoreMatches|ScoreMatches|scoring\.service|score-matches" -g '!context/changes/**' -g '!context/archive/**' -g '!context/map/**' -g '!.planning/**' -g '!.ai/**' -g '!**/._*'` zwraca 0 trafień
- Build bez route: `npm run build`
- Unit + globalne progi pokrycia po usunięciu testów Node: `npm run test:coverage`
- `npm run lint` i `deno check --no-lock supabase/functions/sync-matches/index.ts` przechodzą

#### Manual Verification:

- Na `npm run dev` `POST /api/admin/score-matches` zwraca 404
- Noty w `.ai/*` oraz test-plan §2/§6.1/§6.2 wskazują istniejące pliki i nie są sprzeczne
- Nota w `testing-scoring-bet-lock-core/plan.md` zrozumiała dla kogoś wznawiającego tamtą zmianę

**Implementation Note**: Po merge wdrożenie aplikacji Astro usuwa route z produkcji
(hosting poza zakresem planu). Rollback: `git revert` commita fazy. Commit:
`refactor(refactor-opportunities): retire node scoring path (p7)`.

---

## Testing Strategy

### Unit Tests:

- Moduł `scoring.ts`: tylko sygnał spoza pinów handlera (M1–M5).
- Guard słownika: równość zbiorów ze źródłem `Constants`.
- Punkty zawsze literałem `3` (oracle z §6.1).

### Integration Tests:

- Charakteryzacja handlera `sync-matches` (tryb `live`: scoring H1–H9; tryb `full`:
  mapowanie statusów) z fake PostgREST i api-football na brzegu `fetch`.
- Piny known-bug H7–H9 to ostrza dla opcji #2 (C2). Ta zmiana je odwróci i zaktualizuje nazwy.
- **Granice.** Fake nie emuluje RLS, constraintów, triggerów, transakcji ani
  współbieżności. Testy działają na supabase-js z `node_modules` (2.77.0), a Deno
  rozwiązuje `^2.77.0` bez locka. Integracja z prawdziwym lokalnym schematem (test-plan
  §6.2, §3 Phase 2) i izolacja od destrukcyjnego teardownu E2E (V25) to prerekwizyty
  opcji #2.
- Pokrycie: `index.ts` (powłoka handlera i ingest) wykluczony z coverage.
  Scoring i mapowanie są mierzone w wydzielonych modułach.

### Manual Testing Steps:

1. Mutacje kontrolne z F1 i F5 (stała punktów, wpis słownika) wywalają testy.
2. Baseline F2: `functions list`, `download` do katalogu tymczasowego, lokalny `serve` na niezmienionym HEAD.
3. F6: okno i zapytania tylko do odczytu, lokalny `serve`, deploy i jedno wywołanie.
4. `POST /api/admin/score-matches` po F7 zwraca 404.

## Performance Considerations

Brak zmian w zapytaniach i ich liczbie. Wyciągnięcie mapy statusów do stałej modułu
usuwa alokację per wywołanie, co jest pomijalne.

## Migration Notes

- Bez migracji DB i bez zmian danych. Znane rozjazdy punktów (jeśli istnieją) zostają.
  Ich wykrycie i rekoncyliacja należą do opcji #2.
- Brak `dry_run`: ręczny rescoring to wywołanie `sync-matches`.
- Otwarte ryzyka na później:
  - destrukcyjny teardown E2E w CI (V25) wymusza izolowany harness dla #2;
  - C6 zwiększy liczbę wierszy rankingu i przyspieszy osiągalność defektu C5;
  - brak locka wersji supabase-js w Deno.

## References

- Research (ranking, weryfikacja V1–V39): `context/changes/refactor-opportunities/research.md`
- Przegląd planu: `context/changes/refactor-opportunities/reviews/plan-review.md`
- Analiza przepływu: `context/changes/scoring-flow-analysis/research.md`
- Plan kursu: `context/course/tydzien-4-10xarchitect-plan.md` (Etap 3); lekcja L4 „Zadania praktyczne → Krok 4”
- Poprzednia zmiana: `context/changes/testing-scoring-bet-lock-core/plan.md:89-106`
- Edge: `supabase/functions/sync-matches/index.ts:29-71,118-128,139-142,161-256,279-307,369,403-411,464-475,492-544`
- Node: `src/lib/services/scoring.service.ts:1-146`, `src/pages/api/admin/score-matches.ts:11-52`
- Reguła: `src/lib/scoring/score-rule.ts:1-36`
- Słownik: `src/db/database.types.ts:208-216,345-353`, `src/lib/validation/bet.validation.ts:11,29`
- Konfiguracja: `vitest.config.ts:8,12-21`, `supabase/functions/deno.json`, `.dependency-cruiser.cjs:47`, `.github/workflows/pull-request.yml`
- Test-plan: `context/foundation/test-plan.md:70,135-153`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Charakteryzacja scoringu przez handler Edge

#### Automated

- [x] 1.1 Testy charakteryzujące handler przechodzą (npx vitest run supabase/functions) — 25faf13
- [x] 1.2 Cały zestaw i globalne progi pokrycia przechodzą (npm run test:coverage) — 25faf13
- [x] 1.3 Lint przechodzi (npm run lint) — 25faf13
- [x] 1.4 index.ts nietknięty względem HEAD (git diff HEAD --quiet) — 25faf13
- [x] 1.5 deno check index.ts przechodzi — 25faf13

#### Manual

- [x] 1.6 Testy known-bug H7–H9 opisują defekt i wskazują opcję #2 — 25faf13
- [x] 1.7 Mutacja kontrolna stałej punktów wywala H1–H3 — 25faf13

### Phase 2: Baseline wdrożenia (tylko odczyt)

#### Automated

- [ ] 2.1 Kod nietknięty względem HEAD
- [ ] 2.2 Pobrane źródło nie trafiło do repo
- [ ] 2.3 deno check index.ts przechodzi

#### Manual

- [ ] 2.4 functions list i download (katalog tymczasowy) wykonane i zapisane
- [ ] 2.5 Lokalny functions serve niezmienionego HEAD zwraca 200 z blokiem scoring
- [ ] 2.6 Decyzja bundlingu zapisana i zaakceptowana

### Phase 3: Ekstrakcja modułu scoringu (dosłowne przeniesienie)

#### Automated

- [ ] 3.1 Testy F1 przechodzą
- [ ] 3.2 Testy F1 i fake nieedytowane względem HEAD
- [ ] 3.3 deno check index.ts przechodzi
- [ ] 3.4 Graf zależności bez nowych naruszeń (npm run deps:check)
- [ ] 3.5 test:coverage i lint przechodzą

#### Manual

- [ ] 3.6 Diff --color-moved pokazuje wyłącznie przeniesione bloki

### Phase 4: Testy modułu i podpięcie wspólnej reguły

#### Automated

- [ ] 4.1 Testy modułu i handlera przechodzą
- [ ] 4.2 Testy handlera nieedytowane względem HEAD
- [ ] 4.3 pointsForBet ma produkcyjne wywołanie w scoring.ts (ast-grep)
- [ ] 4.4 deno check, test:coverage i lint przechodzą

#### Manual

- [ ] 4.5 Mapa 19 scenariuszy Node → M1–M5 / H-ID w opisie commita
- [ ] 4.6 M1–M5 zielone przed zamianą na pointsForBet

### Phase 5: Guard słownika statusów i wyników (C7)

#### Automated

- [ ] 5.1 Testy Edge (charakteryzacja mapowania + guard) przechodzą
- [ ] 5.2 deno check, deps:check, test:coverage, lint i build przechodzą

#### Manual

- [ ] 5.3 Charakteryzacja mapowania zielona przed przeniesieniem
- [ ] 5.4 Mutacja kontrolna słownika wywala guard

### Phase 6: Wdrożenie mechanizmu (Edge w produkcji)

#### Automated

- [ ] 6.1 Kod funkcji i reguły bez niezacommitowanych zmian, SHA zapisany
- [ ] 6.2 deno check index.ts przechodzi
- [ ] 6.3 test:coverage przechodzi

#### Manual

- [ ] 6.4 Lokalny functions serve na HEAD zwraca 200 z blokiem scoring
- [ ] 6.5 Okno poza dniami meczowymi i oba zapytania tylko do odczytu zwracają 0
- [ ] 6.6 Deploy produkcyjny i jedno wywołanie zwracają success z blokiem scoring
- [ ] 6.7 deploy-verification.md uzupełniony i przejrzany

### Phase 7: Włączenie egzekwowania — wygaszenie ścieżki Node

#### Automated

- [ ] 7.1 Brak odwołań do ścieżki Node poza artefaktami historycznymi (rg)
- [ ] 7.2 Build przechodzi bez route
- [ ] 7.3 test:coverage przechodzi po usunięciu testów Node
- [ ] 7.4 Lint i deno check przechodzą

#### Manual

- [ ] 7.5 POST /api/admin/score-matches zwraca 404 na dev
- [ ] 7.6 Noty w .ai/* i test-plan §2/§6.1/§6.2 spójne i wskazują istniejące pliki
- [ ] 7.7 Nota w testing-scoring-bet-lock-core/plan.md zrozumiała
