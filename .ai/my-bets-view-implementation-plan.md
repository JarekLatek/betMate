# Plan implementacji widoku Moje Zakłady

## 1. Przegląd

Widok "Moje Zakłady" (`/my-bets`) umożliwia zalogowanym użytkownikom przeglądanie pełnej historii swoich typów wraz ze statystykami skuteczności. Widok prezentuje listę wszystkich zakładów użytkownika z oznaczeniem statusu (oczekujący, trafiony, pudło), pozwala na filtrowanie po turnieju i statusie zakładu, wyświetla podsumowanie statystyk (trafienia, pudła, % skuteczności) oraz umożliwia usunięcie zakładu dla meczów, które jeszcze się nie rozpoczęły.

## 2. Routing widoku

- **Ścieżka**: `/my-bets`
- **Query Parameters**:
  - `tournamentId` (opcjonalny): ID turnieju do filtrowania zakładów
  - `status` (opcjonalny): Status zakładu (`all` | `pending` | `resolved`)
- **Przykłady URL**:
  - `/my-bets` - wszystkie zakłady
  - `/my-bets?tournamentId=1` - zakłady dla turnieju o ID 1
  - `/my-bets?status=pending` - tylko oczekujące zakłady
  - `/my-bets?tournamentId=1&status=resolved` - rozstrzygnięte zakłady dla turnieju 1
- **Ochrona**: Widok dostępny tylko dla zalogowanych użytkowników (middleware redirect do `/login`)

## 3. Struktura komponentów

```
MyBetsPage (Astro)
└── MyBetsView (React, client:load)
    ├── BetStats
    │   └── StatCard (x3: trafienia, pudła, skuteczność)
    ├── BetFilters
    │   ├── TournamentSelector (reużyty z src/components/matches/)
    │   └── StatusSelect
    ├── BetList
    │   ├── BetCard (x n)
    │   │   ├── MatchInfo
    │   │   ├── BetOutcome
    │   │   └── DeleteBetButton (conditional)
    │   ├── EmptyState (conditional)
    │   └── LoadMoreButton (conditional)
    └── LoadingState (conditional)
```

## 4. Szczegóły komponentów

### MyBetsPage (Astro)

- **Opis**: Strona Astro będąca kontenerem dla widoku React. Odpowiada za sprawdzenie autoryzacji na poziomie serwera i wstępne pobranie danych (SSR).
- **Główne elementy**: `<Layout>`, `<MyBetsView client:load />`
- **Obsługiwane interakcje**: Brak (delegowane do komponentu React)
- **Obsługiwana walidacja**: Sprawdzenie czy użytkownik jest zalogowany (redirect do `/login` jeśli nie)
- **Typy**: Brak (przekazuje dane do React)
- **Propsy**: Brak

### MyBetsView

- **Opis**: Główny komponent React zarządzający stanem widoku i orkiestrujący komunikację między komponentami dziećmi. Odpowiada za pobieranie danych, zarządzanie filtrami i ładowanie kolejnych stron (Load More).
- **Główne elementy**:
  - `<div className="container">` - główny kontener
  - `<BetStats />` - sekcja statystyk
  - `<BetFilters />` - sekcja filtrów
  - `<BetList />` - lista zakładów z EmptyState i LoadMoreButton
- **Obsługiwane interakcje**:
  - Zmiana filtrów (turniej, status)
  - Ładowanie kolejnych zakładów (Load More)
  - Usunięcie zakładu (propagowane z BetCard)
- **Obsługiwana walidacja**: Brak (delegowana do komponentów dzieci i API)
- **Typy**: `MyBetsViewModel`, `BetFilterState`
- **Propsy**:
  - `initialTournamentId?: number | null` - początkowy filtr turnieju z URL (null = wszystkie)
  - `initialStatus?: BetStatusFilter` - początkowy filtr statusu z URL

### BetStats

- **Opis**: Komponent wyświetlający podsumowanie statystyk skuteczności użytkownika. Pokazuje trzy karty: liczbę trafień, liczbę pudełek i procent skuteczności.
- **Główne elementy**:
  - `<div className="grid grid-cols-3">` - siatka 3 kolumnowa
  - `<StatCard />` x 3 - karty statystyk
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `BetStatsData`
- **Propsy**:
  - `stats: BetStatsData` - obiekt ze statystykami
  - `isLoading?: boolean` - stan ładowania (dla skeleton)

