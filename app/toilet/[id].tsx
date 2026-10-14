import { useLocalSearchParams } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import PhotoStrip from '@/components/PhotoStrip';
import PressableScale from '@/components/PressableScale';
import ReviewSection from '@/components/ReviewSection';
import SheetGrabber from '@/components/SheetGrabber';
import StatusBadge from '@/components/StatusBadge';
import { Text, useThemeColor } from '@/components/Themed';
import { emergencyRed } from '@/constants/Colors';
import { Radius, Space } from '@/constants/Typography';
import { accessLabel, feeLabel, formatDistance, formatHours, formatWalk, yesNoLabel } from '@/lib/format';
import { isOpenNow } from '@/lib/openingHours';
import { toiletStatus } from '@/lib/status';
import { useToilets } from '@/lib/ToiletsContext';
import type { Toilet } from '@/lib/types';

/**
 * Toilet details, shown as a bottom sheet over the map (see app/_layout.tsx).
 * The small detent shows the essentials and the directions button; drag up for photos and reviews.
 */
export default function ToiletSheet() {
  const { id, emergency } = useLocalSearchParams<{ id: string; emergency?: string }>();
  const { allNearby } = useToilets();
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  const toilet = allNearby.find((t) => t.id === id);
  if (!toilet) {
    return (
      <View style={styles.centered}>
        <Text type="callout" muted>
          This toilet isn’t nearby anymore.
        </Text>
      </View>
    );
  }

  const status = toiletStatus(toilet);
  const hoursUnknown = isOpenNow(toilet.openingHours) === null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SheetGrabber />
      {emergency === '1' && (
        <View style={[styles.banner, { backgroundColor: emergencyRed }]}>
          <Text type="headline" style={styles.bannerText}>
            🚨 Nearest free toilet
          </Text>
          {hoursUnknown && (
            <Text type="footnote" style={styles.bannerText}>
              Hours unknown, so it may be closed.
            </Text>
          )}
        </View>
      )}

      <View style={styles.titleBlock}>
        <Text type="title" numberOfLines={2}>
          {toilet.name}
        </Text>
        <View style={styles.metaRow}>
          <StatusBadge tone={status.tone} label={status.label} />
          <Text type="footnote" muted>
            {[formatDistance(toilet.distance), formatWalk(toilet.distance), feeLabel(toilet)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      <PressableScale
        onPress={() => openDirections(toilet)}
        accessibilityRole="button"
        style={[styles.directions, { backgroundColor: tint }]}>
        <Text type="headline" style={{ color: onTint }}>
          🚶 Walking directions
        </Text>
      </PressableScale>

      <PhotoStrip toiletId={toilet.id} />

      <View style={[styles.card, { backgroundColor: card }]}>
        <InfoRow label="Hours" value={formatHours(toilet.openingHours)} />
        <InfoRow label="Access" value={accessLabel(toilet)} />
        <InfoRow label="Wheelchair accessible" value={yesNoLabel(toilet.wheelchair)} />
        <InfoRow label="Changing table" value={yesNoLabel(toilet.changingTable)} />
        <InfoRow label="Gender-neutral" value={yesNoLabel(toilet.genderNeutral)} />
        <Text type="caption" muted>
          {toilet.source === 'osm' ? 'Data © OpenStreetMap contributors' : 'Added by a Peepal'}
        </Text>
      </View>

      <ReviewSection toiletId={toilet.id} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text type="callout" muted>
        {label}
      </Text>
      <Text type="callout" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function openDirections(t: Toilet) {
  const dest = `${t.latitude},${t.longitude}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${dest}&dirflg=w`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`,
  });
  Linking.openURL(url);
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
    paddingTop: Platform.OS === 'ios' ? Space.xl : Space.sm,
    gap: Space.lg,
    paddingBottom: Space.xl * 2,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  banner: { borderRadius: Radius.md, padding: Space.md, gap: 2 },
  bannerText: { color: '#fff' },
  titleBlock: { gap: Space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Space.sm },
  directions: { borderRadius: Radius.pill, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.md, padding: Space.lg, gap: Space.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.md },
  infoValue: { fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
