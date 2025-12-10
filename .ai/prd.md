# Dokument wymagań produktu (PRD) - betMate

## 1. Przegląd produktu

betMate to aplikacja internetowa zaprojektowana w celu uproszczenia i uatrakcyjnienia procesu organizowania nieformalnych zakładów sportowych wśród znajomych. Wersja MVP (Minimum Viable Product) skupia się na dostarczeniu kluczowych funkcjonalności, które pozwolą użytkownikom na rejestrację, obstawianie wyników meczów w ramach wybranych turniejów (Liga Mistrzów UEFA, Mistrzostwa Świata 2026) oraz śledzenie swojej pozycji w publicznym rankingu. Celem jest zastąpienie manualnych i podatnych na błędy metod, takich jak arkusze kalkulacyjne czy komunikatory, zautomatyzowanym i angażującym systemem.

## 2. Problem użytkownika

Obecnie organizacja towarzyskich zakładów sportowych jest procesem nieefektywnym i czasochłonnym. Uczestnicy muszą ręcznie śledzić swoje typy, a organizatorzy poświęcają dużo czasu na zbieranie zakładów, weryfikację wyników i obliczanie punktacji. Używanie do tego celu arkuszy kalkulacyjnych lub grup na komunikatorach jest podatne na błędy, prowadzi do nieporozumień i ostatecznie psuje zabawę z rywalizacji. Brakuje dedykowanego, prostego narzędzia, które automatyzowałoby cały proces.

## 3. Wymagania funkcjonalne

- FR-001: System uwierzytelniania użytkowników (rejestracja, logowanie) oparty na Supabase Auth, wymagający podania adresu e-mail, hasła i unikalnej nazwy użytkownika.
- FR-002: Integracja z zewnętrznym API (`api-football.com`) w celu pobierania i wyświetlania listy nadchodzących meczów dla Ligi Mistrzów UEFA i MŚ 2026.
- FR-003: Interfejs umożliwiający zalogowanym użytkownikom obstawianie wyników meczów (wygrana gospodarzy, remis, wygrana gości).
- FR-004: Możliwość edycji postawionych typów do 5 minut przed oficjalnym rozpoczęciem meczu.
- FR-005: Automatyczna blokada możliwości obstawiania i edytowania typów na 5 minut przed rozpoczęciem spotkania.
- FR-006: Automatyczne obliczanie punktów (1 punkt za trafiony wynik W/D/W) za pomocą cyklicznej funkcji (Supabase Edge Function uruchamiana co 2 godziny), która pobiera wyniki zakończonych meczów.
- FR-007: Publiczna tablica wyników (Leaderboard) dla każdego turnieju, prezentująca ranking użytkowników na podstawie zdobytych punktów.
- FR-008: Możliwość przełączania się między widokami dostępnych turniejów i ich oddzielnymi rankingami.
- FR-009: Prosta strona informacyjna lub okno modalne wyjaśniające zasady gry i system punktacji.
- FR-010: Anulowanie zakładów na mecze, które zostały odwołane lub przełożone, bez przyznawania punktów.

## 4. Granice produktu

Następujące funkcjonalności nie wchodzą w zakres wersji MVP, aby zapewnić szybkie wdrożenie i skupić się na podstawowej wartości produktu:

- Tworzenie prywatnych grup i zapraszanie znajomych.
- Obsługa wielu lig lub turniejów jednocześnie poza wybranymi.
- Zaawansowane opcje zakładów (np. dokładny wynik, strzelcy bramek, liczba kartek).
- System powiadomień (e-mail, push) o wynikach, nadchodzących meczach czy zmianach w rankingu.
- Rozbudowane profile użytkowników z awatarami, statystykami czy systemem znajomych.
- Aktualizacje wyników i rankingu w czasie rzeczywistym (wystarczy okresowa aktualizacja co 2 godziny).

