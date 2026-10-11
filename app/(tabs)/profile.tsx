import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useToilets } from '@/lib/ToiletsContext';

export default function ProfileScreen() {
  const { profile, shared, reviews } = useToilets();
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');

  const myReviewCount = reviews.filter((r) => r.userId === profile?.id).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Keyed so the field resets when sign-in finishes or the nickname is saved. */}
      <NicknameCard key={profile?.nickname ?? 'signing-in'} />

      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={styles.label}>Reviews nearby by you: {myReviewCount}</Text>
        <Text style={{ color: muted }}>
          {shared
            ? 'Your reviews and added toilets are shared with every Peepal.'
            : 'Offline mode: your reviews and added toilets are only saved on this phone.'}
        </Text>
      </View>
    </ScrollView>
  );
}

function NicknameCard() {
  const { profile, updateNickname } = useToilets();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
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
      <Text style={styles.label}>Your nickname</Text>
      <Text style={{ color: muted }}>Shown on your reviews.</Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        editable={!!profile}
        placeholder={profile ? 'e.g. Throne Explorer' : 'Signing in…'}
        placeholderTextColor={muted}
        maxLength={30}
        style={[styles.input, { color: text, borderColor: muted }]}
      />
      <Pressable
        onPress={save}
        disabled={!canSave}
        style={[styles.button, { backgroundColor: tint, opacity: canSave ? 1 : 0.4 }]}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, fontSize: 16 },
  button: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
