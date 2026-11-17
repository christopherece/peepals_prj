import { enabledSocialProviders, redirectParams } from '@/lib/socialAuth';

describe('enabledSocialProviders', () => {
  it('shows nothing when unset', () => {
    expect(enabledSocialProviders(undefined, 'android')).toEqual([]);
    expect(enabledSocialProviders('', 'ios')).toEqual([]);
  });

  it('keeps the listed order on Android and drops Apple there', () => {
    expect(enabledSocialProviders('google, Facebook ,apple', 'android')).toEqual(['google', 'facebook']);
  });

  it('puts Apple first on iOS', () => {
    expect(enabledSocialProviders('google,facebook,apple', 'ios')).toEqual(['apple', 'google', 'facebook']);
  });

  it('hides Google and Facebook on iOS unless Apple is on (App Store 4.8)', () => {
    expect(enabledSocialProviders('google,facebook', 'ios')).toEqual([]);
    expect(enabledSocialProviders('google,facebook', 'android')).toEqual(['google', 'facebook']);
  });

  it('ignores unknown names and duplicates', () => {
    expect(enabledSocialProviders('google,twitter,google', 'android')).toEqual(['google']);
  });
});

describe('redirectParams', () => {
  it('reads tokens from the fragment', () => {
    expect(redirectParams('peepals://auth-callback#access_token=a.b.c&refresh_token=r1&token_type=bearer')).toEqual({
      access_token: 'a.b.c',
      refresh_token: 'r1',
      token_type: 'bearer',
    });
  });

  it('reads a PKCE code from the query', () => {
    expect(redirectParams('peepals://auth-callback?code=abc-123')).toEqual({ code: 'abc-123' });
  });

  it('reads errors, decoding them', () => {
    expect(
      redirectParams('exp://192.168.1.2:2233/--/auth-callback?error=access_denied&error_description=User+cancelled%21')
    ).toEqual({ error: 'access_denied', error_description: 'User cancelled!' });
  });

  it('returns nothing for a bare URL', () => {
    expect(redirectParams('peepals://auth-callback')).toEqual({});
  });
});
