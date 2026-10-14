import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useToilets } from './ToiletsContext';

/** What the guest was trying to do; shown on the sign-in sheet. */
export type MemberAction = 'review' | 'add-toilet' | 'photo' | 'profile';

/**
 * Returns a guard for contribution actions. Members pass straight through (`true`).
 * Guests get the sign-in sheet on top of the current screen (`false`); the screen
 * underneath stays mounted, so whatever they typed is still there when they come back.
 */
export function useRequireMember() {
  const { profile } = useToilets();
  const router = useRouter();

  return useCallback(
    (action: MemberAction) => {
      if (profile) return true;
      router.push({ pathname: '/sign-in', params: { action } });
      return false;
    },
    [profile, router]
  );
}
