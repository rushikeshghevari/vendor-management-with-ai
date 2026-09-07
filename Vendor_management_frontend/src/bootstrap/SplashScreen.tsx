import '@/theme/safeAreaInterop';

import { useEffect, useRef } from 'react';
import { Animated, ImageBackground } from 'react-native';

interface SplashScreenProps {
  /** Controls the fade animation: true fades the splash in, false fades it out. */
  visible: boolean;
  /** Called once the fade-out animation has finished. */
  onHidden?: () => void;
}

/** Branded splash shown while the app bootstraps (session restore, etc.). */
export function SplashScreen({ visible, onHidden }: SplashScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        onHidden?.();
      }
    });
  }, [visible, opacity, onHidden]);

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      <ImageBackground
        source={require('../../assets/images/SplashScreen.png')}
        resizeMode="cover"
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}
