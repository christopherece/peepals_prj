import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useToilets } from './ToiletsContext';
import type { ReportTarget } from './types';
import { useRequireMember } from './useRequireMember';

// Android alerts show three buttons at most, so two reasons plus Cancel.
const REASONS = ['Offensive or inappropriate', 'Spam or wrong info'];

/**
 * Returns `report(target, onDone?)`: asks why, sends the report and hides the content on this device.
 * `onDone` runs once it's hidden (e.g. to close the sheet of a reported toilet).
 * Guests get the sign-in sheet first, like every other contribution.
 */
export function useReport() {
  const { reportContent, shared } = useToilets();
  const requireMember = useRequireMember();

  return useCallback(
    (target: ReportTarget, onDone?: () => void) => {
      if (!requireMember('report')) return;
      const send = (reason: string) =>
        reportContent(target, reason).then(
          () => {
            onDone?.();
            Alert.alert(
              'Thanks for the heads-up',
              shared
                ? `We'll take a look. You won't see this ${target.kind} again.`
                : `You won't see this ${target.kind} again on this phone.`
            );
          },
          (e) => Alert.alert('Report not sent', e instanceof Error ? e.message : String(e))
        );
      Alert.alert(
        `Report this ${target.kind}?`,
        "Tell us what's wrong with it.",
        [
          ...REASONS.map((reason) => ({ text: reason, onPress: () => send(reason) })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
        { cancelable: true }
      );
    },
    [reportContent, requireMember, shared]
  );
}
