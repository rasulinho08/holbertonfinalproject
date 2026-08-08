import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

/**
 * Google sign-in.
 *
 * The app never sees a password. It opens Google's consent screen, gets an
 * `id_token` back, and posts that to `POST /auth/oauth/google`; the backend
 * verifies the token *with Google* — including the audience claim — before
 * trusting anything in it. Decoding it client-side and sending the claims would
 * let anyone sign in as anyone.
 *
 * Configured by `EXPO_PUBLIC_GOOGLE_CLIENT_ID`. Without it `isConfigured` is
 * false and the caller hides the button: a sign-in button that cannot sign
 * anyone in is worse than no button.
 */

// Required so the browser tab closes and hands control back after consent.
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
const ANDROID_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '').trim();
const IOS_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '').trim();

/**
 * Google issues a separate client id per platform, and a native app must use
 * its own — the web one is rejected with `invalid_client` on a device. Each
 * falls back to the web id so a single id is enough to get started.
 */
function clientIdForPlatform(): string {
  if (Platform.OS === 'android') return ANDROID_CLIENT_ID || WEB_CLIENT_ID;
  if (Platform.OS === 'ios') return IOS_CLIENT_ID || WEB_CLIENT_ID;
  return WEB_CLIENT_ID;
}

export const isGoogleConfigured = clientIdForPlatform().length > 0;

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleAuthResult {
  idToken: string;
}

/**
 * Returns a `promptAsync` that resolves with Google's id token, or null when
 * the reader dismissed the consent screen.
 */
export function useGoogleAuth() {
  const clientId = clientIdForPlatform();

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        // Matches `scheme` in app.json, so the browser can return to the app on
        // a device. On web this resolves to the current origin instead.
        scheme: 'kitabdostu',
      }),
    [],
  );

  // Generated once per mount. A nonce regenerated on every render would not
  // match the one Google echoes back, and calling a random source during render
  // is impure — the value could change between the request being built and the
  // response arriving.
  const nonce = useMemo(() => Crypto.randomUUID(), []);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      // `id_token` rather than `code`: the backend only needs an identity
      // assertion, and the implicit id_token flow avoids shipping a client
      // secret in an app bundle, where it would not be secret.
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce },
    },
    DISCOVERY,
  );

  const signIn = useCallback(async (): Promise<GoogleAuthResult | null> => {
    if (!clientId) {
      throw new Error(
        'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID and rebuild.',
      );
    }
    if (!request) return null;

    const result = await promptAsync();
    if (result.type !== 'success') return null;

    const idToken = result.params?.id_token;
    if (!idToken) return null;

    return { idToken };
  }, [clientId, promptAsync, request]);

  return { signIn, ready: !!request, isConfigured: isGoogleConfigured };
}
