# Jedna przetestowana orkestracja scoringu — Plan Brief

> Full plan: `context/changes/refactor-opportunities/plan.md`
> Research: `context/changes/refactor-opportunities/research.md`
> Review: `context/changes/refactor-opportunities/reviews/plan-review.md` (REVISE → 9/9 ustaleń naniesionych)

## What & Why

Punktacja jest zaimplementowana dwa razy. Produkcyjna kopia w Edge Function
`sync-matches` nie ma testów i nie da się jej zaimportować. Diagnostyczna kopia w Node
ma 19 testów, ale nie działa w produkcji, a jej route sprawdza tylko logowanie. Obie
kopie inaczej obsługują błędy. Każda poprawka scoringu (w tym przyszła atomowość,
opcja #2) musiałaby powstać dwa razy. Realizujemy opcję **#1** z rankingu (C1 + C4)
plus tani guard **C7**.

## Starting Point

- Scoring Edge to prywatna funkcja w `index.ts` z `Deno.serve` na najwyższym poziomie.
- `pointsForBet` nie ma produkcyjnego wywołania.
- Vitest zbiera tylko `src/**`, progi pokrycia są globalne.
- Import `../../../src` jest w Edge od `2956e01`, ale nie wiadomo, czy jest wdrożony
  i czy bundler go obsługuje.
- Sondy potwierdziły, że handler da się przetestować bez zmiany kodu: stub `Deno` +
  fake PostgREST na `fetch`.

## Desired End State

Scoring żyje w `sync-matches/scoring.ts`, używa `pointsForBet` i jest pokryty testami
na poziomie handlera i modułu, z przypiętymi znanymi błędami C2/C3. Guard po stronie
Edge pilnuje zgodności słownika statusów i wyników z enumami bazy. Wdrożenie ma baseline
i zapis weryfikacji. Route, serwis, testy i DTO scoringu Node nie istnieją, a kanon
testów (§2, §6.1, §6.2) jest spójny.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Zakres | #1 (C1+C4) + guard C7 | Rozmiar S, bez migracji; liść Mikado dla #2; C7 wart dodania niezależnie. | Research / Plan |
| Znane błędy Edge | Przypiąć testami, nie naprawiać | Naprawa C3 bez transakcji C2 zamienia utratę nagrody w podwójne naliczenie. | Research / Plan |
| Route Node | Usunąć (bez bramki i drift query) | Diagnostyczny, bez wywołań; ręczny rescoring = wywołanie `sync-matches`. | Plan |
| Reguła w Edge | `pointsForBet`; `bet-utils` poza zakresem | Zamyka P2; reguła wyświetlania nie powinna zależeć od formuły punktów. | Plan (V1) |
| Szew charakteryzacji | Handler + fake `fetch` (PostgREST), `failOn` z predykatem | Test przed dotknięciem, bez edycji `index.ts`; pozwala trafić pojedyncze zapytanie. | Plan / Review F5 |
| Bramka pokrycia | `index.ts` wykluczony z coverage już w F1 | Zmierzone: bez tego F1 ląduje na czerwono (60% vs próg 70%). | Review F1 |
| Deploy | Baseline tylko odczytem przed ekstrakcją (list/download/serve) + wdrożenie w F6 | Rollback musi celować w faktycznie wdrożoną wersję; bundling sprawdzony przed pogłębieniem importu. | Review F2 |
| Okno produkcyjne | Poza dniami meczowymi, 0 nierozliczonych i 0 kandydatów live | `mode=live` sam może ustawić `FINISHED` i od razu punktować. | Review F3 |
| Kanon testów | §6.2 i §2 #1 aktualizowane; granice fake'a jawne | Fake to charakteryzacja, nie integracja z realną bazą. | Review F4 |
| Weryfikacja | Porównania do `HEAD`, kolejność „test → zmiana” w kryteriach ręcznych | Zgodne z sekwencją `/10x-implement`; 1 faza = 1 commit. | Review F6 |
| Testy modułu | Tylko nowy sygnał (M1–M5), reszta zmapowana na H-ID | Unikamy dublowania pinów handlera. | Review F7 |
| Lokalizacja guarda | `supabase/functions/sync-matches/vocabulary.test.ts` | Zachowuje kierunek zależności `functions → src`. | Review F8 |
| Mechanizm vs egzekwowanie | F6 deploy (mechanizm) → F7 wyłączność (egzekwowanie); rozbieżność kurs/lekcja zapisana | Uczciwe odczytanie bez sztucznej flagi. | Kurs / Review F9 |

## Scope

**In scope:**
- testy charakteryzujące handler (scoring + mapowanie) i moduł,
- baseline wdrożenia,
- ekstrakcja `scoring.ts` i `match-mapping.ts`,
- `pointsForBet`,
- guard słownika,
- wdrożenie,
- usunięcie ścieżki Node,
- dokumenty (`.ai`, test-plan §2/§6.1/§6.2, `CLAUDE.md`, nota w `testing-scoring-bet-lock-core`).

**Out of scope:**
- C2, samodzielny guard C3, C5, C6,
- P15, P16, P17,
- reguła `bet-utils`,
- charakteryzacja pełnego ingestu,
- zmiany CI i `context/map/*`,
- statusy §3,
- migracje, rekoncyliacja, MSW,
- `_shared/` (tylko jeśli F2 wykaże problem z bundlingiem).

## Architecture / Approach

Strangler w mikroskali, porządek „test przed dotknięciem”. Fake PostgREST na brzegu
sieci (`tests/support/postgrest-fake.ts`) obsługuje testy handlera (`Deno.serve`
przechwycony stubem) i modułu (prawdziwy `createClient`). Kod przenosimy dosłownie pod
ochroną testów, a zmiany semantyczne (reguła, wyniesienie mapy) robimy dopiero na
zielonych testach.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Charakteryzacja handlera | Piny H1–H9 (w tym known-bug), coverage bez `index.ts` | Fake PostgREST niewierny (406 `PGRST116`, filtr `is_scored`) |
| 2. Baseline wdrożenia | Wdrożona wersja pobrana, lokalny serve, decyzja bundlingu | `download` w katalogu repo nadpisze pliki |
| 3. Ekstrakcja modułu | `scoring.ts` importowalny, testy F1 bez edycji | Przypadkowa zmiana logiki przy przenosinach |
| 4. Testy modułu + `pointsForBet` | M1–M5, reguła współdzielona | Luka w mapie scenariuszy Node |
| 5. Guard C7 | Mapowanie scharakteryzowane (`full`) i przeniesione, guard | Rozszerzenia fake'a dla trybu `full` |
| 6. Wdrożenie mechanizmu | Deploy w bezpiecznym oknie, zapis weryfikacji | Wywołanie w oknie meczowym / równolegle z cronem |
| 7. Wygaszenie Node | Jedna orkestracja, kanon testów spójny | Sprzeczności w dokumentach |

**Prerequisites:**
- czyste drzewo na `10xArchitect_cert`,
- zalogowane Supabase CLI z dostępem do projektu i Docker (F2, F6),
- człowiek do deployu (F6).

**Estimated effort:** ~3–4 sesje: F1 (1), F2–F4 (1), F5 (1), F6–F7 (1).

## Open Risks & Assumptions

- Hostowany bundler może nie obsłużyć importu `../../../src`. F2 to wykryje, zanim
  zależność się pogłębi; wtedy STOP i przeniesienie do `_shared/`.
- Fake nie emuluje RLS, constraintów ani współbieżności, a wersja supabase-js w Deno nie
  ma locka. Zielone testy nie dowodzą zachowania na prawdziwej bazie.
- Po F7 faza 2 `testing-scoring-bet-lock-core` traci cel, stąd nota.
- Prerekwizyty opcji #2 bez zmian: izolowany harness Supabase (V25), nieznany dryf
  punktów w produkcji.

## Success Criteria (Summary)

- W repo jest jedna orkestracja scoringu, pokryta testami, a jej wdrożenie jest
  potwierdzone w produkcji.
- Rozjazd kopii słownika lub zmiana punktacji wywala test w CI (`test:coverage`).
- Każda z 7 faz to osobny, zielony i odwracalny commit.
