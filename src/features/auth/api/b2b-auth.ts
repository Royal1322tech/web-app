import { apiBaseUrl, ApiError } from "@/lib/api/client";

type LoginResponse = {
  message: string;
  challenge_id: string;
  expires_in: number;
};

type VerifyResponse = {
  message: string;
  token_type: "Bearer";
  access_token: string;
  expires_in: number;
  company_id: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

async function postJson<T>(
  endpoint: string,
  payload: Record<string, string>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(new URL(endpoint, apiBaseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    credentials: "omit",
  });

  if (!response.ok) throw new ApiError(response.status);

  return response.json() as Promise<T>;
}

export const b2bAuthApi = {
  login(email: string, password: string, companyId: string) {
    return postJson<LoginResponse>("api/v1/b2b/auth/login", {
      email,
      password,
      company_id: companyId,
      channel: "website",
    });
  },

  verifyOtp(challengeId: string, otp: string) {
    return postJson<VerifyResponse>("api/v1/b2b/auth/verify-otp", {
      challenge_id: challengeId,
      otp,
      channel: "website",
    });
  },

  logout(token: string) {
    return postJson<{ message: string }>(
      "api/v1/b2b/auth/logout",
      {},
      token,
    );
  },
};

export type B2BProfile = Record<string, unknown>;

export async function getB2BProfile(
  token: string,
): Promise<B2BProfile> {
  const response = await fetch(
    new URL("api/v1/b2b/me", apiBaseUrl),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "omit",
    },
  );

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json() as Promise<B2BProfile>;
}
