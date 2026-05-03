import { z } from "zod";
import { rawElementSchema } from "./rawElement.schema";

export const rawPageSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    elements: z.array(rawElementSchema).optional(),
  })
  .passthrough();
