import { useState, useCallback } from "react";
import { placeBet, updateBet } from "@/lib/api/matches.api";
import type { MatchDTO, MatchOutcome, BetDTO } from "@/types";

interface UseBettingOptions {
  onSuccess?: (matchId: number, bet: BetDTO) => void;
  onError?: (matchId: number, error: string) => void;
  updateMatchLocally: (matchId: number, update: Partial<MatchDTO>) => void;
}

interface BettingState {
  matchId: number | null;
  prediction: MatchOutcome | null;
}

interface UseBettingReturn {
  placeBetOnMatch: (match: MatchDTO, prediction: MatchOutcome) => Promise<void>;
  isLoading: boolean;
  loadingState: BettingState;
}

export function useBetting({ onSuccess, onError, updateMatchLocally }: UseBettingOptions): UseBettingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<BettingState>({
    matchId: null,
    prediction: null,
  });

  const placeBetOnMatch = useCallback(
    async (match: MatchDTO, prediction: MatchOutcome) => {
      const previousBet = match.user_bet;

      setIsLoading(true);
      setLoadingState({ matchId: match.id, prediction });

      // Optimistic update
      updateMatchLocally(match.id, {
        user_bet: previousBet
          ? { ...previousBet, picked_result: prediction }
          : {
              id: -1, // Temporary ID
              picked_result: prediction,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
      });

      try {
        let result;

        if (previousBet && previousBet.id > 0) {
          // Update existing bet
          result = await updateBet(previousBet.id, prediction);
        } else {
          // Create new bet
          result = await placeBet({
            match_id: match.id,
            picked_result: prediction,
          });
        }

        if (result.success) {
          // Update with real data from server
          updateMatchLocally(match.id, {
            user_bet: result.data,
          });
          onSuccess?.(match.id, result.data);
        } else {
          // Rollback on error
          updateMatchLocally(match.id, {
            user_bet: previousBet,
          });
          const errorMessage = result.error.reason || result.error.error;
          onError?.(match.id, errorMessage);
        }
      } catch (err) {
        // Rollback on error
        updateMatchLocally(match.id, {
          user_bet: previousBet,
        });
        const errorMessage = err instanceof Error ? err.message : "Błąd obstawiania";
        onError?.(match.id, errorMessage);
      } finally {
        setIsLoading(false);
        setLoadingState({ matchId: null, prediction: null });
      }
    },
    [updateMatchLocally, onSuccess, onError]
  );

  return {
    placeBetOnMatch,
    isLoading,
    loadingState,
  };
}
