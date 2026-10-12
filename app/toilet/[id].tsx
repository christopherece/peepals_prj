import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput } from 'react-native';

import Stars from '@/components/Stars';
import { Text, View, useThemeColor } from '@/components/Themed';
import { emergencyRed, openGreen } from '@/constants/Colors';
import {
  accessLabel,
  feeLabel,
  formatDistance,
  formatWalk,
  openLabel,
  ratingSummary,
  yesNoLabel,
} from '@/lib/format';
import { isOpenNow } from '@/lib/openingHours';
import { useToilets } from '@/lib/ToiletsContext';
import type { Review, Toilet } from '@/lib/types';

const NO_REVIEWS: Review[] = [];

export default function ToiletScreen() {
  const { id, emergency } = useLocalSearchParams<{ id: string; emergency?: string }>();
  const { allNearby, reviewsByToilet, profile, status } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');

  const toilet = allNearby.find((t) => t.id === id);
  if (!toilet) {
    const loading = status === 'locating' || status === 'loading';
    return (
      <View style={styles.centered}>
        {loading ? <ActivityIndicator /> : <Text>This toilet isn’t nearby anymore.</Text>}
      </View>
    );
  }

  const open = isOpenNow(toilet.openingHours);
  const toiletReviews = reviewsByToilet.get(toilet.id) ?? NO_REVIEWS;
  const myReview = toiletReviews.find((r) => r.userId === profile?.id);
  const rating = ratingSummary(toiletReviews);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: toilet.name,
          headerRight: () => (
            <Pressable onPress={() => shareToilet(toilet)} accessibilityRole="button" hitSlop={8}>
              {({ pressed }) => (
                <Text style={{ color: tint, fontSize: 16, fontWeight: '600', opacity: pressed ? 0.5 : 1 }}>Share</Text>
              )}
            </Pressable>
          ),
        }}
      />

      {emergency === '1' && (
        <View style={[styles.banner, { backgroundColor: emergencyRed }]}>
          <Text style={styles.bannerTitle}>Nearest free toilet</Text>
          <Text style={styles.bannerText}>
            {formatDistance(toilet.distance)} · {formatWalk(toilet.distance)}
            {open === null ? ' · hours unknown, may be closed' : ''}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => openDirections(toilet)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.directions, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}>
        <Text style={styles.directionsText}>🚶 Walking directions</Text>
      </Pressable>

      <View style={[styles.card, { backgroundColor: card }]}>
        <InfoRow label="Status" value={openLabel(open)} color={open === true ? openGreen : open === false ? emergencyRed : undefined} />
        <InfoRow label="Hours" value={toilet.openingHours ?? 'Unknown'} />
        <InfoRow label="Cost" value={feeLabel(toilet)} />
        <InfoRow label="Access" value={accessLabel(toilet)} />
        <InfoRow label="Wheelchair accessible" value={yesNoLabel(toilet.wheelchair)} />
        <InfoRow label="Changing table" value={yesNoLabel(toilet.changingTable)} />
        <InfoRow label="Gender-neutral" value={yesNoLabel(toilet.genderNeutral)} />
        <InfoRow
          label="Distance"
          value={toilet.distance == null ? 'Unknown' : `${formatDistance(toilet.distance)} · ${formatWalk(toilet.distance)}`}
        />
        <Text style={[styles.source, { color: muted }]}>
          {toilet.source === 'osm' ? 'Data © OpenStreetMap contributors' : 'Added by a Peepal'}
        </Text>
      </View>

      <Text style={styles.heading}>
        Reviews {rating ? `· ★ ${rating.average.toFixed(1)} (${rating.count})` : ''}
      </Text>
      {/* Keyed so the form re-fills whenever your saved review changes (posted, edited or deleted). */}
      <ReviewForm key={myReview ? `${myReview.id}-${myReview.createdAt}` : 'new'} toiletId={toilet.id} myReview={myReview} />
      {toiletReviews.length === 0 && (
        <Text style={{ color: muted }}>No reviews yet. Be the first to rate this toilet.</Text>
      )}
      {toiletReviews.map((r) => (
        <View key={r.id} style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.author}>
            {r.author}
            {/* Offline mode's default nickname is already "You". */}
            {r.userId === profile?.id && r.author !== 'You' ? ' (you)' : ''}
          </Text>
          <Text style={{ color: muted }}>
            Clean {r.cleanliness}/5 · Safe {r.safety}/5 · Wait {r.wait}/5 · {new Date(r.createdAt).toLocaleDateString()}
          </Text>
          {r.comment ? <Text>{r.comment}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.infoRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function ReviewForm({ toiletId, myReview }: { toiletId: string; myReview: Review | undefined }) {
  const { addReview, deleteReview } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  // Start from your existing review so editing it doesn't mean re-entering everything.
  const [cleanliness, setCleanliness] = useState(myReview?.cleanliness ?? 0);
  const [safety, setSafety] = useState(myReview?.safety ?? 0);
  const [wait, setWait] = useState(myReview?.wait ?? 0);
  const [comment, setComment] = useState(myReview?.comment ?? '');
  const [busy, setBusy] = useState(false);

  const complete = cleanliness > 0 && safety > 0 && wait > 0;
  const changed =
    !myReview ||
    cleanliness !== myReview.cleanliness ||
    safety !== myReview.safety ||
    wait !== myReview.wait ||
    comment.trim() !== myReview.comment;
  const canSubmit = complete && changed && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      await addReview({ toiletId, cleanliness, safety, wait, comment: comment.trim() });
    } catch (e) {
      Alert.alert('Review not posted', e instanceof Error ? e.message : String(e));
      setBusy(false);
      return;
    }
    // On success the form remounts (its key changes), so there's no state to reset.
    Alert.alert('Thanks, Peepal! 🧻', 'Your review helps the next person in a hurry.');
  };

  const confirmDelete = () => {
    Alert.alert('Delete your review?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteReview(toiletId);
          } catch (e) {
            Alert.alert('Review not deleted', e instanceof Error ? e.message : String(e));
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      {myReview && <Text style={{ color: muted }}>You’ve reviewed this toilet. Change it below.</Text>}
      <RatingRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
      <RatingRow label="Safety" value={safety} onChange={setSafety} />
      <RatingRow label="Wait time (5 = none)" value={wait} onChange={setWait} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Anything to know? (optional)"
        placeholderTextColor={muted}
        maxLength={280}
        multiline
        style={[styles.input, { color: text, borderColor: muted }]}
      />
      <Pressable
        disabled={!canSubmit}
        onPress={submit}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        style={[styles.submit, { backgroundColor: tint, opacity: canSubmit ? 1 : 0.4 }]}>
        <Text style={styles.directionsText}>
          {busy ? 'Saving…' : myReview ? 'Update your review' : 'Post review'}
        </Text>
      </Pressable>
      {myReview && (
        <Pressable onPress={confirmDelete} disabled={busy} accessibilityRole="button" style={styles.deleteButton}>
          <Text style={{ color: emergencyRed, fontWeight: '600' }}>Delete your review</Text>
        </Pressable>
      )}
    </View>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.infoRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.infoLabel}>{label}</Text>
      <Stars value={value} onChange={onChange} size={24} label={label} />
    </View>
  );
}

function mapsUrl(t: Toilet): string {
  return `https://www.google.com/maps/search/?api=1&query=${t.latitude},${t.longitude}`;
}

function openDirections(t: Toilet) {
  const dest = `${t.latitude},${t.longitude}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${dest}&dirflg=w`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`,
  });
  Linking.openURL(url).catch(() => Alert.alert('Couldn’t open maps', 'No maps app is available on this device.'));
}

function shareToilet(t: Toilet) {
  const open = isOpenNow(t.openingHours);
  const details = [feeLabel(t), openLabel(open)].join(' · ');
  Share.share({ message: `🚽 ${t.name} (${details})\n${mapsUrl(t)}\n\nFound with Peepals` }).catch(() => {});
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { borderRadius: 16, padding: 16, gap: 4 },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerText: { color: '#fff', fontSize: 16 },
  directions: { borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  directionsText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  source: { fontSize: 12 },
  heading: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  author: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontSize: 15, minHeight: 44, textAlignVertical: 'top' },
  submit: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  deleteButton: { alignItems: 'center', paddingVertical: 6 },
});
