import { z } from 'zod';

import { ALL_ROLES, ROLES, type Role } from '@/constants/roles';

export const createUserSchema = z
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
    role: z.enum(ALL_ROLES as [Role, ...Role[]], { message: 'Select a role' }),
    departmentId: z.string().optional(),
    status: z.enum(['active', 'inactive']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.role !== ROLES.DEPARTMENT_USER || Boolean(data.departmentId), {
    message: 'Department is required for the Department User role',
    path: ['departmentId'],
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
