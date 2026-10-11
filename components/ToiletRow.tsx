import { Pressable, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { emergencyRed, openGreen } from '@/constants/Colors';
import { accessLabel, feeLabel, formatDistance, openLabel, ratingSummary } from '@/lib/format';
import { isOpenNow } from '@/lib/openingHours';
import type { NearbyToilet, Review } from '@/lib/types';

type Props = {
  toilet: NearbyToilet;
  reviews: Review[];
  onPress: () => void;
};

export default function ToiletRow({ toilet, reviews, onPress }: Props) {
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const open = isOpenNow(toilet.openingHours);
  const rating = ratingSummary(reviews);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.row, { borderBottomColor: border }]}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {toilet.name}
          </Text>
          <Text style={styles.distance}>{formatDistance(toilet.distance)}</Text>
        </View>
        <Text style={{ color: muted }}>
          <Text style={{ color: open === true ? openGreen : open === false ? emergencyRed : muted }}>
            {openLabel(open)}
          </Text>
          {` · ${feeLabel(toilet)} · ${accessLabel(toilet)}`}
          {toilet.wheelchair ? ' · ♿' : ''}
          {toilet.changingTable ? ' · 👶' : ''}
        </Text>
        <Text style={{ color: muted }}>
          {rating ? `★ ${rating.average.toFixed(1)} (${rating.count})` : 'No reviews yet'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  distance: { fontSize: 15, fontWeight: '500' },
});
