import { z } from "zod";
import { apiRequest } from "@/lib/api/client";

/*
 * Request contracts: "Royal travel" OpenAPI 1.0.0 (login, verify-otp, me with bearerAuth). The OpenAPI
 * file documents no response bodies, so the response schemas below are unconfirmed by that document.
 * Logout is not in the OpenAPI file; staging routes it (POST only).
 */

const CHANNEL = "website";


const tokenSchema = z.object({
  token_type: z.literal("Bearer"),
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  company_id: z.uuid(),
  user: z.object({ id: z.union([z.number(), z.string()]), name: z.string(), email: z.string() }),
});

const profileSchema = z.object({
  data: z.object({
    user: z.object({ id: z.union([z.number(), z.string()]), name: z.string(), email: z.string(), phone: z.string().nullable().optional().catch(null) }),
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
  user: { id: string; name: string; email: string; phone?: string };
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

/** Login returns a Bearer token directly after account activation. */
export async function loginWithPassword(input: { email: string; password: string; companyId: string }): Promise<IssuedToken> {
  const data = await apiRequest("api/v1/b2b/auth/login", {
    method: "POST",
    body: { email: input.email, password: input.password, company_id: input.companyId, channel: CHANNEL },
    parse: (value) => tokenSchema.parse(value),
  });
  return { token: data.access_token, expiresInSeconds: data.expires_in, companyId: data.company_id };
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

/*
 * Account activation: a one-time email check for a company owner after admin approval, before the
 * first sign-in. It never issues a token or starts a session. Contract from the backend handoff
 * (2026-11-17): verify replies {message, status: "active"}; resend's reply body isn't specified, so
 * any 2xx is read as "the request was accepted", not as "the email was delivered".
 */
const activatedSchema = z.object({ status: z.literal("active") });

/** Verifies the emailed activation code. Resolves only when the server says the account is active. */
export async function verifyActivationCode(input: { email: string; companyId: string; code: string }): Promise<void> {
  await apiRequest("api/v1/b2b/auth/verify-otp", {
    method: "POST",
    body: { email: input.email, company_id: input.companyId, otp: input.code },
    parse: (value) => activatedSchema.parse(value),
  });
}

/** Asks the server to send a new activation code. Says nothing about delivery. */
export async function resendActivationCode(input: { email: string; companyId: string }): Promise<void> {
  await apiRequest("api/v1/b2b/auth/resend-verification-otp", {
    method: "POST",
    body: { email: input.email, company_id: input.companyId },
    parse: () => undefined,
  });
}

export async function fetchCurrentUser(token: string): Promise<B2BIdentity> {
  const { data } = await apiRequest("api/v1/b2b/me", { token, parse: (value) => profileSchema.parse(value) });
  return {
    user: { id: String(data.user.id), name: data.user.name, email: data.user.email, phone: data.user.phone ?? undefined },
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

/**
 * PATCH /api/v1/b2b/me: updates the signed-in user's own name and phone. The API accepts only these
 * two fields (company details aren't editable here) and needs at least one. The reply body isn't relied
 * on: callers reload the profile from GET /me afterwards.
 */
export async function updateCurrentUser(token: string, changes: { name?: string; phone?: string }): Promise<void> {
  await apiRequest("api/v1/b2b/me", { method: "PATCH", token, body: changes, parse: () => undefined });
}

/** Revokes the token on the server. */
export async function revokeToken(token: string): Promise<void> {
  await apiRequest("api/v1/b2b/auth/logout", { method: "POST", token, parse: () => undefined });
}
