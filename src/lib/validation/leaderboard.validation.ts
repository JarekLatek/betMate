import { z } from "zod";

/**
 * Schema for validating tournament_id URL parameter
 */
export const leaderboardParamsSchema = z.object({
  tournament_id: z.coerce.number().int().positive({
    message: "tournament_id must be a positive integer",
  }),
});

/**
 * Schema for validating leaderboard query parameters
 */
export const leaderboardQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1, { message: "limit must be at least 1" })
    .max(500, { message: "limit must not exceed 500" })
    .default(100),
  offset: z.coerce.number().int().min(0, { message: "offset must be non-negative" }).default(0),
});

/**
 * Inferred types from schemas
 */
export type LeaderboardParams = z.infer<typeof leaderboardParamsSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
