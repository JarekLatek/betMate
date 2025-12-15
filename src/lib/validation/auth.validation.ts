import { z } from "zod";

/**
 * Base schema for authentication with email and password
 */
const baseAuthSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
});

/**
 * Schema for login form validation
 * Only requires email and password
 */
export const loginSchema = baseAuthSchema;

/**
 * Schema for registration form validation
 * Requires email, password, and username
 */
export const registerSchema = baseAuthSchema.extend({
  username: z.string().min(3, "Nazwa użytkownika musi mieć minimum 3 znaki"),
});

/**
 * Type for login form values
 */
export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Type for registration form values
 */
export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Union type for auth form values (can be either login or register)
 */
export type AuthFormValues = LoginFormValues | RegisterFormValues;

/**
 * Auth mode type - determines whether form is in login or register mode
 */
export type AuthMode = "login" | "register";

/**
 * Schema for forgot password form validation
 * Only requires email
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

/**
 * Type for forgot password form values
 */
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema for reset password form validation
 * Requires password and confirmPassword with matching validation
 */
export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

/**
 * Type for reset password form values
 */
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
