import { z } from "zod";

export const rawThemeSchema = z
  .object({
    id: z.string().optional(),
  })
  .passthrough();
