import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useToilets } from './ToiletsContext';
import type { ReportTarget } from './types';
import { useRequireMember } from './useRequireMember';

const REASONS = ['Offensive or abusive', 'Spam or misleading', 'Shows a person or private info'];

/**
 * Returns `report(target)`: asks why, sends the report and hides the content on this device.
 * Guests get the sign-in sheet first, like every other contribution.
 */
export function useReport() {
  const { reportContent } = useToilets();
  const requireMember = useRequireMember();

  return useCallback(
    (target: ReportTarget) => {
      if (!requireMember('report')) return;
      const send = (reason: string) =>
        reportContent(target, reason).then(
          () => Alert.alert('Thanks for the heads-up', `We'll take a look. You won't see this ${target.kind} again.`),
          (e) => Alert.alert('Report not sent', e instanceof Error ? e.message : String(e))
        );
      Alert.alert(`Report this ${target.kind}?`, "Tell us what's wrong with it.", [
        ...REASONS.map((reason) => ({ text: reason, onPress: () => send(reason) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    },
    [reportContent, requireMember]
  );
}
