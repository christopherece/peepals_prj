import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import Stars from '@/components/Stars';
import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { formatAgo, ratingSummary } from '@/lib/format';
import { useToilets } from '@/lib/ToiletsContext';
import type { Review } from '@/lib/types';
import { useRequireMember } from '@/lib/useRequireMember';

/** Rating summary, the review form, and the community tip feed for one toilet. */
export default function ReviewSection({ toiletId }: { toiletId: string }) {
  const { reviews } = useToilets();
  const star = useThemeColor({}, 'star');
  const toiletReviews = reviews.filter((r) => r.toiletId === toiletId).sort((a, b) => b.createdAt - a.createdAt);
  const rating = ratingSummary(toiletReviews);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text type="title" style={styles.headingTitle}>
          Reviews & tips
        </Text>
        {rating && (
          <Text type="headline">
            <Text type="headline" style={{ color: star }}>
              ★
            </Text>{' '}
            {rating.average.toFixed(1)}
            <Text type="footnote" muted>
              {'  '}
              {rating.count} review{rating.count === 1 ? '' : 's'}
            </Text>
          </Text>
        )}
      </View>

      <ReviewForm toiletId={toiletId} />

      {toiletReviews.length === 0 ? (
        <Text type="callout" muted style={styles.empty}>
          No reviews yet. Tell the next Peepal what to expect.
        </Text>
      ) : (
        toiletReviews.map((r) => <ReviewItem key={r.id} review={r} />)
      )}
    </View>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const average = (review.cleanliness + review.safety + review.wait) / 3;

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      <View style={styles.itemHeader}>
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text type="caption" style={{ color: onTint }}>
            {review.author.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.itemTitle}>
          <Text type="headline" numberOfLines={1}>
            {review.author}
          </Text>
          <Text type="caption" muted>
            {formatAgo(review.createdAt)}
          </Text>
        </View>
        <Stars value={average} size={14} label={`Rated ${average.toFixed(1)} of 5`} />
      </View>
      {review.comment ? <Text type="body">{review.comment}</Text> : null}
      <Text type="caption" muted>
        Clean {review.cleanliness}/5 · Safe {review.safety}/5 · Wait {review.wait}/5
      </Text>
    </View>
  );
}

function ReviewForm({ toiletId }: { toiletId: string }) {
  const { addReview, profile, reviews } = useToilets();
  const requireMember = useRequireMember();
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const elevated = useThemeColor({}, 'elevated');
  const [cleanliness, setCleanliness] = useState(0);
  const [safety, setSafety] = useState(0);
  const [wait, setWait] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [open, setOpen] = useState(false);

  const complete = cleanliness > 0 && safety > 0 && wait > 0;
  const mine = profile ? reviews.find((r) => r.toiletId === toiletId && r.userId === profile.id) : undefined;

  /** Opens the full form, prefilled with your earlier review when editing. */
  const start = (firstRating?: number) => {
    setCleanliness(firstRating ?? mine?.cleanliness ?? 0);
    setSafety(mine?.safety ?? 0);
    setWait(mine?.wait ?? 0);
    setComment(mine?.comment ?? '');
    setOpen(true);
  };

  const submit = async () => {
    // Guests see the sign-in sheet; their ratings stay filled in underneath.
    if (!requireMember('review')) return;
    setPosting(true);
    try {
      await addReview({ toiletId, cleanliness, safety, wait, comment: comment.trim() });
    } catch (e) {
      Alert.alert('Review not posted', e instanceof Error ? e.message : String(e));
      return;
    } finally {
      setPosting(false);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
    Alert.alert('Thanks, Peepal! 🧻', 'Your review helps the next person in a hurry.');
  };

  if (!open) {
    return (
      <View style={[styles.card, styles.prompt, { backgroundColor: card }]}>
        {mine ? (
          <>
            <Text type="callout" muted style={styles.promptText}>
              You rated this {((mine.cleanliness + mine.safety + mine.wait) / 3).toFixed(1)}★
            </Text>
            <PressableScale haptic={false} onPress={() => start()} style={[styles.small, { borderColor: tint }]}>
              <Text type="subhead" style={{ color: tint }}>
                Edit review
              </Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text type="headline" style={styles.promptText}>
              How was it?
            </Text>
            <Stars value={0} onChange={start} size={30} label="Rate cleanliness to start a review" />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      <RatingRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
      <RatingRow label="Safety" value={safety} onChange={setSafety} />
      <RatingRow label="Short wait" value={wait} onChange={setWait} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder='Tip for others? e.g. "Code is 4432"'
        placeholderTextColor={muted}
        maxLength={280}
        multiline
        style={[styles.input, { color: text, backgroundColor: elevated }]}
      />
      <PressableScale
        disabled={!complete || posting}
        onPress={submit}
        style={[styles.submit, { backgroundColor: tint }]}>
        {posting ? (
          <ActivityIndicator color={onTint} />
        ) : (
          <Text type="headline" style={{ color: onTint }}>
            {mine ? 'Update your review' : 'Post review'}
          </Text>
        )}
      </PressableScale>
      <PressableScale haptic={false} onPress={() => setOpen(false)} style={styles.cancel}>
        <Text type="subhead" muted>
          Cancel
        </Text>
      </PressableScale>
    </View>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.ratingRow}>
      <Text type="callout">{label}</Text>
      <Stars value={value} onChange={onChange} size={26} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Space.md },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Space.sm },
  headingTitle: { fontSize: 20 },
  empty: { textAlign: 'center', paddingVertical: Space.lg },
  card: { borderRadius: Radius.md, padding: Space.lg, gap: Space.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  itemTitle: { flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { borderRadius: Radius.sm, padding: Space.md, fontSize: 15, minHeight: 64, textAlignVertical: 'top' },
  prompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptText: { flexShrink: 1 },
  small: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  cancel: { alignItems: 'center', paddingVertical: Space.xs },
  submit: { borderRadius: Radius.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
