import { z } from 'zod';

/** How this department's HOD is set up when the form is submitted in "add" mode.
 *  "none" — no HOD assigned yet (Super Admin can assign one later from Department Details). */
export const HOD_ASSIGNMENT_MODES = ['none', 'create', 'assign'] as const;
export type HodAssignmentMode = (typeof HOD_ASSIGNMENT_MODES)[number];

export const departmentSchema = z
  .object({
    name: z.string().trim().min(2, 'Department name is required'),
    code: z
      .string()
      .trim()
      .min(2, 'Department code is required')
      .regex(/^[A-Z0-9-]+$/i, 'Use letters, numbers, and dashes only'),
    description: z.string().trim().min(5, 'Description is required'),
    departmentHead: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']),
    hodAssignmentMode: z.enum(HOD_ASSIGNMENT_MODES),
    newHodName: z.string().trim().optional(),
    newHodEmail: z.string().trim().optional(),
    newHodPhone: z.string().trim().optional(),
    newHodPassword: z.string().optional(),
    existingHodId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hodAssignmentMode === 'create') {
      if (!data.newHodName || data.newHodName.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['newHodName'], message: 'HOD name is required' });
      }
      if (!data.newHodEmail || !z.string().email().safeParse(data.newHodEmail).success) {
        ctx.addIssue({ code: 'custom', path: ['newHodEmail'], message: 'Enter a valid HOD email' });
      }
      if (!data.newHodPassword || data.newHodPassword.length < 8) {
        ctx.addIssue({ code: 'custom', path: ['newHodPassword'], message: 'Password must be at least 8 characters' });
      }
    }
    if (data.hodAssignmentMode === 'assign' && !data.existingHodId) {
      ctx.addIssue({ code: 'custom', path: ['existingHodId'], message: 'Select an HOD to assign' });
    }
  });

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
