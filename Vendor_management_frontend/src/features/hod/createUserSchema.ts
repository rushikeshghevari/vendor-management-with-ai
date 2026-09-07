import { z } from 'zod';

export const hodCreateUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(7, 'Enter a valid mobile number')
      .regex(/^[0-9+\s-]+$/, 'Enter a valid mobile number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
    status: z.enum(['active', 'inactive']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type HodCreateUserFormValues = z.infer<typeof hodCreateUserSchema>;
