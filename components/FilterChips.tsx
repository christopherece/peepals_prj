import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { useToilets } from '@/lib/ToiletsContext';
import type { Filters } from '@/lib/types';

const CHIPS: { key: keyof Filters; label: string }[] = [
  { key: 'openNow', label: 'Open now' },
  { key: 'free', label: 'Free' },
  { key: 'accessible', label: '♿ Accessible' },
  { key: 'changingTable', label: '👶 Changing table' },
  { key: 'genderNeutral', label: 'Gender-neutral' },
];

export default function FilterChips() {
  const { filters, setFilters } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {CHIPS.map(({ key, label }) => {
        const active = filters[key];
        return (
          <Pressable
            key={key}
            accessibilityRole="switch"
            accessibilityState={{ checked: active }}
            onPress={() => setFilters({ ...filters, [key]: !active })}
            style={[
              styles.chip,
              { backgroundColor: active ? tint : card, borderColor: active ? tint : border },
            ]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Without this, a horizontal ScrollView in a column stretches to fill spare height when the list below is short.
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  activeLabel: { color: '#fff' },
});
