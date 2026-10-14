import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import SheetGrabber from '@/components/SheetGrabber';
import { Text, useThemeColor } from '@/components/Themed';
import { Radius, Space } from '@/constants/Typography';
import { useToilets } from '@/lib/ToiletsContext';
import type { MemberAction } from '@/lib/useRequireMember';
import type { SignInMethod } from '@/lib/types';

const ACTION_COPY: Record<MemberAction, string> = {
  review: 'Sign in to leave a review.',
  'add-toilet': 'Sign in to add a missing toilet.',
  photo: 'Sign in to share a photo.',
  profile: 'Sign in to start contributing.',
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Email sign-in sheet, opened by `useRequireMember` when a guest tries to contribute.
 * Shared backend: email → 6-digit code. Offline mode: email + nickname, saved on this phone.
 */
export default function SignInSheet() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: MemberAction }>();
  const { shared, sendEmailCode, signIn } = useToilets();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');

  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      Alert.alert('Sign-in failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = (method: SignInMethod) =>
    run(async () => {
      await signIn(method);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    });

  const sendCode = (address: string) =>
    run(async () => {
      await sendEmailCode(address);
      setCode('');
      setCodeSentTo(address);
    });

  const address = email.trim().toLowerCase();
  const inputStyle = [styles.input, { color: text, backgroundColor: card }];

  let body;
  if (codeSentTo) {
    body = (
      <>
        <Text type="callout" muted>
          Enter the 6-digit code we sent to <Text type="callout">{codeSentTo}</Text>.
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
          placeholder="••••••"
          placeholderTextColor={muted}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          style={[inputStyle, styles.code]}
        />
        <PrimaryButton
          label="Verify and sign in"
          busy={busy}
          disabled={code.length !== 6}
          onPress={() => finish({ kind: 'email-code', email: codeSentTo, code })}
        />
        <View style={styles.links}>
          <PressableScale haptic={false} disabled={busy} onPress={() => sendCode(codeSentTo)} style={styles.link}>
            <Text type="subhead" style={{ color: tint }}>
              Resend code
            </Text>
          </PressableScale>
          <PressableScale haptic={false} disabled={busy} onPress={() => setCodeSentTo(null)} style={styles.link}>
            <Text type="subhead" style={{ color: tint }}>
              Change email
            </Text>
          </PressableScale>
        </View>
      </>
    );
  } else {
    body = (
      <>
        <View style={styles.field}>
          <Text type="subhead">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            style={inputStyle}
          />
        </View>
        {!shared && (
          <View style={styles.field}>
            <Text type="subhead">Nickname</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="Shown on your reviews, e.g. Throne Explorer"
              placeholderTextColor={muted}
              maxLength={30}
              style={inputStyle}
            />
          </View>
        )}
        {shared ? (
          <PrimaryButton
            label="Email me a code"
            busy={busy}
            disabled={!isEmail(address)}
            onPress={() => sendCode(address)}
          />
        ) : (
          <>
            <PrimaryButton
              label="Continue"
              busy={busy}
              disabled={!isEmail(address) || nickname.trim().length < 2}
              onPress={() => finish({ kind: 'device', email: address, nickname: nickname.trim() })}
            />
            <Text type="footnote" muted style={styles.center}>
              Offline mode: no email is sent. Your profile, reviews and photos stay on this phone.
            </Text>
          </>
        )}
        {shared && (
          <Text type="footnote" muted style={styles.center}>
            No password needed. New here? The code creates your account.
          </Text>
        )}
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SheetGrabber />
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: card }]}>
          <Text style={styles.emoji}>{codeSentTo ? '📬' : '🧻'}</Text>
        </View>
        <Text type="title">{codeSentTo ? 'Check your email' : 'Join the Peepals community'}</Text>
        {!codeSentTo && (
          <Text type="callout" muted>
            {ACTION_COPY[action ?? 'profile']} Browsing the map stays open to everyone.
          </Text>
        )}
      </View>

      {body}

      <PressableScale haptic={false} onPress={() => router.back()} style={styles.link}>
        <Text type="subhead" muted>
          Not now, keep browsing
        </Text>
      </PressableScale>
    </ScrollView>
  );
}

function PrimaryButton(props: { label: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  return (
    <PressableScale
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      style={[styles.button, { backgroundColor: tint }]}>
      {props.busy ? (
        <ActivityIndicator color={onTint} />
      ) : (
        <Text type="headline" style={{ color: onTint }}>
          {props.label}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.xl, paddingTop: Platform.OS === 'ios' ? Space.xl + Space.sm : Space.sm, gap: Space.lg },
  header: { gap: Space.sm },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  field: { gap: Space.xs + 2 },
  input: { borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  code: { fontSize: 28, letterSpacing: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  button: { borderRadius: Radius.pill, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: Space.xl },
  link: { alignItems: 'center', paddingVertical: Space.sm },
  center: { textAlign: 'center' },
});
