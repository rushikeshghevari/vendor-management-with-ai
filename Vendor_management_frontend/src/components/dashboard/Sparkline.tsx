import React, { useMemo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

/**
 * Premium vector Sparkline line chart.
 * Renders a tiny waving line with a fading vertical gradient.
 */
export function Sparkline({
  data,
  color = '#10b981',
  width = 65,
  height = 24,
}: SparklineProps) {
  // Safe fallback if data is empty or single-point
  const points = useMemo(() => {
    if (!data || data.length === 0) return [10, 10, 10, 10, 10];
    if (data.length === 1) return [data[0]!, data[0]!, data[0]!];
    return data;
  }, [data]);

  const gradientId = useMemo(() => `spark-grad-${Math.random().toString(36).substring(2, 9)}`, []);

  // Compute boundaries
  const { min, max } = useMemo(() => {
    let minVal = points[0]!;
    let maxVal = points[0]!;
    for (const val of points) {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    return { min: minVal, max: maxVal };
  }, [points]);

  const pathData = useMemo(() => {
    const padding = 2; // Prevent clipping at edges
    const usableHeight = height - padding * 2;
    const valueRange = max - min || 1;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = padding + usableHeight - ((val - min) / valueRange) * usableHeight;
      return { x, y };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

    return { linePath, areaPath };
  }, [points, min, max, width, height]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </LinearGradient>
      </Defs>

      {/* Filled Area under line */}
      <Path d={pathData.areaPath} fill={`url(#${gradientId})`} />

      {/* Stroke Line */}
      <Path d={pathData.linePath} fill="transparent" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
