import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet, View } from 'react-native';

import PressableScale from '@/components/PressableScale';
import { Text, useThemeColor } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius, Space } from '@/constants/Typography';
import type { SocialProvider } from '@/lib/types';

const BUTTON_HEIGHT = 52;
// Facebook's brand blue; Google's guidelines ask for a plain white or dark button.
const FACEBOOK_BLUE = '#1877F2';

type Props = {
  providers: SocialProvider[];
  disabled: boolean;
  onPress: (provider: SocialProvider) => void;
};

/** "Continue with …" buttons for the sign-in sheet, then an "or use your email" divider. */
export default function SocialSignIn({ providers, disabled, onPress }: Props) {
  const scheme = useColorScheme();
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const elevated = useThemeColor({}, 'elevated');
  const muted = useThemeColor({}, 'muted');
  if (providers.length === 0) return null;

  return (
    <View style={styles.group}>
      {providers.map((provider) => {
        if (provider === 'apple') {
          // Apple requires its own button.
          return (
            <AppleAuthentication.AppleAuthenticationButton
              key={provider}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={BUTTON_HEIGHT / 2}
              style={styles.apple}
              onPress={() => !disabled && onPress(provider)}
            />
          );
        }
        const facebook = provider === 'facebook';
        return (
          <PressableScale
            key={provider}
            disabled={disabled}
            onPress={() => onPress(provider)}
            accessibilityRole="button"
            style={[
              styles.button,
              facebook
                ? { backgroundColor: FACEBOOK_BLUE }
                : { backgroundColor: elevated, borderColor: border, borderWidth: StyleSheet.hairlineWidth },
            ]}>
            <Text style={[styles.logo, { color: facebook ? '#fff' : text }]}>{facebook ? 'f' : 'G'}</Text>
            <Text type="headline" style={{ color: facebook ? '#fff' : text }}>
              Continue with {facebook ? 'Facebook' : 'Google'}
            </Text>
          </PressableScale>
        );
      })}
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: border }]} />
        <Text type="footnote" style={{ color: muted }}>
          or use your email
        </Text>
        <View style={[styles.line, { backgroundColor: border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Space.sm },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  logo: { fontSize: 20, fontWeight: '800', width: 22, textAlign: 'center' },
  apple: { height: BUTTON_HEIGHT, width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, marginTop: Space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
