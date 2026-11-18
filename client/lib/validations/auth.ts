import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores and hyphens"
  );

export const registerApiSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const profileUpdateSchema = z.object({
  avatar: z.number().min(1).max(7).optional(),
  username: usernameSchema.optional(),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").optional(),
  phoneNumber: z.string().trim().regex(/^\d{10}$/, "Phone number must be 10 digits").optional(),
  college: z.string().trim().min(2, "College name is too short").optional(),
  stream: z.string().trim().min(2, "Stream name is too short").optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** First field error as one readable sentence. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input. Please check your details and try again.";
}
