import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Standard API error structure
 */
export interface ApiError {
  status: number;
  error: string;
  reason?: string;
}

/**
 * Maps Supabase/PostgreSQL errors to API error responses
 * Handles common database errors and RLS policy violations
 *
 * @param error - PostgrestError from Supabase operation
 * @returns ApiError with appropriate HTTP status and message
 */
export function mapDatabaseError(error: PostgrestError): ApiError {
  // Unique constraint violation (duplicate bet)
  // Code: 23505 - unique_violation
  if (error.code === "23505") {
    return {
      status: 409,
      error: "Bet already exists for this match",
    };
  }

  // Foreign key violation (match not found)
  // Code: 23503 - foreign_key_violation
  if (error.code === "23503") {
    return {
      status: 404,
      error: "Match not found",
    };
  }

  // RLS policy violation
  // When RLS policy fails, Supabase typically returns no rows or mentions policy in error
  if (error.message.includes("policy") || error.message.includes("row-level security")) {
    // Try to determine specific reason from error message
    if (error.message.includes("5 minutes")) {
      return {
        status: 403,
        error: "Cannot bet on this match",
        reason: "Match starts in less than 5 minutes",
      };
    }
    return {
      status: 403,
      error: "Cannot bet on this match",
      reason: "Match status must be SCHEDULED",
    };
  }

  // No rows returned (could be RLS policy rejection)
  // This happens when RLS policy WITH CHECK fails
  if (error.code === "PGRST116" || error.message.includes("no rows returned")) {
    return {
      status: 403,
      error: "Cannot bet on this match",
      reason: "Match does not meet betting requirements (must be SCHEDULED and start in more than 5 minutes)",
    };
  }

  // Default error - something unexpected happened
  return {
    status: 500,
    error: "Failed to create bet",
  };
}
