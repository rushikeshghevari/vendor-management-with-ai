import type { Role } from '@/constants/roles';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}
