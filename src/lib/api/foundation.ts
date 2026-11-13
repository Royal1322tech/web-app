import { z } from "zod";
import { apiRequest } from "./client";

/*
 * GET /api/v1/foundation-check: an unauthenticated connectivity check. Response observed on staging
 * (2026-11-11): {"locale":"en","direction":"ltr"}, or {"locale":"ar","direction":"rtl"} when the
 * request carries `X-Locale: ar`, which apiRequest sends for the current page language.
 */
const foundationSchema = z.object({
  locale: z.string().min(1),
  direction: z.enum(["ltr", "rtl"]),
});

export type FoundationStatus = z.infer<typeof foundationSchema>;

export const parseFoundation = (value: unknown): FoundationStatus => foundationSchema.parse(value);

/** Resolves when the API is reachable and answers in the expected shape; otherwise throws ApiError. */
export function checkFoundation(options: { locale?: "en" | "ar"; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<FoundationStatus> {
  return apiRequest("api/v1/foundation-check", { ...options, parse: parseFoundation });
}
