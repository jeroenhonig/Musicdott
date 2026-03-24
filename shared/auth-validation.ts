import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must be less than 50 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const securePasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const authRoleSchema = z.enum([
  "platform_owner",
  "school_owner",
  "teacher",
  "student",
]);

export const loginCredentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const ownerLoginSchema = loginCredentialsSchema;

export const registerUserSchema = z.object({
  username: usernameSchema,
  password: securePasswordSchema,
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  role: authRoleSchema.default("student"),
  schoolName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  phone: z.string().optional(),
  description: z.string().optional(),
  bio: z.string().optional(),
  instruments: z.string().optional(),
  studentCode: z.string().optional(),
  schoolCode: z.string().optional(),
});

export const passwordChangeRequestSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: securePasswordSchema,
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
export type OwnerLoginData = z.infer<typeof ownerLoginSchema>;
export type RegisterUserData = z.infer<typeof registerUserSchema>;
export type PasswordChangeRequestData = z.infer<typeof passwordChangeRequestSchema>;
