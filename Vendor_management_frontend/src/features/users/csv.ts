import { ROLE_LABELS } from '@/constants/roleLabels';
import type { AppUser } from '@/features/users/types';
import { toCsv } from '@/utils/csvExport';

const HEADERS = ['Name', 'Email', 'Phone', 'Role', 'Department', 'Status', 'Created At'];

export function buildUsersCsv(users: AppUser[]): string {
  const rows = users.map((u) => [
    u.name,
    u.email,
    u.phone ?? '',
    ROLE_LABELS[u.role],
    u.departmentName,
    u.isActive ? 'Active' : 'Inactive',
    new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  ]);
  return toCsv(HEADERS, rows);
}
