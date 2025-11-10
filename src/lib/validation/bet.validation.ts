import { z } from "zod";

/**
 * Validation schema for creating a new bet
 * Validates the request body for POST /api/bets
 */
export const createBetSchema = z.object({
  match_id: z.number().int().positive({
    message: "match_id must be a positive integer",
  }),
  picked_result: z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"], {
    errorMap: () => ({
      message: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
    }),
  }),
});

/**
 * Type inferred from the validation schema
 * Represents a validated bet creation input
 */
export type CreateBetInput = z.infer<typeof createBetSchema>;

/**
 * Validation schema for updating an existing bet
 * Validates the request body for PUT /api/bets/:id
 */
export const updateBetSchema = z.object({
  picked_result: z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"], {
    errorMap: () => ({
      message: "picked_result must be one of: HOME_WIN, DRAW, AWAY_WIN",
    }),
  }),
});

/**
 * Type inferred from the update validation schema
 * Represents a validated bet update input
 */
export type UpdateBetInput = z.infer<typeof updateBetSchema>;

/**
 * Validation schema for bet ID parameter from URL
 * Coerces string to number and validates
 */
export const betIdSchema = z.coerce
  .number({
    required_error: "Bet ID is required",
    invalid_type_error: "Bet ID must be a number",
  })
  .int("Bet ID must be an integer")
  .positive("Bet ID must be a positive number");

/**
 * Type inferred from the bet ID validation schema
 */
export type BetIdInput = z.infer<typeof betIdSchema>;

/**
 * Validation schema for GET /api/me/bets query parameters
 * Validates filters and pagination parameters for user bets
 */
export const getUserBetsQuerySchema = z.object({
  tournament_id: z.coerce
    .number()
    .int()
    .positive({
      message: "tournament_id must be a positive integer",
    })
    .optional(),

  match_id: z.coerce
    .number()
    .int()
    .positive({
      message: "match_id must be a positive integer",
    })
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "limit must be at least 1" })
    .max(100, { message: "limit cannot exceed 100" })
    .default(50),

  offset: z.coerce.number().int().min(0, { message: "offset must be non-negative" }).default(0),
});

/**
 * Type inferred from the getUserBetsQuerySchema
 */
export type GetUserBetsQueryInput = z.infer<typeof getUserBetsQuerySchema>;
