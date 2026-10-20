import { z } from "zod";

export const complaintServices = [
  "hotel_booking",
  "car_rental",
  "payment",
  "invoice",
  "technical_issue",
  "other",
] as const;

export type ComplaintService = (typeof complaintServices)[number];

export interface ComplaintPayload {
  service_type: ComplaintService;
  booking_id?: string;
  title: string;
  description: string;
  attachment?: File;
}

export function createComplaintSchema(messages: {
  service: string;
  titleRequired: string;
  titleLength: string;
  detailsRequired: string;
  detailsLength: string;
  bookingIdLength: string;
  attachmentType: string;
  attachmentSize: string;
}) {
  return z.object({
    service: z.string().refine(
      (value): value is ComplaintService => complaintServices.includes(value as ComplaintService),
      messages.service,
    ),
    bookingId: z.string().trim().max(100, messages.bookingIdLength),
    title: z.string().trim().min(1, messages.titleRequired).min(4, messages.titleLength).max(160, messages.titleLength),
    details: z.string().trim().min(1, messages.detailsRequired).min(10, messages.detailsLength).max(5000, messages.detailsLength),
    attachment: z.custom<FileList>().optional()
      .refine(files => !files?.length || ["image/jpeg", "image/png", "application/pdf"].includes(files[0].type), messages.attachmentType)
      .refine(files => !files?.length || files[0].size <= 5 * 1024 * 1024, messages.attachmentSize),
  });
}

export type ComplaintFormValues = z.infer<ReturnType<typeof createComplaintSchema>>;
export type ComplaintFormInput = z.input<ReturnType<typeof createComplaintSchema>>;

export type ComplaintSubmissionResult =
  | { status: "unavailable" }
  | { status: "accepted"; reference?: string };

export class ComplaintSubmissionError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ComplaintSubmissionError";
  }
}

function parseReference(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const record = data as Record<string, unknown>;
  const reference = record.reference ?? record.id;
  return typeof reference === "string" || typeof reference === "number" ? String(reference) : undefined;
}

function parseFieldErrors(data: unknown): Record<string, string> {
  if (typeof data !== "object" || data === null) return {};
  const errors = (data as Record<string, unknown>).errors;
  if (typeof errors !== "object" || errors === null) return {};
  return Object.fromEntries(Object.entries(errors).flatMap(([field, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    return typeof message === "string" ? [[field, message]] : [];
  }));
}

export async function submitComplaint(
  payload: ComplaintPayload,
): Promise<ComplaintSubmissionResult> {
  const endpoint = import.meta.env.VITE_COMPLAINTS_ENDPOINT?.trim();
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!endpoint || !apiBase) return { status: "unavailable" };

  let baseUrl: URL;
  let url: URL;
  try {
    baseUrl = new URL(apiBase);
    url = new URL(endpoint, baseUrl);
  } catch {
    throw new ComplaintSubmissionError("Invalid complaint service configuration.");
  }
  if (url.origin !== baseUrl.origin) {
    throw new ComplaintSubmissionError("The complaint endpoint must use the configured API origin.");
  }

  const body = new FormData();
  body.set("service_type", payload.service_type);
  body.set("title", payload.title);
  body.set("description", payload.description);
  if (payload.booking_id) body.set("booking_id", payload.booking_id);
  if (payload.attachment) body.set("attachment", payload.attachment, payload.attachment.name);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      body,
    });
  } catch {
    throw new ComplaintSubmissionError("Complaint request could not be reached.");
  }

  const responseText = await response.text();
  let data: unknown;
  try {
    data = responseText.trim() ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }
  if (response.status === 422) {
    throw new ComplaintSubmissionError("Complaint validation failed.", response.status, parseFieldErrors(data));
  }
  if (![200, 201, 202].includes(response.status)) {
    throw new ComplaintSubmissionError("Complaint request was not accepted.", response.status, parseFieldErrors(data));
  }
  return { status: "accepted", reference: parseReference(data) };
}
