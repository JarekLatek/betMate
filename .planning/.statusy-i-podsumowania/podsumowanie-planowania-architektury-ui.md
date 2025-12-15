<conversation_summary>
<decisions> 1. **Nawigacja**: Zastosowanie dolnego paska nawigacyjnego (Bottom Navigation Bar) na urządzeniach mobilnych oraz górnego nagłówka na desktopach. Podział na główne sekcje: "Mecze" i "Ranking". 2. **Menu drugorzędne**: Dostęp do profilu, wylogowania, zasad gry oraz przełącznika trybu ciemnego umieszczony w menu pod ikoną awatara (w nagłówku). 3. **Wybór turnieju**: Globalny przełącznik w formie dropdownu pod ikoną pucharu w nagłówku. Wybór turnieju odzwierciedlony w parametrach URL (np. `?tournamentId=1`). 4. **Widok startowy**: Po zalogowaniu, jeśli użytkownik uczestniczy w turniejach, widzi pierwszy aktywny. Jeśli nie – widzi ekran "Empty State" z zachętą do dołączenia i listą dostępnych turniejów. 5. **Lista meczów**: Zastosowanie "Infinite Scroll" do ładowania danych. Przełącznik segmentowy (Segmented Control) nad listą do wyboru widoku: "Nadchodzące" / "Zakończone". 6. **Interakcja obstawiania**: System "toggle" dla przycisków 1/X/2. Blokada obstawiania na 5 minut przed meczem (wizualne wyszarzenie). Próba kliknięcia w zablokowany mecz wyświetla komunikat (Toast) wyjaśniający przyczynę. 7. **Karta zakończonego meczu**: Prezentacja wyniku końcowego. Wizualizacja trafienia: karta w kolorze + zadowolona emotikona. Wizualizacja pudła: szara karta + smutna emotikona. 8. **Ranking**: "Przyklejony" wiersz z wynikiem zalogowanego użytkownika na dole ekranu. Wiersze innych użytkowników są nieklikalne w MVP. 9. **Profil użytkownika**: Zawiera nazwę, e-mail (tylko dla właściciela), punkty z podziałem na turnieje oraz opcję zmiany hasła. Brak historii zakładów w tym widoku. 10. **Zasady gry**: Dostępne jako okno modalne wywoływane z menu drugorzędnego. 11. **Odświeżanie danych**: Strategia "Refetch on Window Focus" oraz "Pull to Refresh" na mobile. 12. **Tryb ciemny**: Aplikacja musi wspierać Dark Mode.
</decisions>
<matched_recommendations> 1. Zastosowanie Bottom Navigation Bar (Mobile) i Header (Desktop). 2. Globalny przełącznik turniejów w nagłówku powiązany z URL. 3. Interakcja "toggle" i Optimistic UI przy obstawianiu. 4. Wizualne blokowanie zakładów < 5 min + Toast informacyjny. 5. Infinite Scroll zamiast klasycznej paginacji. 6. Sticky row w rankingu dla zalogowanego użytkownika. 7. Modal dla zasad gry. 8. Segmented Control dla filtrowania meczów (Nadchodzące/Zakończone). 9. Wsparcie dla Dark Mode. 10. Strategia odświeżania danych (Refetch on focus / Pull to refresh).
</matched_recommendations>
<ui_architecture_planning_summary>

### Główne wymagania dotyczące architektury UI

Aplikacja zostanie zbudowana w oparciu o **Astro 5** (SSR) z **React 19** dla interaktywnych "wysp" (Islands Architecture). Stylowanie zapewni **Tailwind 4**, a komponenty UI będą pochodzić z biblioteki **Shadcn/ui**. Interfejs musi być w pełni responsywny (Mobile First) i obsługiwać tryb ciemny.

      ### Kluczowe widoki i przepływy użytkownika
      1.  **Layout Główny**:
          *   **Header**: Logo, Dropdown Turniejów, Awatar (Menu: Profil, Zasady, Dark Mode, Wyloguj).
          *   **Nawigacja**: Dolny pasek (Mobile) / Linki w nagłówku (Desktop) -> [Mecze, Ranking].
      2.  **Widok Meczów**:
          *   Domyślny widok po wejściu w turniej.
          *   Przełącznik: Nadchodzące (aktywne zakłady) / Zakończone (wyniki).
          *   Lista ładowana przez Infinite Scroll.
          *   Obsługa stanów pustych (brak meczów).
      3.  **Widok Rankingu**:
          *   Tabela z pozycjami użytkowników.
          *   Sticky footer z wynikiem zalogowanego gracza.
      4.  **Widok Profilu**:
          *   Informacje o koncie i punkty w turniejach.
          *   Formularz zmiany hasła.
      5.  **Zasady Gry**:
          *   Modal dostępny globalnie.

      ### Strategia integracji z API i zarządzania stanem
      *   **Zarządzanie stanem serwerowym (dane)**: Rekomendowane użycie **TanStack Query** (React Query) wewnątrz komponentów React do pobierania meczów i rankingu, obsługi cache'owania, infinite scroll i rewalidacji (focus/pull-to-refresh).
      *   **Zarządzanie stanem globalnym UI**: **Nano Stores** do współdzielenia stanu sesji użytkownika i preferencji między Astro a React.
      *   **Kontekst Turnieju**: Utrzymywany w URL (`?tournamentId=...`), co ułatwia nawigację i udostępnianie.
      *   **Obsługa błędów**: Globalny interceptor dla błędów 401 (przekierowanie do logowania). Błędy 403/409/400 wyświetlane jako powiadomienia Toast.

      ### Responsywność i Dostępność
      *   Dostosowanie nawigacji do urządzenia (Bottom Bar vs Header).
      *   Wsparcie dla trybu ciemnego.
      *   Jasne komunikaty błędów i stanów zablokowanych (np. blokada zakładów).

</ui_architecture_planning_summary>
<unresolved_issues> 1. **Logika "Uczestnictwa w turnieju"**: Należy doprecyzować w logice biznesowej/API, co dokładnie oznacza, że użytkownik "uczestniczy" w turnieju (czy wymaga to osobnej akcji "Dołącz", czy dzieje się automatycznie po postawieniu pierwszego zakładu), aby poprawnie zaimplementować logikę widoku startowego (Empty State vs Lista). 2. **Zasoby graficzne**: Potrzeba przygotowania lub wybrania z biblioteki ikon (np. Lucide React) odpowiednich emotikon "zadowolonych" i "smutnych" dla kart wyników.
</unresolved_issues>
</conversation_summary>
