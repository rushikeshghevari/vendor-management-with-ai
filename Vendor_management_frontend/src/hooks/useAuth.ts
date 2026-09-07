import type { Role } from '@/constants/roles';
import { useAppSelector } from '@/hooks/useAppSelector';

export function useAuth() {
  const { user, isAuthenticated, isBootstrapping } = useAppSelector((state) => state.auth);

  const hasRole = (...roles: Role[]): boolean => Boolean(user && roles.includes(user.role));

  return { user, isAuthenticated, isBootstrapping, hasRole };
}
