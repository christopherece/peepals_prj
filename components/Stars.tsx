import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';

type Props = {
  value: number;
  /** Omit to render read-only stars. */
  onChange?: (value: number) => void;
  size?: number;
  /** Accessible name of the rating, e.g. "Cleanliness". */
  label?: string;
};

/** 1–5 star rating bar. Interactive when `onChange` is given: tap a star to set the rating. */
export default function Stars({ value, onChange, size = 28, label = 'Rating' }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'adjustable' : 'text'}
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 5, now: Math.round(value) }}
      accessibilityActions={onChange ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(e) => {
        if (!onChange) return;
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, value + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(value)} size={size} onPress={onChange && (() => onChange(n))} />
      ))}
    </View>
  );
}

function Star({ filled, size, onPress }: { filled: boolean; size: number; onPress?: () => void }) {
  const on = useThemeColor({}, 'star');
  const off = useThemeColor({}, 'starOff');
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  // Pop when a star turns on.
  useEffect(() => {
    if (filled && onPress) scale.set(withSequence(withSpring(1.25, { stiffness: 600 }), withSpring(1)));
  }, [filled, onPress, scale]);

  const star = (
    <Animated.Text style={[{ fontSize: size, lineHeight: size * 1.15, color: filled ? on : off }, animated]}>
      ★
    </Animated.Text>
  );
  if (!onPress) return star;
  return (
    <Pressable
      hitSlop={4}
      importantForAccessibility="no"
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        onPress();
      }}>
      {star}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
