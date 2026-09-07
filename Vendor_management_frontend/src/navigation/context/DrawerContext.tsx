import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

export const DRAWER_WIDTH = Math.min(Math.round(Dimensions.get('window').width * 0.82), 320);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTabNav = { navigate: (name: any, params?: any) => void };

interface DrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  translateX: Animated.Value;
  backdropOpacity: Animated.Value;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Call this from any tab screen on every render to keep the ref up to date. */
  setTabNavigation: (nav: AnyTabNav) => void;
  /** Navigate within the tab navigator this drawer controls. */
  navigateToTab: (tab: string, params?: Record<string, unknown>) => void;
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

/** Returns null when called outside a DrawerProvider (no drawer for this navigator). */
export function useDrawer(): DrawerContextValue | null {
  return useContext(DrawerContext);
}

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const tabNavRef = useRef<AnyTabNav | null>(null);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        overshootClamping: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.58,
        duration: 270,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, backdropOpacity]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -DRAWER_WIDTH,
        useNativeDriver: true,
        damping: 22,
        stiffness: 280,
        overshootClamping: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  }, [translateX, backdropOpacity]);

  const setTabNavigation = useCallback((nav: AnyTabNav) => {
    tabNavRef.current = nav;
  }, []);

  const navigateToTab = useCallback(
    (tab: string, params?: Record<string, unknown>) => {
      if (tabNavRef.current) {
        tabNavRef.current.navigate(tab, params);
      }
    },
    [],
  );

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        openDrawer,
        closeDrawer,
        translateX,
        backdropOpacity,
        activeTab,
        setActiveTab,
        setTabNavigation,
        navigateToTab,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}
