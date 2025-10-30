Jesteś doświadczonym menedżerem produktu, którego zadaniem jest stworzenie kompleksowego dokumentu wymagań produktu (PRD) w oparciu o poniższe opisy:

<project_description>

### Główny problem

Organizacja nieformalnych zakładów sportowych w gronie znajomych jest procesem manualnym, podatnym na błędy i czasochłonnym. Używanie arkuszy kalkulacyjnych czy komunikatorów do śledzenia typów i wyników jest nieefektywne i psuje zabawę.

### Najmniejszy zestaw funkcjonalności

- Prosty system kont użytkowników (rejestracja, logowanie) oparty na Supabase Auth.
- Pobieranie i wyświetlanie listy nadchodzących meczów dla jednego, wybranego turnieju (np. Mistrzostwa Świata) z zewnętrznego API.
- Interfejs do obstawiania wyników (wygrana gospodarzy, remis, wygrana gości) dla zalogowanych użytkowników, z blokadą po rozpoczęciu meczu.
- Automatyczne obliczanie punktów po zakończeniu meczów (np. za pomocą Supabase Edge Function).
- Publiczna tablica wyników (Leaderboard), która pokazuje ranking wszystkich użytkowników na podstawie zdobytych punktów.

### Co NIE wchodzi w zakres MVP

- Tworzenie prywatnych grup i zapraszanie znajomych.
- Obsługa wielu lig lub turniejów jednocześnie.
- Zaawansowane opcje zakładów (np. dokładny wynik, strzelcy bramek).
- Powiadomienia (email, push) o wynikach czy nadchodzących meczach.
- Rozbudowane profile użytkowników, awatary, system znajomych.
- Aktualizacje wyników i rankingu w czasie rzeczywistym (wystarczy okresowa aktualizacja, np. raz na godzinę).

### Kryteria sukcesu

- Użytkownik jest w stanie samodzielnie przejść cały proces: rejestracja -> obstawienie meczu -> sprawdzenie swojej pozycji w rankingu.
- System punktacji działa poprawnie dla 99% rozegranych i zaktualizowanych spotkań.
  </project_description>

<project_details>
<conversation_summary>
<decisions>

1.  **System Punktacji:** W wersji MVP system będzie przyznawał 1 punkt za prawidłowe wytypowanie wyniku meczu (wygrana gospodarzy, remis, wygrana gości) i 0 punktów za błędny typ. Zrezygnowano z typowania dokładnego wyniku.
2.  **Dostawca Danych:** Aplikacja będzie korzystać z `api-football.com` z darmowym planem (100 zapytań/dzień).
3.  **Aktualizacja Danych:** Wyniki i punktacja będą aktualizowane co 2 godziny. Strategia zakłada minimalizację zapytań do API.
4.  **Obsługiwane Turnieje:** MVP będzie obsługiwać dwa turnieje: bieżącą edycję Ligi Mistrzów UEFA i Mistrzostwa Świata 2026.
5.  **Interfejs Turniejów:** Użytkownik będzie mógł przełączać się między turniejami, a każdy z nich będzie miał oddzielną tabelę wyników.
6.  **Rejestracja Użytkownika:** Proces rejestracji będzie wymagał podania adresu e-mail, hasła oraz unikalnej nazwy użytkownika (nicka).
7.  **Blokada Obstawiania:** Możliwość obstawiania meczu zostanie zablokowana na 5 minut przed jego oficjalnym rozpoczęciem, zgodnie z danymi z API. Użytkownicy mogą edytować swoje typy do tego momentu.
8.  **Mecze Odwołane/Przełożone:** Zakłady na mecze, które nie odbędą się w planowanym terminie, będą anulowane bez przyznawania punktów.
9.  **Ranking:** W przypadku równej liczby punktów, użytkownicy będą zajmować tę samą pozycję w rankingu.
10. **Dokumentacja:** Zostanie utworzona prosta strona z zasadami gry i systemem punktacji.
    </decisions>

<matched_recommendations>

