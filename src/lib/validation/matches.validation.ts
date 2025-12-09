import { z } from "zod";
import { Constants } from "@/db/database.types";

const matchStatusValues = Constants.public.Enums.match_status as unknown as [string, ...string[]];

/**
 * Validation schema for GET /api/matches query parameters
 * Validates filtering, pagination, and date range parameters
 */
export const getMatchesQuerySchema = z
  .object({
    tournament_id: z.coerce.number().int().positive().optional(),
    status: z.enum(matchStatusValues).optional(),
    filter: z.enum(["UPCOMING", "FINISHED"]).optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(
    (data) => {
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: "to_date must be after from_date",
      path: ["to_date"],
    }
  );

/**
 * Type inferred from the validation schema
 * Represents validated query parameters for matches endpoint
 */
export type GetMatchesQuery = z.infer<typeof getMatchesQuerySchema>;
