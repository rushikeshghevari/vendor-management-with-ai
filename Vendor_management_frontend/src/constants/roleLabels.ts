import { ROLES, type Role } from '@/constants/roles';

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.HOD]: 'HOD',
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.CEO]: 'CEO',
  [ROLES.DEPARTMENT_USER]: 'Department User',
  [ROLES.ACCOUNTS]: 'Accounts',
  [ROLES.PAYMENT_DEPARTMENT]: 'Payment Department',
};
