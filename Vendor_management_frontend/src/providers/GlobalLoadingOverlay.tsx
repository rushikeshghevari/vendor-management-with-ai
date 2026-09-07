import { Loader } from '@/components/ui/Loader';
import { useAppSelector } from '@/hooks/useAppSelector';

/** Renders a fullscreen spinner whenever ui.globalLoading is toggled on, e.g. during app bootstrap. */
export function GlobalLoadingOverlay() {
  const globalLoading = useAppSelector((state) => state.ui.globalLoading);

  if (!globalLoading) return null;

  return <Loader fullscreen />;
}
