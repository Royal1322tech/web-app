import { z } from "zod";
import { documentHelp, documentPolicy } from "../data/documents";

function requiredDocument(label: string) {
  return z
    .custom<File>(
      (value) => typeof File !== "undefined" && value instanceof File,
      "Select a valid file.",
    )
    .nullable()
    .superRefine((file, context) => {
      if (!file) {
        context.addIssue({
          code: "custom",
          message: `Select your ${label.toLowerCase()}.`,
        });
        return;
      }
      if (file.size === 0) {
        context.addIssue({
          code: "custom",
          message: "This file is empty. Select a different file.",
        });
      }
      if (file.size > documentPolicy.maxBytes) {
        context.addIssue({
          code: "custom",
          message: `This file is too large. ${documentHelp}`,
        });
      }
      const extension = file.name.split(".").pop()?.toLowerCase();
      const allowed = documentPolicy.formats.some(
        ({ extensions, mimeType }) =>
          extensions.some(
            (allowedExtension) => allowedExtension === extension,
          ) &&
          (!file.type || file.type === mimeType),
      );
      if (!allowed) {
        context.addIssue({
          code: "custom",
          message: `Unsupported file type. ${documentHelp}`,
        });
      }
    });
}

export const documentsSchema = z.object({
  commercialRegistration: requiredDocument("Commercial Registration"),
  tourismLicence: requiredDocument("Tourism Licence"),
  taxCertificate: requiredDocument("Tax Certificate"),
});