## 5. Historyjki użytkowników

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji, podając swój adres e-mail, hasło oraz unikalną nazwę użytkownika (nick), abym mógł zacząć obstawiać mecze.
- Kryteria akceptacji:
  - Formularz rejestracji zawiera pola: e-mail, hasło, nazwa użytkownika.
  - System weryfikuje, czy podany adres e-mail i nazwa użytkownika nie są już zajęte.
  - Hasło musi spełniać podstawowe wymogi bezpieczeństwa (np. minimalna długość).
  - Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowany do głównego widoku aplikacji.

- ID: US-002
- Tytuł: Logowanie do systemu
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto za pomocą adresu e-mail i hasła, aby uzyskać dostęp do swoich typów i możliwości obstawiania.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola: e-mail, hasło.
  - System weryfikuje poprawność podanych danych.
  - W przypadku błędnych danych wyświetlany jest odpowiedni komunikat.
  - Po pomyślnym zalogowaniu użytkownik jest przekierowany do głównego widoku aplikacji.

- ID: US-003
- Tytuł: Przeglądanie listy nadchodzących meczów
- Opis: Jako zalogowany użytkownik, chcę widzieć listę nadchodzących meczów w ramach wybranego turnieju, aby móc zdecydować, które z nich chcę obstawić.
- Kryteria akceptacji:
  - System wyświetla listę meczów pobraną z `api-football.com`.
  - Każdy element listy zawiera nazwy drużyn (i ich loga, jeśli dostępne), datę i godzinę rozpoczęcia meczu.
  - Godzina meczu jest wyświetlana w lokalnej strefie czasowej użytkownika.
  - Mecze, które już się rozpoczęły lub zakończyły, nie są widoczne na liście do obstawiania.

- ID: US-004
- Tytuł: Obstawianie wyniku meczu
- Opis: Jako zalogowany użytkownik, chcę móc łatwo obstawić wynik (wygrana gospodarzy, remis, wygrana gości) dla wybranego meczu z listy.
- Kryteria akceptacji:
  - Przy każdym meczu na liście znajdują się trzy klikalne opcje: "1" (wygrana gospodarzy), "X" (remis), "2" (wygrana gości).
  - Po wybraniu typu, system zapisuje go i wizualnie zaznacza wybór użytkownika.
  - Użytkownik może postawić typ na dowolną liczbę dostępnych meczów.
  - System uniemożliwia obstawienie meczu, do którego rozpoczęcia pozostało mniej niż 5 minut.

- ID: US-005
- Tytuł: Edycja postawionego typu
- Opis: Jako zalogowany użytkownik, chcę mieć możliwość zmiany mojego typu przed rozpoczęciem meczu, jeśli zmienię zdanie.
- Kryteria akceptacji:
  - Użytkownik może zmienić swój wybór (1, X, 2) dla danego meczu w dowolnym momencie.
  - Zmiana typu jest możliwa do 5 minut przed oficjalnym rozpoczęciem meczu.
  - Po upływie tego czasu opcja edycji jest blokowana.

- ID: US-006
- Tytuł: Przeglądanie publicznego rankingu
- Opis: Jako użytkownik (tylko zalogowany), chcę móc zobaczyć publiczną tabelę wyników (Leaderboard), aby sprawdzić swoją pozycję lub porównać wyniki wszystkich graczy.
- Kryteria akceptacji:
  - Ranking jest publicznie dostępny (dla zalogowanych użykowników).
  - Tabela zawiera kolumny: Pozycja, Nazwa użytkownika, Punkty.
  - Użytkownicy są posortowani malejąco według liczby zdobytych punktów.
  - W przypadku równej liczby punktów, użytkownicy zajmują tę samą pozycję w rankingu (np. dwóch graczy na 3. miejscu).

- ID: US-007
- Tytuł: Przełączanie się między turniejami
- Opis: Jako użytkownik, chcę móc łatwo przełączać się między dostępnymi turniejami (Liga Mistrzów, MŚ 2026), aby zobaczyć listę meczów i oddzielny ranking dla każdego z nich.
- Kryteria akceptacji:
  - W interfejsie znajduje się wyraźny przełącznik (np. zakładki, menu rozwijane) do wyboru turnieju.
  - Po wybraniu turnieju, zarówno lista meczów do obstawienia, jak i ranking, są aktualizowane i pokazują dane tylko dla tego turnieju.

