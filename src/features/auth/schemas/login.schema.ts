import { z } from "zod";

export const loginSchema = z.object({
  username: z.email("Enter a valid email.").trim(),
  password: z.string().min(1, "Enter your password."),
});

export type LoginValues = z.infer<typeof loginSchema>;
