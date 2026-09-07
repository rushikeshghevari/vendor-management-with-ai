import { z } from 'zod';

// The requester only says what's needed and how much — unit/rate/title/budget/date are all
// decided later (during quotation collection) or auto-derived server-side. See
// requirement.service.ts's create() for the defaulting logic this mirrors.
export const requirementItemSchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
});

export const requirementSchema = z.object({
  items: z.array(requirementItemSchema).min(1, 'Add at least one item'),
  targetDepartment: z.string().optional(),
  // Left blank means "server decides" — requirement.service.ts defaults to 30 days out.
  requiredDate: z.string().optional(),
});

export type RequirementItemFormValues = z.infer<typeof requirementItemSchema>;
export type RequirementFormValues = z.infer<typeof requirementSchema>;
