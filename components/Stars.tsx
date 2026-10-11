import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { unknownAmber } from '@/constants/Colors';

type Props = {
  value: number;
  /** Omit to render read-only stars. */
  onChange?: (value: number) => void;
  size?: number;
};

export default function Stars({ value, onChange, size = 28 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Text style={{ fontSize: size, color: n <= Math.round(value) ? unknownAmber : '#CBD5E1' }}>★</Text>
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n} stars`}>
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
