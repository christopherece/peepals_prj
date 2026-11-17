import type { SocialProvider } from './types';

export const PROVIDER_NAME: Record<SocialProvider, string> = { google: 'Google', facebook: 'Facebook', apple: 'Apple' };

/**
 * Which social sign-ins to show, from EXPO_PUBLIC_AUTH_PROVIDERS (e.g. "google,facebook,apple").
 * List a provider only once it's switched on in Supabase (README "Social sign-in").
 * Apple is iOS-only and listed first. On iOS, Google and Facebook need Apple too: App Store
 * guideline 4.8 requires Sign in with Apple whenever an app offers another company's sign-in.
 */
export function enabledSocialProviders(setting: string | undefined, os: string): SocialProvider[] {
  const listed = (setting ?? '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is SocialProvider => p === 'google' || p === 'facebook' || p === 'apple');
  const unique = [...new Set(listed)];
  const apple = os === 'ios' && unique.includes('apple');
  const others = unique.filter((p) => p !== 'apple' && (os !== 'ios' || apple));
  return [...(apple ? (['apple'] as const) : []), ...others];
}

/** Query and #fragment parameters of the URL the sign-in browser returned to. */
export function redirectParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = url.split('#')[0].split('?')[1];
  const fragment = url.split('#')[1];
  for (const part of [query, fragment]) {
    if (!part) continue;
    new URLSearchParams(part).forEach((value, key) => {
      params[key] = value;
    });
  }
  return params;
}
