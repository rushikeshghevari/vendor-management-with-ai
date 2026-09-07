import { useEffect } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { DrawerContent } from '@/components/layout/DrawerContent';
import { DRAWER_WIDTH, useDrawer } from '@/navigation/context/DrawerContext';

interface DrawerShellProps {
  children: React.ReactNode;
}

/**
 * Wraps any tab navigator in the shared drawer overlay (backdrop + sliding panel).
 * Must be a descendant of DrawerProvider.
 */
export function DrawerShell({ children }: DrawerShellProps) {
  const drawer = useDrawer();

  useEffect(() => {
    if (!drawer?.isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      drawer.closeDrawer();
      return true;
    });
    return () => sub.remove();
  }, [drawer?.isOpen, drawer?.closeDrawer]);

  if (!drawer) return <>{children}</>;

  const { isOpen, closeDrawer, translateX, backdropOpacity } = drawer;

  return (
    <View style={styles.root}>
      {children}

      {/* Backdrop — always rendered; pointer-events controlled by isOpen */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Drawer panel — always rendered, slides off-screen at −DRAWER_WIDTH when closed.
          Hidden from the accessibility tree while closed so it doesn't shadow elements in
          the main content (e.g. a notification bell with the same accessibilityLabel). */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
        accessibilityElementsHidden={!isOpen}
        importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
      >
        <DrawerContent />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
});
