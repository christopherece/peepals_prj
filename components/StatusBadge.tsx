import { StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Radius } from '@/constants/Typography';
import type { StatusTone } from '@/lib/status';

/** Colored pill for a status (open / customers-only / closed / unknown) or any toned label. */
export default function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const color = useThemeColor({}, tone);
  const background = useThemeColor({}, `${tone}Soft`);

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text type="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
