import { z } from "zod";

export const createKeywordSchema = z.object({
  keyword: z.string().trim().min(1, "Keyword is required").max(255),
  country: z.string().trim().min(2).max(5).default("in"),
  language: z.string().trim().min(2).max(5).default("en"),
});

export type CreateKeywordInput = z.infer<typeof createKeywordSchema>;

export const bulkKeywordSchema = z.object({
  keywords: z
    .array(z.string().trim().min(1))
    .min(1, "At least one keyword is required")
    .max(1000, "A maximum of 1000 keywords can be added at once"),
  country: z.string().trim().min(2).max(5).default("in"),
  language: z.string().trim().min(2).max(5).default("en"),
});

export type BulkKeywordInput = z.infer<typeof bulkKeywordSchema>;
