import type { DocumentName } from "./documents";

// Required company documents by business type.
export const businessTypes = [
  {
    value: "travel_agency",
    label: { en: "Travel Agency", ar: "وكالة سفر" },
    documents: ["commercialRegistration", "tourismLicence", "taxCertificate"],
  },
  {
    value: "corporate",
    label: { en: "Corporate", ar: "شركة" },
    documents: ["commercialRegistration", "taxCertificate"],
  },
] as const satisfies readonly {
  value: string;
  label: { en: string; ar: string };
  documents: readonly DocumentName[];
}[];

export type BusinessType = (typeof businessTypes)[number]["value"];

export function businessTypeDefinition(value: string) {
  return businessTypes.find((type) => type.value === value);
}

/** Documents required for a business type; `[]` before a type is chosen. */
export function requiredDocumentsFor(value: string): readonly DocumentName[] {
  return businessTypeDefinition(value)?.documents ?? [];
}
