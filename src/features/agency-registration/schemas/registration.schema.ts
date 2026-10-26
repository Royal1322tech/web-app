import { contactPhone, validPhoneCountry } from "../lib/phone";
import { z } from "zod";
import { citiesForCountry } from "../data/locations";
import { documentsSchema, requiredFile, type FilePolicy } from "./documents.schema";

const requiredText = (label: string) =>
  z.string().trim().min(1, `Enter ${label}.`);

export const cityRequired = "Select your company city.";
export const cityMismatch = "Select a city in the selected country.";

export const companySchema = z.object({
  name: requiredText("your company name"),
  employeeCount: requiredText("the number of employees").regex(
    /^\d+$/,
    "Enter a whole number of employees.",
  ),
  country: requiredText("your company country"),
  city: z.string().trim().min(1, cityRequired),
  registrationNumber: requiredText("your commercial registration number"),
  address: requiredText("your company address"),
}).superRefine((company, context) => {
  // When the country has a city list, the city must be one of its stable identifiers.
  const cities = citiesForCountry(company.country);
  if (company.city && cities.length && !cities.some((city) => city.id === company.city)) {
    context.addIssue({ code: "custom", path: ["city"], message: cityMismatch });
  }
});

/** Identity documents stay in the browser; they are never uploaded or stored. */
export const idDocumentPolicy: FilePolicy = { maxBytes: 5 * 1024 * 1024, help: "PDF, JPG/JPEG or PNG. Maximum 5 MB." };

export const contactSchema = z.object({
  fullName: requiredText("your full name"),
  nationality: requiredText("your nationality"),
  idNumber: requiredText("your ID number"),
  idDocument: requiredFile("ID document", idDocumentPolicy, "Select your ID document."),
  phoneCountry: z.string().refine((value): boolean => validPhoneCountry(value), "Select a phone country."),
  callingCode: z
    .string()
    .trim()
    .regex(/^\+\d+$/, "Enter a country calling code starting with +."),
  phone: requiredText("your phone number"),
  email: requiredText("your email address").pipe(
    z.email("Enter a valid email address."),
  ),
}).superRefine((contact, context) => {
  if (!contactPhone(contact)) context.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number for the selected country." });
});

export const registrationSchema = z.object({
  company: companySchema,
  contact: contactSchema,
  documents: documentsSchema,
});
export type RegistrationValues = z.infer<typeof registrationSchema>;

export const registrationDefaults: RegistrationValues = {
  documents: {
    businessType: "",
    commercialRegistration: null,
    tourismLicence: null,
    taxCertificate: null,
  },
  company: {
    name: "",
    employeeCount: "",
    country: "",
    city: "",
    registrationNumber: "",
    address: "",
  },
  contact: {
    fullName: "",
    nationality: "",
    idNumber: "",
    idDocument: null,
    phoneCountry: "EG",
    callingCode: "+20",
    phone: "",
    email: "",
  },
};