### StatCard

- **Opis**: Pojedyncza karta statystyki z wartością liczbową i etykietą.
- **Główne elementy**:
  - `<Card>` (Shadcn/ui)
  - `<CardContent>` z wartością i etykietą
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak (proste propsy)
- **Propsy**:
  - `label: string` - etykieta statystyki
  - `value: number | string` - wartość do wyświetlenia
  - `variant?: 'success' | 'error' | 'neutral'` - wariant kolorystyczny
  - `isLoading?: boolean` - stan ładowania

### BetFilters

- **Opis**: Komponent z kontrolkami filtrowania zakładów. Zawiera dropdown do wyboru turnieju i statusu zakładu.
- **Główne elementy**:
  - `<div className="flex gap-4">` - kontener flex
  - `<TournamentSelector />` - istniejący komponent z `src/components/matches/`
  - `<StatusSelect />` - select statusu
- **Obsługiwane interakcje**:
  - `onTournamentChange(tournamentId: number | null)` - zmiana turnieju
  - `onStatusChange(status: BetStatusFilter)` - zmiana statusu
- **Obsługiwana walidacja**: Brak (wartości z predefiniowanych list)
- **Typy**: `BetFilterState`, `TournamentDTO[]`
- **Propsy**:
  - `tournaments: TournamentDTO[]` - lista turniejów do wyboru
  - `currentFilters: BetFilterState` - aktualne wartości filtrów
  - `onFiltersChange: (filters: BetFilterState) => void` - callback zmiany filtrów
  - `isLoading?: boolean` - stan ładowania

### TournamentSelector (istniejący komponent)

- **Lokalizacja**: `src/components/matches/TournamentSelector.tsx`
- **Opis**: Istniejący dropdown do wyboru turnieju. Komponent jest już zaimplementowany i będzie reużyty bez modyfikacji.
- **Istniejące propsy**:
  - `tournaments: TournamentDTO[]` - lista turniejów
  - `selectedId: number | null` - wybrany turniej
  - `onSelect: (id: number) => void` - callback wyboru
  - `disabled?: boolean`
- **Uwaga**: Komponent nie obsługuje opcji "Wszystkie turnieje" (wartość `null` oznacza brak wyboru). Jeśli potrzebna opcja "Wszystkie", należy rozszerzyć komponent o dodatkowy `SelectItem`.

### StatusSelect

- **Opis**: Dropdown do wyboru statusu zakładu (wszystkie/oczekujące/rozstrzygnięte).
- **Główne elementy**:
  - `<Select>` (Shadcn/ui)
  - `<SelectTrigger>`
  - `<SelectContent>` z 3 opcjami
- **Obsługiwane interakcje**:
  - `onChange(value: BetStatusFilter)` - wybór statusu
- **Obsługiwana walidacja**: Wartość musi być jedną z: `'all'`, `'pending'`, `'resolved'`
- **Typy**: `BetStatusFilter`
- **Propsy**:
  - `value: BetStatusFilter` - wybrany status
  - `onChange: (status: BetStatusFilter) => void` - callback
  - `disabled?: boolean`

### BetList

- **Opis**: Kontener na listę zakładów użytkownika. Wyświetla karty zakładów, stan pusty jeśli brak wyników, oraz przycisk "Załaduj więcej".
- **Główne elementy**:
  - `<div className="space-y-4">` - kontener z odstępami
  - `<BetCard />` x n lub `<EmptyState />`
  - `<LoadMoreButton />` - przycisk ładowania kolejnych (gdy `hasMore`)
- **Obsługiwane interakcje**:
  - Propagacja `onDeleteBet` z BetCard do rodzica
  - Propagacja `onLoadMore` z LoadMoreButton do rodzica
- **Obsługiwana walidacja**: Brak
- **Typy**: `BetWithDisplayStatus[]`
- **Propsy**:
  - `bets: BetWithDisplayStatus[]` - lista zakładów do wyświetlenia
  - `onDeleteBet: (betId: number) => void` - callback usunięcia zakładu
  - `onLoadMore: () => void` - callback ładowania kolejnych
  - `isLoading?: boolean` - stan ładowania początkowego
  - `isLoadingMore?: boolean` - stan ładowania kolejnych
  - `hasMore: boolean` - czy są kolejne strony
  - `deletingBetId?: number | null` - ID zakładu w trakcie usuwania

