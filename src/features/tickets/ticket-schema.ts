import { z } from "zod";
import { supportAttachmentField } from "@/features/enquiries/complaint-submission";
import type { TicketCategory } from "./ticket-types";

/** Ticket form validation; reuses the complaint form's limits and attachment rules. */
export function createTicketSchema(
  categories: readonly TicketCategory[],
  messages: {
    category: string;
    subjectRequired: string;
    subjectLength: string;
    descriptionRequired: string;
    descriptionLength: string;
    attachmentType: string;
    attachmentSize: string;
  },
) {
  return z.object({
    category: z.string().refine(
      (value): value is TicketCategory => categories.includes(value as TicketCategory),
      messages.category,
    ),
    subject: z.string().trim().min(1, messages.subjectRequired).min(4, messages.subjectLength).max(160, messages.subjectLength),
    description: z.string().trim().min(1, messages.descriptionRequired).min(10, messages.descriptionLength).max(5000, messages.descriptionLength),
    attachment: supportAttachmentField(messages),
  });
}

export type TicketFormInput = z.input<ReturnType<typeof createTicketSchema>>;
export type TicketFormValues = z.output<ReturnType<typeof createTicketSchema>>;

export function createReplySchema(messages: { required: string; length: string }) {
  return z.object({
    message: z.string().trim().min(1, messages.required).max(2000, messages.length),
  });
}
