import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

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
import type { Toilet } from '@/lib/types';

export default function ToiletScreen() {
  const { id, emergency } = useLocalSearchParams<{ id: string; emergency?: string }>();
  const { allNearby, reviews } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');

  const toilet = allNearby.find((t) => t.id === id);
  if (!toilet) {
    return (
      <View style={styles.centered}>
        <Text>This toilet isn’t nearby anymore.</Text>
      </View>
    );
  }

  const open = isOpenNow(toilet.openingHours);
  const toiletReviews = reviews.filter((r) => r.toiletId === toilet.id);
  const rating = ratingSummary(toiletReviews);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: toilet.name }} />

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
        <InfoRow label="Distance" value={formatDistance(toilet.distance) || 'Unknown'} />
        <Text style={[styles.source, { color: muted }]}>
          {toilet.source === 'osm' ? 'Data © OpenStreetMap contributors' : 'Added by a Peepal'}
        </Text>
      </View>

      <Text style={styles.heading}>
        Reviews {rating ? `· ★ ${rating.average.toFixed(1)} (${rating.count})` : ''}
      </Text>
      <ReviewForm toiletId={toilet.id} />
      {toiletReviews.map((r) => (
        <View key={r.id} style={[styles.card, { backgroundColor: card }]}>
          <Text style={styles.author}>{r.author}</Text>
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

function ReviewForm({ toiletId }: { toiletId: string }) {
  const { addReview, profile, reviews } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const [cleanliness, setCleanliness] = useState(0);
  const [safety, setSafety] = useState(0);
  const [wait, setWait] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const complete = cleanliness > 0 && safety > 0 && wait > 0;
  const alreadyReviewed = reviews.some((r) => r.toiletId === toiletId && r.userId === profile?.id);

  const submit = async () => {
    setPosting(true);
    try {
      await addReview({ toiletId, cleanliness, safety, wait, comment: comment.trim() });
    } catch (e) {
      Alert.alert('Review not posted', e instanceof Error ? e.message : String(e));
      return;
    } finally {
      setPosting(false);
    }
    setCleanliness(0);
    setSafety(0);
    setWait(0);
    setComment('');
    Alert.alert('Thanks, Peepal! 🧻', 'Your review helps the next person in a hurry.');
  };

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      <RatingRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
      <RatingRow label="Safety" value={safety} onChange={setSafety} />
      <RatingRow label="Wait time (5 = none)" value={wait} onChange={setWait} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Anything to know? (optional)"
        placeholderTextColor={muted}
        maxLength={280}
        style={[styles.input, { color: text, borderColor: muted }]}
      />
      <Pressable
        disabled={!complete || posting}
        onPress={submit}
        style={[styles.submit, { backgroundColor: tint, opacity: complete && !posting ? 1 : 0.4 }]}>
        <Text style={styles.directionsText}>
          {posting ? 'Posting…' : alreadyReviewed ? 'Update your review' : 'Post review'}
        </Text>
      </Pressable>
    </View>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.infoRow} lightColor="transparent" darkColor="transparent">
      <Text style={styles.infoLabel}>{label}</Text>
      <Stars value={value} onChange={onChange} size={24} />
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
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontSize: 15 },
  submit: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
});
