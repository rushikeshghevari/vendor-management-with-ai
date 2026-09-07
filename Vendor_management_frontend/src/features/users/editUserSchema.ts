import { z } from 'zod';

import { ALL_ROLES, ROLES, type Role } from '@/constants/roles';

export const editUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name is required'),
    phone: z
      .string()
      .trim()
      .min(7, 'Enter a valid mobile number')
      .regex(/^[0-9+\s-]+$/, 'Enter a valid mobile number')
      .optional()
      .or(z.literal('')),
    role: z.enum(ALL_ROLES as [Role, ...Role[]], { message: 'Select a role' }),
    departmentId: z.string().optional(),
    status: z.enum(['active', 'inactive']),
  })
  .refine((data) => data.role !== ROLES.DEPARTMENT_USER || Boolean(data.departmentId), {
    message: 'Department is required for the Department User role',
    path: ['departmentId'],
  });

export type EditUserFormValues = z.infer<typeof editUserSchema>;
