import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import StatusBadge from '@/components/StatusBadge';
import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { useToilets } from '@/lib/ToiletsContext';
import { useRequireMember } from '@/lib/useRequireMember';

export default function ProfileScreen() {
  const { profile, authReady, shared, reviews } = useToilets();
  const card = useThemeColor({}, 'card');

  const myReviewCount = profile ? reviews.filter((r) => r.userId === profile.id).length : 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!authReady ? (
        <ActivityIndicator style={styles.loading} />
      ) : profile ? (
        <>
          <MemberHeader reviewCount={myReviewCount} />
          {/* Keyed so the field resets when the nickname is saved. */}
          <NicknameCard key={profile.nickname} />
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text type="headline">{shared ? '🌍 Shared with everyone' : '📱 Offline mode'}</Text>
            <Text type="footnote" muted>
              {shared
                ? 'Your reviews, photos and added toilets help every Peepal nearby.'
                : 'Your reviews, photos and added toilets are only saved on this phone.'}
            </Text>
          </View>
          <SignOutButton />
        </>
      ) : (
        <GuestCard />
      )}
    </ScrollView>
  );
}

function MemberHeader({ reviewCount }: { reviewCount: number }) {
  const { profile } = useToilets();
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  if (!profile) return null;

  return (
    <View style={[styles.card, styles.member, { backgroundColor: card }]}>
      <View style={[styles.avatar, { backgroundColor: tint }]}>
        <Text type="title" style={{ color: onTint }}>
          {profile.nickname.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.memberText}>
        <Text type="title" numberOfLines={1}>
          {profile.nickname}
        </Text>
        {profile.email && (
          <Text type="footnote" muted numberOfLines={1}>
            {profile.email}
          </Text>
        )}
        <StatusBadge tone="success" label={`Peepal · ${reviewCount} review${reviewCount === 1 ? '' : 's'} nearby`} />
      </View>
    </View>
  );
}

function GuestCard() {
  const requireMember = useRequireMember();
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');

  return (
    <View style={[styles.card, styles.guest, { backgroundColor: card }]}>
      <Text style={styles.emoji}>🚻</Text>
      <Text type="title" style={styles.center}>
        You&apos;re browsing as a guest
      </Text>
      <Text type="callout" muted style={styles.center}>
        The map, search and directions are free for everyone. Sign in with your email to review toilets, share photos
        and add missing spots.
      </Text>
      <PressableScale onPress={() => requireMember('profile')} style={[styles.button, { backgroundColor: tint }]}>
        <Text type="headline" style={{ color: onTint }}>
          Join the Peepals community
        </Text>
      </PressableScale>
    </View>
  );
}

function NicknameCard() {
  const { profile, updateNickname } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const card = useThemeColor({}, 'card');
  const elevated = useThemeColor({}, 'elevated');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');

  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  const trimmed = nickname.trim();
  const canSave = !!profile && trimmed.length >= 2 && trimmed !== profile.nickname && !saving;

  const save = async () => {
    setSaving(true);
    try {
      await updateNickname(trimmed);
    } catch (e) {
      Alert.alert('Nickname not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: card }]}>
      <Text type="headline">Nickname</Text>
      <Text type="footnote" muted>
        Shown on your reviews and tips.
      </Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="e.g. Throne Explorer"
        placeholderTextColor={muted}
        maxLength={30}
        style={[styles.input, { color: text, backgroundColor: elevated }]}
      />
      <PressableScale onPress={save} disabled={!canSave} style={[styles.button, { backgroundColor: tint }]}>
        <Text type="headline" style={{ color: onTint }}>
          {saving ? 'Saving…' : 'Save'}
        </Text>
      </PressableScale>
    </View>
  );
}

function SignOutButton() {
  const { signOut } = useToilets();
  const danger = useThemeColor({}, 'danger');

  const confirm = () =>
    Alert.alert('Sign out?', 'You can keep browsing as a guest.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          signOut().catch((e) => Alert.alert('Sign-out failed', e instanceof Error ? e.message : String(e))),
      },
    ]);

  return (
    <PressableScale haptic={false} onPress={confirm} style={styles.signOut}>
      <Text type="headline" style={{ color: danger }}>
        Sign out
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.md },
  loading: { marginTop: Space.xl * 2 },
  card: { borderRadius: Radius.md, padding: Space.lg, gap: Space.sm },
  member: { flexDirection: 'row', alignItems: 'center', gap: Space.lg },
  memberText: { flex: 1, gap: Space.xs },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  guest: { alignItems: 'center', paddingVertical: Space.xl, gap: Space.md },
  emoji: { fontSize: 44 },
  center: { textAlign: 'center' },
  input: { borderRadius: Radius.sm, padding: Space.md, fontSize: 16 },
  button: {
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: { alignItems: 'center', paddingVertical: Space.md },
});
