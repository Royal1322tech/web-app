import { z } from "zod";
import { apiRequest } from "@/lib/api/client";

/*
 * Request contracts: "Royal travel" OpenAPI 1.0.0 (login, verify-otp, me with bearerAuth). The OpenAPI
 * file documents no response bodies, so the response schemas below are unconfirmed by that document.
 * Logout is not in the OpenAPI file; staging routes it (POST only).
 */

const CHANNEL = "website";

const challengeSchema = z.object({
  challenge_id: z.uuid(),
  expires_in: z.number().int().positive(),
});

const tokenSchema = z.object({
  token_type: z.literal("Bearer"),
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  company_id: z.uuid(),
  user: z.object({ id: z.union([z.number(), z.string()]), name: z.string(), email: z.string() }),
});

const profileSchema = z.object({
  data: z.object({
    user: z.object({ id: z.union([z.number(), z.string()]), name: z.string(), email: z.string() }),
    company: z.object({
      id: z.uuid(),
      name: z.string(),
      status: z.string(),
      legal_name: z.string().nullable().optional(),
      business_type: z.string().nullable().optional(),
      country_code: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      account_currency: z.string().nullable().optional(),
      preferred_locale: z.string().nullable().optional(),
    }),
    membership: z.object({ role_code: z.string(), status: z.string() }),
  }),
});

export interface B2BIdentity {
  user: { id: string; name: string; email: string };
  company: { id: string; name: string; legalName?: string; status: string; businessType?: string; countryCode?: string; city?: string; address?: string; currency?: string };
  membership: { role: string; status: string };
}

export interface LoginChallenge {
  challengeId: string;
  expiresInSeconds: number;
}

export interface IssuedToken {
  token: string;
  expiresInSeconds: number;
  companyId: string;
}

/** Step 1: checks credentials and company access, then emails a one-time code. */
export async function requestLoginCode(input: { email: string; password: string; companyId: string }): Promise<LoginChallenge> {
  const data = await apiRequest("api/v1/b2b/auth/login", {
    method: "POST",
    body: { email: input.email, password: input.password, company_id: input.companyId, channel: CHANNEL },
    parse: (value) => challengeSchema.parse(value),
  });
  return { challengeId: data.challenge_id, expiresInSeconds: data.expires_in };
}

/** Step 2: exchanges the code for a token scoped to one company. */
export async function verifyLoginCode(input: { challengeId: string; code: string }): Promise<IssuedToken> {
  const data = await apiRequest("api/v1/b2b/auth/verify-otp", {
    method: "POST",
    body: { challenge_id: input.challengeId, otp: input.code, channel: CHANNEL },
    parse: (value) => tokenSchema.parse(value),
  });
  return { token: data.access_token, expiresInSeconds: data.expires_in, companyId: data.company_id };
}

export async function fetchCurrentUser(token: string): Promise<B2BIdentity> {
  const { data } = await apiRequest("api/v1/b2b/me", { token, parse: (value) => profileSchema.parse(value) });
  return {
    user: { id: String(data.user.id), name: data.user.name, email: data.user.email },
    company: {
      id: data.company.id,
      name: data.company.name,
      legalName: data.company.legal_name ?? undefined,
      status: data.company.status,
      businessType: data.company.business_type ?? undefined,
      countryCode: data.company.country_code ?? undefined,
      city: data.company.city ?? undefined,
      address: data.company.address ?? undefined,
      currency: data.company.account_currency ?? undefined,
    },
    membership: { role: data.membership.role_code, status: data.membership.status },
  };
}

/** Revokes the token on the server. */
export async function revokeToken(token: string): Promise<void> {
  await apiRequest("api/v1/b2b/auth/logout", { method: "POST", token, parse: () => undefined });
}
