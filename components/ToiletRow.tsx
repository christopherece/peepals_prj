import { Pressable, StyleSheet, View } from 'react-native';

import StatusBadge from '@/components/StatusBadge';
import { Text, useThemeColor } from '@/components/Themed';
import { Space } from '@/constants/Typography';
import { feeLabel, formatDistance, formatWalk, ratingSummary } from '@/lib/format';
import { toiletStatus } from '@/lib/status';
import type { NearbyToilet, Review } from '@/lib/types';

type Props = {
  toilet: NearbyToilet;
  reviews: Review[];
  onPress: () => void;
};

export default function ToiletRow({ toilet, reviews, onPress }: Props) {
  const border = useThemeColor({}, 'border');
  const fill = useThemeColor({}, 'fill');
  const star = useThemeColor({}, 'star');
  const status = toiletStatus(toilet);
  const rating = ratingSummary(reviews);
  const extras = [feeLabel(toilet), toilet.wheelchair && '♿', toilet.changingTable && '👶'].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: border }, pressed && { backgroundColor: fill }]}>
      <View style={styles.header}>
        <Text type="headline" numberOfLines={1} style={styles.name}>
          {toilet.name}
        </Text>
        <View style={styles.distance}>
          <Text type="subhead" numberOfLines={1}>
            {formatDistance(toilet.distance)}
          </Text>
          <Text type="caption" muted numberOfLines={1}>
            {formatWalk(toilet.distance)}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <StatusBadge tone={status.tone} label={status.label} />
        <Text type="footnote" muted>
          {extras.join(' · ')}
        </Text>
      </View>
      <Text type="footnote" muted>
        {rating ? (
          <>
            <Text type="footnote" style={{ color: star }}>
              ★
            </Text>
            {` ${rating.average.toFixed(1)} · ${rating.count} review${rating.count === 1 ? '' : 's'}`}
          </>
        ) : (
          'No reviews yet'
        )}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: Space.lg, paddingVertical: 14, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.md },
  name: { flexShrink: 1 },
  distance: { alignItems: 'flex-end', flexShrink: 0, minWidth: 72 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});
