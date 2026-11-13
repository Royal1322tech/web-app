import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import { countries } from "../data/countries";
import { cityLabel } from "../data/locations";
import type { RegistrationValues } from "../schemas/registration.schema";
import { contactPhone } from "./phone";

/*
 * Contract: POST /api/v1/b2b/auth/register ("Royal travel" OpenAPI 1.0.0, request example).
 * The OpenAPI document lists this path as /up/api/v1/b2b/auth/register, but the staging router reports
 * that path as not found while /api/v1/b2b/auth/register exists (POST only), so the /up prefix is not
 * used. The OpenAPI file documents no response; the 201 { company_id, status } shape is unconfirmed.
 * display_name and tax_no are documented but the form has no inputs for them, so they are not sent.
 */

/** Backend rule: at least 12 characters with lower and upper case letters, a digit and a symbol. */
export const passwordRules = [
  { test: (value: string) => value.length >= 12, en: "At least 12 characters", ar: "12 حرفًا على الأقل" },
  { test: (value: string) => /[a-z]/.test(value), en: "A lowercase letter", ar: "حرف صغير" },
  { test: (value: string) => /[A-Z]/.test(value), en: "An uppercase letter", ar: "حرف كبير" },
  { test: (value: string) => /[0-9]/.test(value), en: "A number", ar: "رقم" },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), en: "A symbol", ar: "رمز" },
] as const;

const responseSchema = z.object({ company_id: z.uuid(), status: z.string() });

export interface RegistrationResult {
  companyId: string;
  status: string;
}

const countryName = (code: string) => countries.find((country) => country.value === code)?.label ?? code;

/**
 * Sends the registration fields the API accepts. The logo, ID document and company documents are
 * not part of this contract, so they are not sent.
 */
export async function submitRegistration(values: RegistrationValues, password: string): Promise<RegistrationResult> {
  const { company, contact, documents } = values;
  const data = await apiRequest("api/v1/b2b/auth/register", {
    method: "POST",
    body: {
      legal_name: company.name.trim(),
      business_type: documents.businessType,
      registration_no: company.registrationNumber.trim(),
      country_code: company.country,
      city: cityLabel(company.country, company.city),
      address: company.address.trim(),
      employee_count: Number(company.employeeCount),
      contact_name: contact.fullName.trim(),
      contact_email: contact.email.trim(),
      contact_phone: contactPhone(contact)?.number ?? `${contact.callingCode}${contact.phone}`.replace(/\s+/g, ""),
      contact_nationality: countryName(contact.nationality),
      contact_id_number: contact.idNumber.trim(),
      password,
      password_confirmation: password,
    },
    parse: (value) => responseSchema.parse(value),
  });
  return { companyId: data.company_id, status: data.status };
}
