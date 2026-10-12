import { z } from "zod";
// Provisional UI constraints; the future Laravel policy must be authoritative.
export const passwordLimits = { minLength: 8, maxLength: 128 } as const;
export const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
});
export const otpSchema = z.string().regex(/^\d{4}$/, "Enter all four digits.");
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Enter your new password.")
      .min(passwordLimits.minLength, "Use at least 8 characters.")
      .max(passwordLimits.maxLength, "Use no more than 128 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