- ID: US-008
- Tytuł: Automatyczne obliczanie punktów i aktualizacja rankingu
- Opis: Jako system, chcę automatycznie i okresowo obliczać punkty dla użytkowników na podstawie zakończonych meczów i zaktualizować ranking.
- Kryteria akceptacji:
  - Funkcja uruchamiana co 2 godziny pobiera wyniki zakończonych meczów z API.
  - Dla każdego zakończonego meczu system porównuje zapisane typy użytkowników z faktycznym wynikiem.
  - Użytkownik otrzymuje 1 punkt za prawidłowe wytypowanie wyniku (W/D/W) i 0 punktów za błędny typ.
  - Punkty są sumowane i ranking jest aktualizowany.
  - Mecze bez oficjalnego wyniku (np. oczekujące na aktualizację w API) są ignorowane w danym cyklu.

- ID: US-009
- Tytuł: Dostęp do zasad gry
- Opis: Jako użytkownik, chcę mieć łatwy dostęp do jasnych i zwięzłych zasad gry oraz systemu punktacji, abym wiedział, jak zdobywać punkty.
- Kryteria akceptacji:
  - W aplikacji znajduje się link lub przycisk prowadzący do strony/okna modalnego z zasadami.
  - Treść wyjaśnia system punktacji (1 pkt za W/D/W), zasady blokowania typów oraz obsługę meczów odwołanych.

- ID: US-010
- Tytuł: Obsługa meczów odwołanych lub przełożonych
- Opis: Jako system, chcę poprawnie obsługiwać mecze, które zostały odwołane lub przełożone, aby nie wpływały one na punktację.
- Kryteria akceptacji:
  - Jeśli mecz zostanie oznaczony w API jako odwołany lub przełożony, wszystkie postawione na niego zakłady są anulowane.
  - Za anulowane zakłady nie są przyznawane ani odejmowane żadne punkty.
  - Taki mecz nie jest brany pod uwagę przy obliczaniu statystyk trafień.

- ID: US-011
- Tytuł: Przeglądanie historii własnych zakładów
- Opis: Jako zalogowany użytkownik, chcę mieć dostęp do pełnej historii moich typów wraz ze statystykami skuteczności, aby móc analizować swoje wyniki i śledzić postępy.
- Kryteria akceptacji:
  - Użytkownik może przejść do widoku "Moje Typy" z głównej nawigacji.
  - Widok wyświetla listę wszystkich zakładów użytkownika z informacjami o meczu (drużyny, data, wynik).
  - Każdy zakład ma oznaczony status: oczekujący (mecz nie rozegrany), trafiony (zielony), pudło (szary/czerwony).
  - Użytkownik może filtrować zakłady po turnieju oraz statusie (wszystkie/oczekujące/rozstrzygnięte).
  - Widok zawiera podsumowanie statystyk: liczba trafień, liczba pudel, procent skuteczności.
  - Użytkownik może usunąć zakład tylko dla meczów, które jeszcze się nie rozpoczęły (więcej niż 5 minut do rozpoczęcia).

## 6. Metryki sukcesu

Kluczowe wskaźniki (KPIs) oraz kryteria, które pozwolą ocenić powodzenie produktu w wersji MVP:

- Płynność procesu: Użytkownik jest w stanie samodzielnie i bezproblemowo przejść całą ścieżkę: rejestracja -> wybór turnieju -> obstawienie meczu -> sprawdzenie swojej pozycji w rankingu.
- Poprawność punktacji: System punktacji działa poprawnie i nalicza punkty zgodnie z zasadami dla co najmniej 99% rozegranych i zaktualizowanych spotkań.
- Liczba zarejestrowanych użytkowników: Śledzenie wzrostu bazy użytkowników w czasie.
- Wskaźnik zaangażowania: Stosunek liczby użytkowników, którzy obstawili co najmniej jeden mecz, do całkowitej liczby zarejestrowanych użytkowników. Wysoki wskaźnik będzie świadczył o tym, że aplikacja jest intuicyjna i zachęca do interakcji.
