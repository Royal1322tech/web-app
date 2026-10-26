import { z } from "zod";
import { businessTypeDefinition, requiredDocumentsFor } from "../data/business-types";
import { documentHelp, documentPolicy, registrationDocuments } from "../data/documents";

export interface FilePolicy {
  maxBytes: number;
  help: string;
}

/** Validation messages for one required file; empty when the file is acceptable. */
export function fileIssues(file: File | null | undefined, label: string, policy: FilePolicy, missing = `Select your ${label.toLowerCase()}.`): string[] {
  if (!file) return [missing];
  const issues: string[] = [];
  if (file.size === 0) issues.push("This file is empty. Select a different file.");
  if (file.size > policy.maxBytes) issues.push(`This file is too large. ${policy.help}`);
  const extension = file.name.split(".").pop()?.toLowerCase();
  const allowed = documentPolicy.formats.some(
    ({ extensions, mimeType }) =>
      extensions.some((allowedExtension) => allowedExtension === extension) &&
      (!file.type || file.type === mimeType),
  );
  if (!allowed) issues.push(`Unsupported file type. ${policy.help}`);
  return issues;
}

const fileValue = z.custom<File | null>(
  (value) => value === null || (typeof File !== "undefined" && value instanceof File),
  "Select a valid file.",
);

/** A required file field validated against the given size policy. */
export function requiredFile(label: string, policy: FilePolicy, missing?: string) {
  return fileValue.superRefine((file, context) => {
    for (const message of fileIssues(file, label, policy, missing)) context.addIssue({ code: "custom", message });
  });
}

export const agencyDocumentPolicy: FilePolicy = { maxBytes: documentPolicy.maxBytes, help: documentHelp };

export const businessTypeRequired = "Select your company business type.";

/** Only documents required by the selected business type are validated. */
export const documentsSchema = z
  .object({
    businessType: z.string(),
    commercialRegistration: fileValue,
    tourismLicence: fileValue,
    taxCertificate: fileValue,
  })
  .superRefine((documents, context) => {
    if (!businessTypeDefinition(documents.businessType)) {
      context.addIssue({ code: "custom", path: ["businessType"], message: businessTypeRequired });
      return;
    }
    for (const name of requiredDocumentsFor(documents.businessType)) {
      const label = registrationDocuments.find((document) => document.name === name)!.label;
      for (const message of fileIssues(documents[name], label, agencyDocumentPolicy)) {
        context.addIssue({ code: "custom", path: [name], message });
      }
    }
  });