1.  **Uproszczenie Punktacji:** Zalecono, aby w MVP pozostać przy prostszym systemie punktacji (1 pkt za W/D/W), co zostało zaakceptowane w celu przyspieszenia wdrożenia.
2.  **Strategia API:** Zalecono opracowanie strategii oszczędzania zapytań do API, aby zmieścić się w darmowym limicie, co zostało potwierdzone.
3.  **Przełączanie Turniejów:** Zalecono implementację prostego przełącznika (np. zakładki) do nawigacji między turniejami i ich rankingami.
4.  **Obsługa Błędów API:** Zalecono wprowadzenie statusu "Oczekuje na aktualizację" dla meczów bez wyników, aby funkcja licząca punkty je ignorowała do czasu otrzymania danych.
5.  **Edycja Typów:** Zalecono umożliwienie użytkownikom edycji swoich typów aż do momentu blokady, co poprawi elastyczność.
6.  **Obsługa Remisów w Rankingu:** Zalecono, aby użytkownicy z tą samą liczbą punktów mieli tę samą pozycję, co jest standardowym i prostym rozwiązaniem.
7.  **Strona z Zasadami:** Zalecono stworzenie prostej strony informacyjnej w celu zwiększenia transparentności systemu.
    </matched_recommendations>

<prd_planning_summary>

### Podsumowanie Planowania PRD

#### 1. Główne Wymagania Funkcjonalne

- **Uwierzytelnianie:** Prosty system rejestracji (email, hasło, nick) i logowania oparty na Supabase Auth.
- **Pobieranie Danych:** Integracja z `api-football.com` do pobierania listy nadchodzących meczów i wyników dla Ligi Mistrzów UEFA i MŚ 2026.
- **Interfejs Obstawiania:** Umożliwienie zalogowanym użytkownikom typowania wyników (W/D/W) dla nadchodzących meczów. Interfejs powinien wyświetlać drużyny, ich loga (jeśli dostępne) oraz datę i godzinę meczu w strefie czasowej użytkownika. Możliwość obstawiania jest blokowana na 5 minut przed meczem.
- **Automatyczne Obliczanie Punktów:** Supabase Edge Function uruchamiana co 2 godziny będzie pobierać wyniki zakończonych meczów i przeliczać punkty (1 pkt za trafienie, 0 za błąd).
- **Ranking (Leaderboard):** Publiczna, oddzielna dla każdego turnieju tablica wyników, wyświetlająca pozycję, nazwę użytkownika i sumę punktów.
- **Nawigacja:** Możliwość przełączania się między widokami/rankingami dostępnych turniejów.
- **Strona Informacyjna:** Statyczna podstrona lub okno modalne wyjaśniające zasady punktacji.

#### 2. Kluczowe Historie Użytkownika i Ścieżki Korzystania

- **Nowy Użytkownik:** Jako nowy użytkownik, chcę móc szybko założyć konto za pomocą e-maila i hasła, aby móc zacząć obstawiać mecze.
- **Zalogowany Użytkownik (Obstawianie):** Jako zalogowany użytkownik, chcę widzieć listę nadchodzących meczów w wybranym turnieju i móc łatwo postawić swój typ (wygrana gospodarzy, remis, wygrana gości) na każdy z nich. Chcę mieć też możliwość zmiany typu przed rozpoczęciem meczu.
- **Zalogowany Użytkownik (Ranking):** Jako zalogowany użytkownik, chcę po zakończeniu meczów móc sprawdzić swoją pozycję i liczbę punktów w publicznym rankingu, aby porównać się z innymi graczami.

#### 3. Kryteria Sukcesu i Sposoby Ich Mierzenia

- **Płynność Procesu:** Użytkownik jest w stanie samodzielnie przejść cały proces: rejestracja -> wybór turnieju -> obstawienie meczu -> sprawdzenie swojej pozycji w rankingu.
- **Poprawność Punktacji:** System punktacji działa poprawnie dla 99% rozegranych i zaktualizowanych spotkań.
- **Kluczowe Wskaźniki (KPIs):**
  - Liczba zarejestrowanych użytkowników.
  - Stosunek użytkowników, którzy obstawili co najmniej jeden mecz, do wszystkich zarejestrowanych.

