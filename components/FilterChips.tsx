import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { useToilets } from '@/lib/ToiletsContext';
import type { Filters } from '@/lib/types';

const CHIPS: { key: keyof Filters; label: string }[] = [
  { key: 'openNow', label: 'Open now' },
  { key: 'free', label: 'Free' },
  { key: 'accessible', label: '♿ Accessible' },
  { key: 'changingTable', label: '👶 Changing table' },
  { key: 'genderNeutral', label: 'Gender-neutral' },
];

/** `floating`: shadowed chips for use over the map instead of on a plain background. */
export default function FilterChips({ floating = false }: { floating?: boolean }) {
  const { filters, setFilters } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const card = useThemeColor({}, floating ? 'elevated' : 'card');
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
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setFilters({ ...filters, [key]: !active });
            }}
            style={({ pressed }) => [
              styles.chip,
              floating && styles.floating,
              {
                backgroundColor: active ? tint : card,
                borderColor: active ? tint : border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text type="subhead" style={active && { color: onTint }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView otherwise grows to fill a column layout.
  scroll: { flexGrow: 0 },
  row: { gap: Space.sm, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
