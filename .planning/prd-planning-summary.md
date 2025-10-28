# Podsumowanie Planowania PRD

## 1. Główne Wymagania Funkcjonalne

- **Uwierzytelnianie:** Prosty system rejestracji (email, hasło, nick) i logowania oparty na Supabase Auth.
- **Pobieranie Danych:** Integracja z `api-football.com` do pobierania listy nadchodzących meczów i wyników dla Ligi Mistrzów UEFA i MŚ 2026.
- **Interfejs Obstawiania:** Umożliwienie zalogowanym użytkownikom typowania wyników (W/D/W) dla nadchodzących meczów. Interfejs powinien wyświetlać drużyny, ich loga (jeśli dostępne) oraz datę i godzinę meczu w strefie czasowej użytkownika. Możliwość obstawiania jest blokowana na 5 minut przed meczem.
- **Automatyczne Obliczanie Punktów:** Supabase Edge Function uruchamiana co 2 godziny będzie pobierać wyniki zakończonych meczów i przeliczać punkty (1 pkt za trafienie, 0 za błąd).
- **Ranking (Leaderboard):** Publiczna, oddzielna dla każdego turnieju tablica wyników, wyświetlająca pozycję, nazwę użytkownika i sumę punktów.
- **Nawigacja:** Możliwość przełączania się między widokami/rankingami dostępnych turniejów.
- **Strona Informacyjna:** Statyczna podstrona lub okno modalne wyjaśniające zasady punktacji.

## 2. Kluczowe Historie Użytkownika i Ścieżki Korzystania

- **Nowy Użytkownik:** Jako nowy użytkownik, chcę móc szybko założyć konto za pomocą e-maila i hasła, aby móc zacząć obstawiać mecze.
- **Zalogowany Użytkownik (Obstawianie):** Jako zalogowany użytkownik, chcę widzieć listę nadchodzących meczów w wybranym turnieju i móc łatwo postawić swój typ (wygrana gospodarzy, remis, wygrana gości) na każdy z nich. Chcę mieć też możliwość zmiany typu przed rozpoczęciem meczu.
- **Zalogowany Użytkownik (Ranking):** Jako zalogowany użytkownik, chcę po zakończeniu meczów móc sprawdzić swoją pozycję i liczbę punktów w publicznym rankingu, aby porównać się z innymi graczami.

## 3. Kryteria Sukcesu i Sposoby Ich Mierzenia

- **Płynność Procesu:** Użytkownik jest w stanie samodzielnie przejść cały proces: rejestracja -> wybór turnieju -> obstawienie meczu -> sprawdzenie swojej pozycji w rankingu.
- **Poprawność Punktacji:** System punktacji działa poprawnie dla 99% rozegranych i zaktualizowanych spotkań.
- **Kluczowe Wskaźniki (KPIs):**
  - Liczba zarejestrowanych użytkowników.
  - Stosunek użytkowników, którzy obstawili co najmniej jeden mecz, do wszystkich zarejestrowanych.
