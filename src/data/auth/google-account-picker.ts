import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/** What Google's account picker gave back. */
export type GooglePick =
  | { status: 'picked'; idToken: string; email: string }
  | { status: 'cancelled' }
  | { status: 'failed' };

/** Google's native sign-in, behind a port so the gateway can be tested without a device. */
export interface GoogleAccountPicker {
  pick(): Promise<GooglePick>;
  /** Forgets the chosen account, so the picker is shown again next time (spike #16). */
  signOut(): Promise<void>;
}

/**
 * The picker over `@react-native-google-signin`. `webClientId` is the WEB client: it makes Google
 * issue an ID token whose audience Supabase accepts (spike #16). The Android client is found by
 * package and SHA-1, so it isn't in the code.
 */
export class NativeGoogleAccountPicker implements GoogleAccountPicker {
  constructor(webClientId: string) {
    GoogleSignin.configure({ webClientId });
  }

  async pick(): Promise<GooglePick> {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return { status: 'cancelled' };
      const { idToken, user } = response.data;
      return idToken ? { status: 'picked', idToken, email: user.email } : { status: 'failed' };
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { status: 'cancelled' };
      }
      return { status: 'failed' };
    }
  }

  async signOut(): Promise<void> {
    await GoogleSignin.signOut().catch(() => undefined);
  }
}
