import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Sparkline } from '@/components/dashboard/Sparkline';

interface SparklineRowProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  trendData: number[];
  color?: string;
  onPress?: () => void;
}

/**
 * Reusable minimalist stats list row containing an integrated vector Sparkline chart.
 * Replaces bulky summary boxes with a premium, space-saving Bloomberg-style design.
 */
export function SparklineRow({
  title,
  subtitle,
  value,
  icon,
  iconColor = '#475569',
  iconBg = '#f1f5f9',
  trendData,
  color = '#10b981',
  onPress,
}: SparklineRowProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className="flex-row items-center justify-between py-3 border-b border-slate-100/60 dark:border-slate-800/40"
    >
      <View className="flex-row items-center flex-1 pr-4">
        {/* Left Icon Badge */}
        <View
          style={{ backgroundColor: iconBg }}
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
        >
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>

        {/* Center Titles */}
        <View className="flex-col flex-1 pr-2">
          <Text className="text-xs font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Sparkline Graphic Column */}
      <View className="mr-6 items-center justify-center">
        <Sparkline data={trendData} color={color} width={55} height={18} />
      </View>

      {/* Right Value & Chevron */}
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
      </View>
    </AnimatedPressable>
  );
}
