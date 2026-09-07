import { z } from 'zod';

export const hodEditUserSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid mobile number')
    .regex(/^[0-9+\s-]+$/, 'Enter a valid mobile number')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive']),
});

export type HodEditUserFormValues = z.infer<typeof hodEditUserSchema>;
