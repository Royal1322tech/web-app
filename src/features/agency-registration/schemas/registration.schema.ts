import { contactPhone, validPhoneCountry } from "../lib/phone";
import { z } from "zod";
import { documentsSchema } from "./documents.schema";

const requiredText = (label: string) =>
  z.string().trim().min(1, `Enter ${label}.`);

export const companySchema = z.object({
  name: requiredText("your company name"),
  employeeCount: requiredText("the number of employees").regex(
    /^\d+$/,
    "Enter a whole number of employees.",
  ),
  country: requiredText("your company country"),
  registrationNumber: requiredText("your company registration number"),
  address: requiredText("your company address"),
});

export const contactSchema = z.object({
  fullName: requiredText("your full name"),
  nationality: requiredText("your nationality"),
  idNumber: requiredText("your ID number"),
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
    commercialRegistration: null,
    tourismLicence: null,
    taxCertificate: null,
  },
  company: {
    name: "",
    employeeCount: "",
    country: "",
    registrationNumber: "",
    address: "",
  },
  contact: {
    fullName: "",
    nationality: "",
    idNumber: "",
    phoneCountry: "EG",
    callingCode: "+20",
    phone: "",
    email: "",
  },
};