### BetCard

- **Opis**: Pojedyncza karta zakładu z informacjami o meczu, wytypowanym wyniku i statusie zakładu. Zawiera opcjonalny przycisk usunięcia dla meczów, które jeszcze się nie rozpoczęły.
- **Główne elementy**:
  - `<Card>` (Shadcn/ui) z dynamicznym border-color w zależności od statusu
  - `<MatchInfo />` - informacje o meczu (drużyny, data, wynik)
  - `<BetOutcome />` - wytypowany wynik z oznaczeniem trafienia/pudła
  - `<DeleteBetButton />` - przycisk usunięcia (warunkowo, gdy `canDelete === true`)
  - `<Link>` - link do widoku meczu
- **Obsługiwane interakcje**:
  - `onClick` na link do meczu - nawigacja do `/matches/:id`
  - `onDelete` - usunięcie zakładu
- **Obsługiwana walidacja**:
  - Przycisk usunięcia widoczny tylko gdy: `bet.canDelete === true` (obliczone w hooku)
- **Typy**: `BetWithDisplayStatus`
- **Propsy**:
  - `bet: BetWithDisplayStatus` - dane zakładu z meczem i obliczonym statusem
  - `onDelete: (betId: number) => void` - callback usunięcia
  - `isDeleting?: boolean` - czy zakład jest w trakcie usuwania

### MatchInfo

- **Opis**: Sekcja karty zakładu wyświetlająca informacje o meczu.
- **Główne elementy**:
  - `<div>` z nazwami drużyn (Home vs Away)
  - `<span>` z datą i godziną meczu
  - `<span>` z wynikiem (jeśli mecz rozegrany)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `MatchSummaryDTO`
- **Propsy**:
  - `match: MatchSummaryDTO` - dane meczu

### BetOutcome

- **Opis**: Sekcja karty zakładu wyświetlająca wytypowany wynik i status trafienia.
- **Główne elementy**:
  - `<Badge>` (Shadcn/ui) z wytypowanym wynikiem (1/X/2)
  - `<span>` ze statusem (oczekujący/trafiony/pudło)
  - Ikona statusu (clock/check/x)
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `MatchOutcome`, `BetDisplayStatus`
- **Propsy**:
  - `pickedResult: MatchOutcome` - wytypowany wynik
  - `status: BetDisplayStatus` - status zakładu (pending/hit/miss)

### DeleteBetButton

- **Opis**: Przycisk do usunięcia zakładu. Wyświetla dialog potwierdzenia przed usunięciem.
- **Główne elementy**:
  - `<Button variant="ghost" size="sm">` (Shadcn/ui)
  - `<AlertDialog>` (Shadcn/ui) dla potwierdzenia
  - Ikona Trash2 (lucide-react)
- **Obsługiwane interakcje**:
  - `onClick` - otwarcie dialogu potwierdzenia
  - `onConfirm` - wywołanie usunięcia
  - `onCancel` - zamknięcie dialogu
- **Obsługiwana walidacja**: Brak (walidacja widoczności w rodzicu)
- **Typy**: Brak
- **Propsy**:
  - `onDelete: () => void` - callback usunięcia
  - `isDeleting?: boolean` - stan ładowania
  - `disabled?: boolean`

### EmptyState

- **Opis**: Komponent wyświetlany gdy lista zakładów jest pusta.
- **Główne elementy**:
  - `<div>` z ikoną i komunikatem
  - `<Button>` link do strony z meczami
- **Obsługiwane interakcje**:
  - Kliknięcie w przycisk - nawigacja do `/matches`
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  - `hasFilters: boolean` - czy są aktywne filtry (zmienia komunikat)

### LoadMoreButton

- **Opis**: Przycisk do ładowania kolejnych zakładów (infinite scroll pattern). Spójny z wzorcem używanym w `MatchesView`.
- **Główne elementy**:
  - `<Button variant="outline">` (Shadcn/ui)
  - Ikona ładowania (Loader2) gdy `isLoading`
- **Obsługiwane interakcje**:
  - `onClick` - załadowanie następnej strony zakładów
- **Obsługiwana walidacja**:
  - Przycisk widoczny tylko gdy `has_more === true`
  - Przycisk disabled gdy `isLoading === true`
