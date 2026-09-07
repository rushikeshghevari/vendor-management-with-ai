import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

interface ScoreGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

/** Green ≥95 (Approve), amber 80-94 (Review manually), red <80 (Approval discouraged) —
 *  matches the Director decision-guidance thresholds, not the generic 85/65 AI-card split. */
function bandColor(value: number): string {
  if (value >= 95) return '#059669';
  if (value >= 80) return '#D97706';
  return '#DC2626';
}

/** Dependency-free "animated gauge": a ring that scales/fades in on mount while the
 *  percentage counts up — no react-native-svg in this project, so no true arc fill. */
export function ScoreGauge({ value, size = 96, label = 'Overall Match' }: ScoreGaugeProps) {
  const color = bandColor(value);
  const anim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const listener = anim.addListener(({ value: v }) => setDisplayValue(Math.round(v * value)));
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }).start();
    return () => anim.removeListener(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const opacity = anim;
  const borderWidth = Math.max(5, Math.round(size * 0.07));

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
        opacity,
      }}
    >
      <Text style={{ fontSize: size * 0.24, fontWeight: '800', color }}>{displayValue}%</Text>
      <Text style={{ fontSize: size * 0.1, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

export function recommendationBandCopy(band: 'green' | 'warning' | 'red' | null): {
  label: string;
  color: string;
  bg: string;
} {
  if (band === 'green') return { label: 'AI recommends: Approve', color: '#059669', bg: '#ECFDF5' };
  if (band === 'warning') return { label: 'Review manually before deciding', color: '#D97706', bg: '#FFFBEB' };
  if (band === 'red') return { label: 'Approval discouraged — high risk', color: '#DC2626', bg: '#FEF2F2' };
  return { label: 'AI verification not yet available', color: '#6B7280', bg: '#F3F4F6' };
}
