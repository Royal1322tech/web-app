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
  role: requiredText("your role"),
  fullName: requiredText("your full name"),
  nationality: requiredText("your nationality"),
  idNumber: requiredText("your ID number"),
  callingCode: z
    .string()
    .trim()
    .regex(/^\+\d+$/, "Enter a country calling code starting with +."),
  phone: requiredText("your phone number").regex(
    /^\+?[\d\s().-]*\d[\d\s().-]*$/,
    "Enter a phone number using digits and an optional country code.",
  ),
  email: requiredText("your email address").pipe(
    z.email("Enter a valid email address."),
  ),
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
    role: "",
    fullName: "",
    nationality: "",
    idNumber: "",
    callingCode: "+20",
    phone: "",
    email: "",
  },
};
