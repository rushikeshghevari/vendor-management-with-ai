import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/layout/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/hooks/useAuth';
import { useDrawer } from '@/navigation/context/DrawerContext';

interface ComingSoonScreenProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Placeholder destination for tabs whose module hasn't been built yet. */
export function ComingSoonScreen({ title, icon }: ComingSoonScreenProps) {
  const drawer = useDrawer();
  const { user } = useAuth();
  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'U';
  return (
    <Screen padded={false}>
      <AppHeader
        title={title}
        rightSlot={drawer ? <Avatar initials={initials} size={32} online onPress={() => drawer.openDrawer()} /> : null}
      />
      <Ionicons name={icon} size={48} color="#cbd5e1" style={{ alignSelf: 'center', marginTop: 64 }} />
      <EmptyState title={`${title} coming soon`} description="This module hasn't been built yet." />
    </Screen>
  );
}
