import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

export type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: BrandLogoSize;
  style?: StyleProp<ImageStyle>;
}

const SIZE_STYLES: Record<BrandLogoSize, { width: number; height: number }> = {
  sm: { width: 120, height: 42 },
  md: { width: 200, height: 70 },
  lg: { width: 280, height: 98 },
};

/**
 * Genericart logo, loaded from disk — this is the single place that requires the
 * asset, so AuthHeader/SplashScreen/etc. never need to know the file path.
 *
 * Asset location: mobile/assets/images/logo.png
 * Drop the real exported PNG/SVG-as-PNG at that exact path (overwrite the file) —
 * no code changes are needed anywhere else when you do.
 */
export function BrandLogo({ size = 'md', style }: BrandLogoProps) {
  const { scheme } = useTheme();
  const tintColorStyle = scheme === 'dark' ? { tintColor: '#ffffff' as const } : null;

  return (
    <Image
      source={require('../../../assets/images/logo.png')}
      accessibilityRole="image"
      accessibilityLabel="Genericart Medicine Store logo"
      resizeMode="contain"
      style={[SIZE_STYLES[size], tintColorStyle, style]}
    />
  );
}
