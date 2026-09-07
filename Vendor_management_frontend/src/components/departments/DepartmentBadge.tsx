import { Badge } from '@/components/ui/Badge';

interface DepartmentBadgeProps {
  isActive: boolean;
}

export function DepartmentBadge({ isActive }: DepartmentBadgeProps) {
  return <Badge label={isActive ? 'Active' : 'Inactive'} variant={isActive ? 'success' : 'neutral'} />;
}
