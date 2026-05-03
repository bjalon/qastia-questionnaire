import { z } from "zod";

export const rawElementSchema = z
  .object({
    id: z.string().optional(),
    type: z.string().optional(),
    questionType: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    options: z
      .array(
        z
          .object({
            value: z.string(),
            label: z.string(),
          })
          .passthrough(),
      )
      .optional(),
    config: z.record(z.unknown()).optional(),
    validation: z.record(z.unknown()).optional(),
  })
  .passthrough();
