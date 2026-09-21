import { z } from "zod";

export const passwordPolicy = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(72, "Password cannot exceed 72 characters")
  .refine((val) => /[a-zA-Z]/.test(val), "Password must contain at least one letter")
  .refine((val) => /[0-9]/.test(val), "Password must contain at least one number");

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
    password: passwordPolicy,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine(
    (data) => {
      const prefix = data.email.split("@")[0].toLowerCase();
      if (prefix.length >= 3 && data.password.toLowerCase().includes(prefix)) {
        return false;
      }
      return true;
    },
    {
      message: "Password must not contain your email username",
      path: ["password"],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  remember_me: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: passwordPolicy,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: passwordPolicy,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
