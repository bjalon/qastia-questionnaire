import { z } from "zod";
import { rawPageSchema } from "./rawPage.schema";
import { rawThemeSchema } from "./rawTheme.schema";

export const rawFormSchema = z
  .object({
    version: z.number().optional(),
    kind: z.string().optional(),
    id: z.string().optional(),
    metadata: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        locale: z.string().optional(),
      })
      .passthrough()
      .optional(),
    theme: rawThemeSchema.optional(),
    navigation: z
      .object({
        mode: z.enum(["single-page", "paged"]).optional(),
      })
      .passthrough()
      .optional(),
    pages: z.array(rawPageSchema).optional(),
  })
  .passthrough();
