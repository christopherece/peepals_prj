import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';
import { Radius } from '@/constants/Typography';

/** A pulsing placeholder block. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const fill = useThemeColor({}, 'fill');
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: fill }, animated]} />;
}

/** Stand-in for a `ToiletRow` while toilets load. */
export function ToiletRowSkeleton() {
  const border = useThemeColor({}, 'border');
  return (
    <View style={[styles.row, { borderBottomColor: border }]}>
      <View style={styles.header}>
        <Skeleton width="55%" height={18} />
        <Skeleton width={48} height={16} />
      </View>
      <Skeleton width={96} height={22} radius={Radius.pill} />
      <Skeleton width="40%" height={12} />
    </View>
  );
}

export function ToiletListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <ToiletRowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