- **Typy**: Brak
- **Propsy**:
  - `onLoadMore: () => void` - callback ładowania kolejnych
  - `isLoading?: boolean` - stan ładowania
  - `hasMore: boolean` - czy są kolejne strony

## 5. Typy

### DTO (Data Transfer Objects) - istniejące w `src/types.ts`

```typescript
// Zakład z informacją o meczu (z API)
type BetWithMatchDTO = BetEntity & {
  match: MatchSummaryDTO;
};

// Podsumowanie meczu (osadzone w zakładzie)
type MatchSummaryDTO = Pick<
  MatchEntity,
  "id" | "tournament_id" | "home_team" | "away_team" | "match_datetime" | "status" | "result" | "home_score" | "away_score"
>;

// Paginacja (z API)
interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Odpowiedź paginowana (z API)
interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}

// Parametry zapytania (do API)
interface BetsQueryParams {
  tournament_id?: number;
  match_id?: number;
  limit?: number;
  offset?: number;
}

// Turniej (do filtrów)
type TournamentDTO = Tables<"tournaments">;
```

### ViewModel (nowe typy dla widoku)

```typescript
// Status zakładu do wyświetlenia
type BetDisplayStatus = "pending" | "hit" | "miss";

// Filtr statusu zakładu
type BetStatusFilter = "all" | "pending" | "resolved";

// Stan filtrów
interface BetFilterState {
  tournamentId: number | null; // null = wszystkie turnieje (spójne z TournamentSelector)
  status: BetStatusFilter;
}

// Statystyki zakładów
interface BetStatsData {
  totalBets: number;
  hits: number;
  misses: number;
  pending: number;
  hitRate: number; // 0-100 procent
}

// Stan widoku
interface MyBetsViewModel {
  bets: BetWithMatchDTO[];
  stats: BetStatsData;
  filters: BetFilterState;
  isLoading: boolean;
  isLoadingMore: boolean; // dla Load More
  error: string | null;
  hasMore: boolean;
  deletingBetId: number | null;
}

// Rozszerzony BetWithMatchDTO z obliczonym statusem
interface BetWithDisplayStatus extends BetWithMatchDTO {
  displayStatus: BetDisplayStatus;
  canDelete: boolean;
}
```

### Funkcje pomocnicze dla typów

**Uwaga**: Funkcje `getResultLabel()` i `getResultDescription()` istnieją już w `src/components/matches/MatchResult.tsx`. Należy je wyekstrahować do współdzielonego modułu `src/lib/utils/bet-utils.ts` i reużyć w obu komponentach.

```typescript
// ============================================================================
// Funkcje do ekstrakcji z MatchResult.tsx -> src/lib/utils/bet-utils.ts
// ============================================================================

// Mapowanie wyniku na etykietę (1/X/2)
function getResultLabel(result: MatchOutcome): string {
  switch (result) {
    case "HOME_WIN":
      return "1";
    case "DRAW":
      return "X";
    case "AWAY_WIN":
      return "2";
  }
}

// Mapowanie wyniku na opis
function getResultDescription(result: MatchOutcome): string {
  switch (result) {
    case "HOME_WIN":
      return "Wygrana gospodarzy";
    case "DRAW":
      return "Remis";
    case "AWAY_WIN":
      return "Wygrana gości";
  }
}

// ============================================================================
// Nowe funkcje dla widoku Moje Zakłady
// ============================================================================

// Obliczanie statusu zakładu do wyświetlenia
function getBetDisplayStatus(bet: BetWithMatchDTO): BetDisplayStatus {
  const match = bet.match;

  // Mecz nierozegrany - oczekujący
  if (match.status === "SCHEDULED") {
    return "pending";
  }

  // Mecz rozegrany - sprawdź trafienie
  if (match.result === null) {
    return "pending"; // Brak wyniku mimo innego statusu
  }

  return bet.picked_result === match.result ? "hit" : "miss";
}

// Sprawdzanie czy można usunąć zakład
function canDeleteBet(bet: BetWithMatchDTO): boolean {
  const match = bet.match;

  if (match.status !== "SCHEDULED") {
    return false;
  }

  const matchDatetime = new Date(match.match_datetime);
  const now = new Date();
  const fiveMinutesInMs = 5 * 60 * 1000;

  return matchDatetime.getTime() - now.getTime() > fiveMinutesInMs;
}

// Obliczanie statystyk z listy zakładów
function calculateBetStats(bets: BetWithMatchDTO[]): BetStatsData {
  const stats: BetStatsData = {
    totalBets: bets.length,
    hits: 0,
    misses: 0,
    pending: 0,
    hitRate: 0,
  };

  for (const bet of bets) {
    const status = getBetDisplayStatus(bet);
    if (status === "hit") stats.hits++;
    else if (status === "miss") stats.misses++;
    else stats.pending++;
  }

  const resolved = stats.hits + stats.misses;
  stats.hitRate = resolved > 0 ? Math.round((stats.hits / resolved) * 100) : 0;

  return stats;
}
```

