import { z } from "zod/v4";

export const EmptyToolInputSchema = z.object({}).strict();

export const PlaceholderToolOutputSchema = z
  .object({
    status: z.literal("not_implemented"),
    tool: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export type PlaceholderToolOutput = z.infer<
  typeof PlaceholderToolOutputSchema
>;
