import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { unknownAmber } from '@/constants/Colors';

type Props = {
  value: number;
  /** Omit to render read-only stars. */
  onChange?: (value: number) => void;
  size?: number;
  /** What is being rated, for screen readers, e.g. "Cleanliness". */
  label?: string;
};

export default function Stars({ value, onChange, size = 28, label }: Props) {
  const prefix = label ? `${label}: ` : '';
  const summary = `${prefix}${value > 0 ? `${Math.round(value)} of 5 stars` : 'not rated'}`;
  return (
    <View style={styles.row} accessible={!onChange} accessibilityLabel={onChange ? undefined : summary}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Text style={{ fontSize: size, color: n <= Math.round(value) ? unknownAmber : '#CBD5E1' }}>★</Text>
        );
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: n === Math.round(value) }}
            accessibilityLabel={`${prefix}${n} ${n === 1 ? 'star' : 'stars'}`}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