</prd_planning_summary>

<unresolved_issues>

- **Skalowalność API:** Strategia odpytywania API (pobieranie wszystkich meczów dnia, a następnie aktualizacja wyników jednym zapytaniem) wydaje się rozsądna, ale wymaga weryfikacji w praktyce, zwłaszcza w dni z dużą liczbą meczów w obu turniejach. Należy monitorować zużycie limitu zapytań.
- **Skalowalność Bazy Danych:** Założenie, że 500 MB w darmowym planie Supabase będzie wystarczające, jest obecnie akceptowalne. Warto jednak stworzyć mechanizm monitorowania przyrostu bazy danych, aby w porę zareagować na ryzyko przekroczenia limitu.
  </unresolved_issues>
  </conversation_summary>
  </project_details>

Wykonaj następujące kroki, aby stworzyć kompleksowy i dobrze zorganizowany dokument:

1. Podziel PRD na następujące sekcje:
   a. Przegląd projektu
   b. Problem użytkownika
   c. Wymagania funkcjonalne
   d. Granice projektu
   e. Historie użytkownika
   f. Metryki sukcesu

2. W każdej sekcji należy podać szczegółowe i istotne informacje w oparciu o opis projektu i odpowiedzi na pytania wyjaśniające. Upewnij się, że:
   - Używasz jasnego i zwięzłego języka
   - W razie potrzeby podajesz konkretne szczegóły i dane
   - Zachowujesz spójność w całym dokumencie
   - Odnosisz się do wszystkich punktów wymienionych w każdej sekcji

3. Podczas tworzenia historyjek użytkownika i kryteriów akceptacji
   - Wymień WSZYSTKIE niezbędne historyjki użytkownika, w tym scenariusze podstawowe, alternatywne i skrajne.
   - Przypisz unikalny identyfikator wymagań (np. US-001) do każdej historyjki użytkownika w celu bezpośredniej identyfikowalności.
   - Uwzględnij co najmniej jedną historię użytkownika specjalnie dla bezpiecznego dostępu lub uwierzytelniania, jeśli aplikacja wymaga identyfikacji użytkownika lub ograniczeń dostępu.
   - Upewnij się, że żadna potencjalna interakcja użytkownika nie została pominięta.
   - Upewnij się, że każda historia użytkownika jest testowalna.

Użyj następującej struktury dla każdej historii użytkownika:

- ID
- Tytuł
- Opis
- Kryteria akceptacji

4. Po ukończeniu PRD przejrzyj go pod kątem tej listy kontrolnej:
   - Czy każdą historię użytkownika można przetestować?
   - Czy kryteria akceptacji są jasne i konkretne?
   - Czy mamy wystarczająco dużo historyjek użytkownika, aby zbudować w pełni funkcjonalną aplikację?
   - Czy uwzględniliśmy wymagania dotyczące uwierzytelniania i autoryzacji (jeśli dotyczy)?

5. Formatowanie PRD:
   - Zachowaj spójne formatowanie i numerację.
   - Nie używaj pogrubionego formatowania w markdown ( \*\* ).
   - Wymień WSZYSTKIE historyjki użytkownika.
   - Sformatuj PRD w poprawnym markdown.

Przygotuj PRD z następującą strukturą:

```markdown
# Dokument wymagań produktu (PRD) - {{app-name}}

## 1. Przegląd produktu

## 2. Problem użytkownika

## 3. Wymagania funkcjonalne

## 4. Granice produktu

## 5. Historyjki użytkowników

## 6. Metryki sukcesu
```

Pamiętaj, aby wypełnić każdą sekcję szczegółowymi, istotnymi informacjami w oparciu o opis projektu i nasze pytania wyjaśniające. Upewnij się, że PRD jest wyczerpujący, jasny i zawiera wszystkie istotne informacje potrzebne do dalszej pracy nad produktem.

Ostateczny wynik powinien składać się wyłącznie z PRD zgodnego ze wskazanym formatem w markdown, który zapiszesz w pliku .ai/prd.md
