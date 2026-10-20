import { z } from "zod";

export interface PriceReductionRequestPayload {
  hotelId: string;
  hotelName: string;
  hotelLocation?: string;
  roomId?: string;
  roomType?: string;
  boardType?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number;
  adults?: number;
  children?: number;
  currentPrice?: number;
  priceBasis?: "per night";
  priceComparisonEligible?: boolean;
  requestedPrice: number;
  currency: string;
  agencyName: string;
  agentName: string;
  agentEmail: string;
  agentPhone?: string;
  competitorName?: string;
  notes?: string;
}

export function createPriceReductionFormSchema(currentPrice?: number) {
  return z.object({
    agencyName: z.string().trim().min(1, "Enter your agency name.").max(120),
    agentName: z.string().trim().min(1, "Enter your name.").max(120),
    agentEmail: z.string().trim().email("Enter a valid email address.").max(254),
    agentPhone: z.string().trim().max(40),
    requestedPrice: z
      .string()
      .trim()
      .min(1, "Enter the requested price.")
      .max(20)
      .refine(
        (value) => /^\d+(?:\.\d{1,2})?$/.test(value),
        "Enter a valid price.",
      )
      .refine(
        (value) => Number.isFinite(Number(value)) && Number(value) > 0,
        "Price must be greater than zero.",
      ),
    competitorName: z.string().trim().max(120),
    notes: z.string().trim().max(1000),
  }).superRefine((values, context) => {
    const requested = Number(values.requestedPrice);
    if (currentPrice !== undefined && requested > 0 && requested >= currentPrice) {
      context.addIssue({
        code: "custom",
        path: ["requestedPrice"],
        message: "Requested price must be lower than the current nightly price.",
      });
    }
  });
}

export type PriceReductionFormValues = z.infer<ReturnType<typeof createPriceReductionFormSchema>>;

export type PriceReductionSubmissionResult =
  | { status: "unavailable" }
  | { status: "accepted"; reference?: string };

function parseResponse(data: unknown): { reference?: string } {
  if (typeof data !== "object" || data === null) return {};
  const reference = (data as { reference?: unknown }).reference;
  return typeof reference === "string" ? { reference } : {};
}

export async function submitPriceReductionRequest(
  payload: PriceReductionRequestPayload,
): Promise<PriceReductionSubmissionResult> {
  const endpoint = import.meta.env.VITE_PRICE_REDUCTION_REQUESTS_ENDPOINT?.trim();
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!endpoint || !apiBase) return { status: "unavailable" };

  const baseUrl = new URL(apiBase);
  const url = new URL(endpoint, baseUrl);
  if (url.origin !== baseUrl.origin) {
    throw new Error("The price request endpoint must use the configured API origin.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error("The price request was not accepted.");
  }
  const responseText = await response.text();
  const data: unknown = responseText.trim() ? JSON.parse(responseText) : null;
  return { status: "accepted", ...parseResponse(data) };
}