## 6. Zarządzanie stanem

### Custom Hook: `useMyBets`

Hook wzorowany na istniejącym `useMatches` z `src/components/hooks/useMatches.ts`. Używa wzorca "Load More" (infinite scroll) zamiast klasycznej paginacji.

```typescript
interface UseMyBetsOptions {
  initialTournamentId?: number | null;
  initialStatus?: BetStatusFilter;
  limit?: number; // domyślnie 20
}

interface UseMyBetsReturn {
  // Stan
  bets: BetWithDisplayStatus[];
  stats: BetStatsData;
  filters: BetFilterState;
  isLoading: boolean;        // pierwsze ładowanie
  isLoadingMore: boolean;    // ładowanie kolejnych (Load More)
  error: string | null;
  hasMore: boolean;
  deletingBetId: number | null;

  // Akcje
  setFilters: (filters: Partial<BetFilterState>) => void;
  loadMore: () => Promise<void>;
  deleteBet: (betId: number) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Implementacja hooka

```typescript
function useMyBets(options: UseMyBetsOptions = {}): UseMyBetsReturn {
  const limit = options.limit ?? 20;

  const [bets, setBets] = useState<BetWithMatchDTO[]>([]);
  const [filters, setFiltersState] = useState<BetFilterState>({
    tournamentId: options.initialTournamentId ?? null,
    status: options.initialStatus ?? "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deletingBetId, setDeletingBetId] = useState<number | null>(null);

  // Pobieranie danych (początkowe lub po zmianie filtrów)
  const fetchBets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.tournamentId !== null) {
        params.set("tournament_id", filters.tournamentId.toString());
      }
      params.set("limit", limit.toString());
      params.set("offset", "0");

      const response = await fetch(`/api/me/bets?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bets");
      }

      const data: PaginatedResponseDTO<BetWithMatchDTO> = await response.json();
      setBets(data.data);
      setHasMore(data.pagination.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [filters.tournamentId, limit]);

  // Ładowanie kolejnych (Load More)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.tournamentId !== null) {
        params.set("tournament_id", filters.tournamentId.toString());
      }
      params.set("limit", limit.toString());
      params.set("offset", bets.length.toString());

      const response = await fetch(`/api/me/bets?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch more bets");
      }

      const data: PaginatedResponseDTO<BetWithMatchDTO> = await response.json();
      setBets((prev) => [...prev, ...data.data]);
      setHasMore(data.pagination.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters.tournamentId, limit, bets.length, isLoadingMore, hasMore]);

  // Efekt pobierania danych przy zmianie filtrów
  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Filtrowanie po statusie (client-side)
  const filteredBets = useMemo(() => {
    if (filters.status === "all") return bets;

    return bets.filter((bet) => {
      const status = getBetDisplayStatus(bet);
      if (filters.status === "pending") return status === "pending";
      if (filters.status === "resolved") return status === "hit" || status === "miss";
      return true;
    });
  }, [bets, filters.status]);

  // Rozszerzenie zakładów o displayStatus i canDelete
  const betsWithStatus: BetWithDisplayStatus[] = useMemo(() => {
    return filteredBets.map((bet) => ({
      ...bet,
      displayStatus: getBetDisplayStatus(bet),
      canDelete: canDeleteBet(bet),
    }));
  }, [filteredBets]);

  // Obliczanie statystyk (z wszystkich zakładów, nie tylko przefiltrowanych)
  const stats = useMemo(() => calculateBetStats(bets), [bets]);

  // Akcje
  const setFilters = useCallback((newFilters: Partial<BetFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    // Reset listy przy zmianie filtrów - fetchBets() zostanie wywołane przez useEffect
  }, []);

  const deleteBet = useCallback(async (betId: number) => {
    setDeletingBetId(betId);

    try {
      const response = await fetch(`/api/bets/${betId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete bet");
      }

      // Usuń zakład z lokalnego stanu (optymistyczna aktualizacja)
      setBets((prev) => prev.filter((bet) => bet.id !== betId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // W przypadku błędu odśwież listę
      await fetchBets();
    } finally {
      setDeletingBetId(null);
    }
  }, [fetchBets]);

  return {
    bets: betsWithStatus,
    stats,
    filters,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    deletingBetId,
    setFilters,
    loadMore,
    deleteBet,
    refresh: fetchBets,
  };
}
```

### Aktualizacja URL

Widok powinien synchronizować stan filtrów z URL za pomocą `URLSearchParams`:

```typescript
// W komponencie MyBetsView
useEffect(() => {
  const params = new URLSearchParams();
  if (filters.tournamentId) {
    params.set("tournamentId", filters.tournamentId.toString());
  }
  if (filters.status !== "all") {
    params.set("status", filters.status);
  }

  const newUrl = params.toString()
    ? `${window.location.pathname}?${params}`
    : window.location.pathname;

  window.history.replaceState(null, "", newUrl);
}, [filters]);
```

## 7. Integracja API

### Endpointy wykorzystywane w widoku

| Endpoint | Metoda | Opis | Typ żądania | Typ odpowiedzi |
|----------|--------|------|-------------|----------------|
| `/api/me/bets` | GET | Pobieranie zakładów użytkownika | `BetsQueryParams` | `PaginatedResponseDTO<BetWithMatchDTO>` |
| `/api/bets/:id` | DELETE | Usunięcie zakładu | - | `MessageResponse` |
| `/api/tournaments` | GET | Pobieranie listy turniejów (dla filtrów) | - | `TournamentDTO[]` |

### Przykładowe zapytania

```typescript
// Pobieranie zakładów
const fetchBets = async (params: BetsQueryParams): Promise<PaginatedResponseDTO<BetWithMatchDTO>> => {
  const searchParams = new URLSearchParams();

  if (params.tournament_id) {
    searchParams.set("tournament_id", params.tournament_id.toString());
  }
  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }
  if (params.offset) {
    searchParams.set("offset", params.offset.toString());
  }

  const response = await fetch(`/api/me/bets?${searchParams}`);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    throw new Error("Failed to fetch bets");
  }

  return response.json();
};

// Usuwanie zakładu
const deleteBet = async (betId: number): Promise<void> => {
  const response = await fetch(`/api/bets/${betId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json();

    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    if (response.status === 403) {
      throw new Error(data.reason || "Cannot delete this bet");
    }
    if (response.status === 404) {
      throw new Error("Bet not found");
    }

    throw new Error(data.error || "Failed to delete bet");
  }
};

// Pobieranie turniejów
const fetchTournaments = async (): Promise<TournamentDTO[]> => {
  const response = await fetch("/api/tournaments");

  if (!response.ok) {
    throw new Error("Failed to fetch tournaments");
  }

  const data = await response.json();
  return data.data || data;
};
```

## 8. Interakcje użytkownika

| Interakcja | Komponent | Akcja | Efekt |
|------------|-----------|-------|-------|
| Zmiana filtra turnieju | BetFilters > TournamentSelector | `setFilters({ tournamentId })` | Ponowne pobranie zakładów, reset listy, aktualizacja URL |
| Zmiana filtra statusu | BetFilters > StatusSelect | `setFilters({ status })` | Filtrowanie client-side, aktualizacja URL |
| Kliknięcie "Załaduj więcej" | LoadMoreButton | `loadMore()` | Dołączenie kolejnych zakładów do listy |
| Kliknięcie przycisku usunięcia | BetCard > DeleteBetButton | Otwarcie AlertDialog | Wyświetlenie dialogu potwierdzenia |
| Potwierdzenie usunięcia | AlertDialog | `deleteBet(betId)` | Usunięcie zakładu z listy (optymistycznie) |
| Anulowanie usunięcia | AlertDialog | Zamknięcie dialogu | Brak zmian |
| Kliknięcie w kartę meczu | BetCard | Nawigacja | Przekierowanie do `/matches/:matchId` |

### Przepływ usuwania zakładu

```
1. Użytkownik klika przycisk "Usuń" na karcie zakładu
   ↓
2. Wyświetlenie AlertDialog z potwierdzeniem
   ↓
3. Użytkownik klika "Potwierdź"
   ↓
4. Ustawienie deletingBetId (disabled button, loading state)
   ↓
5. Wywołanie DELETE /api/bets/:id
   ↓
6. Sukces: Odświeżenie listy zakładów
   Błąd: Wyświetlenie komunikatu błędu (toast)
   ↓
7. Reset deletingBetId
```

## 9. Warunki i walidacja

### Warunki biznesowe weryfikowane na froncie

| Warunek | Komponent | Implementacja | Efekt UI |
|---------|-----------|---------------|----------|
| Możliwość usunięcia zakładu | BetCard | `match.status === 'SCHEDULED' && match_datetime > now + 5min` | Przycisk usunięcia widoczny/ukryty |
| Status zakładu | BetCard | Porównanie `picked_result` z `match.result` | Kolorowe obramowanie karty |
| Widoczność "Załaduj więcej" | LoadMoreButton | `hasMore === true && !isLoading` | Przycisk widoczny/ukryty |
| Dostępność "Załaduj więcej" | LoadMoreButton | `!isLoadingMore` | Przycisk enabled/disabled |

### Funkcja walidacji możliwości usunięcia

```typescript
function canDeleteBet(bet: BetWithMatchDTO): boolean {
  const match = bet.match;

  // Warunek 1: Mecz musi mieć status SCHEDULED
  if (match.status !== "SCHEDULED") {
    return false;
  }

  // Warunek 2: Do rozpoczęcia meczu musi być więcej niż 5 minut
  const matchDatetime = new Date(match.match_datetime);
  const now = new Date();
  const fiveMinutesInMs = 5 * 60 * 1000;
  const timeUntilMatch = matchDatetime.getTime() - now.getTime();

  return timeUntilMatch > fiveMinutesInMs;
}
```

### Funkcja określania statusu zakładu

```typescript
function getBetDisplayStatus(bet: BetWithMatchDTO): BetDisplayStatus {
  const match = bet.match;

  // Mecz nierozegrany = oczekujący
  if (match.status === "SCHEDULED" || match.result === null) {
    return "pending";
  }

  // Porównanie wyniku
  return bet.picked_result === match.result ? "hit" : "miss";
}
```

### Mapowanie statusu na styl UI

```typescript
const statusStyles: Record<BetDisplayStatus, { border: string; badge: string; icon: ReactNode }> = {
  pending: {
    border: "border-muted",
    badge: "bg-muted text-muted-foreground",
    icon: <Clock className="h-4 w-4" />,
  },
  hit: {
    border: "border-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
  miss: {
    border: "border-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    icon: <XCircle className="h-4 w-4 text-red-500" />,
  },
};
```

## 10. Obsługa błędów

### Scenariusze błędów i ich obsługa

| Błąd | Kod HTTP | Przyczyna | Obsługa UI |
|------|----------|-----------|------------|
| Brak autoryzacji | 401 | Token wygasł lub brak sesji | Redirect do `/login` |
| Nieprawidłowe parametry | 400 | Błędne query params | Toast z komunikatem |
| Zakład nie znaleziony | 404 | Zakład usunięty lub nie istnieje | Toast + odświeżenie listy |
| Nie można usunąć | 403 | Mecz się rozpoczął lub < 5 min | Toast z komunikatem reason |
| Błąd serwera | 500 | Problem z bazą danych | Toast + retry button |
| Błąd sieci | - | Brak połączenia | Toast + retry button |

### Implementacja obsługi błędów

```typescript
// W hooku useMyBets
const handleApiError = (response: Response, data: any) => {
  switch (response.status) {
    case 401:
      // Redirect do logowania
      window.location.href = "/login";
      break;
    case 403:
      toast.error(data.reason || "Nie można wykonać tej operacji");
      break;
    case 404:
      toast.error("Zakład nie został znaleziony");
      refresh(); // Odśwież listę
      break;
    case 400:
      toast.error(data.error || "Nieprawidłowe dane");
      break;
    default:
      toast.error("Wystąpił błąd. Spróbuj ponownie.");
  }
};

// Obsługa błędu sieci
const handleNetworkError = () => {
  setError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
};
```

### Komponent wyświetlania błędów

```typescript
// ErrorMessage component
interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Błąd</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### Stany ładowania

```typescript
// Skeleton dla BetCard
function BetCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Lista skeletonów
function BetListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BetCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów i funkcji pomocniczych

1. Utworzenie pliku `src/lib/utils/bet-utils.ts` z funkcjami:
   - Ekstrakcja `getResultLabel()` i `getResultDescription()` z `MatchResult.tsx`
   - `getBetDisplayStatus()`
   - `canDeleteBet()`
   - `calculateBetStats()`
2. Aktualizacja `src/components/matches/MatchResult.tsx` aby importował funkcje z `bet-utils.ts`
3. Utworzenie pliku `src/types/my-bets.types.ts` z typami ViewModel

### Krok 2: Instalacja brakujących komponentów Shadcn/ui

```bash
npx shadcn@latest add alert-dialog badge skeleton
```

### Krok 3: Implementacja custom hook `useMyBets`

1. Utworzenie pliku `src/components/hooks/useMyBets.ts`
2. Implementacja logiki pobierania danych z API (wzorowana na `useMatches`)
3. Implementacja "Load More" (infinite scroll)
4. Implementacja filtrowania client-side po statusie
5. Implementacja akcji usuwania zakładu z optymistyczną aktualizacją
6. Dodanie synchronizacji filtrów z URL

### Krok 4: Rozszerzenie TournamentSelector (opcjonalnie)

Jeśli potrzebna opcja "Wszystkie turnieje":
1. Rozszerzenie `src/components/matches/TournamentSelector.tsx` o prop `allowAll?: boolean`
2. Dodanie `SelectItem` z wartością pustą dla opcji "Wszystkie"

### Krok 5: Implementacja komponentów atomowych

1. `StatCard` - karta pojedynczej statystyki
2. `StatusSelect` - dropdown statusu zakładu
3. `DeleteBetButton` - przycisk z dialogiem potwierdzenia (używa AlertDialog)
4. `EmptyState` - stan pusty dla listy
5. `LoadMoreButton` - przycisk ładowania kolejnych (spójny z MatchesView)

### Krok 6: Implementacja komponentów złożonych

1. `BetStats` - sekcja statystyk (używa StatCard)
2. `BetFilters` - sekcja filtrów (używa TournamentSelector, StatusSelect)
3. `MatchInfo` - informacje o meczu w karcie
4. `BetOutcome` - wynik zakładu w karcie (używa funkcji z bet-utils.ts)
5. `BetCard` - pełna karta zakładu (używa MatchInfo, BetOutcome, DeleteBetButton)

### Krok 7: Implementacja głównych komponentów widoku

1. `BetList` - lista zakładów (używa BetCard, EmptyState, LoadMoreButton)
2. `MyBetsView` - główny komponent React (orkiestruje wszystko)

### Krok 8: Implementacja strony Astro

1. Utworzenie pliku `src/pages/my-bets.astro`
2. Implementacja sprawdzenia autoryzacji (middleware)
3. Osadzenie komponentu `<MyBetsView client:load />`
4. Przekazanie początkowych parametrów z URL

### Krok 9: Integracja i testy

1. Weryfikacja integracji z API `/api/me/bets`
2. Weryfikacja integracji z API `/api/bets/:id` (DELETE)
3. Testy manualne wszystkich scenariuszy:
   - Pobieranie zakładów
   - Filtrowanie po turnieju
   - Filtrowanie po statusie
   - Load More
   - Usuwanie zakładu
   - Obsługa błędów
4. Testy responsywności (mobile, tablet, desktop)
5. Testy dostępności (keyboard navigation, screen reader)

### Krok 10: Dopracowanie UX

1. Skeleton loading states
2. Toast notifications dla akcji (używa Sonner)
3. Animacje przejść (CSS transitions)

### Krok 11: Optymalizacja

1. Memoizacja komponentów z `React.memo()`
2. Optymalizacja re-renderów z `useMemo()` i `useCallback()`
3. Lazy loading komponentu AlertDialog

### Krok 12: Code review

1. Weryfikacja zgodności z ESLint i Prettier
2. Code review zgodnie z wytycznymi z CLAUDE.md
