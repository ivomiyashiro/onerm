// SPIKE #15 — exploratory, not merged.
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState, Button, LogBox, ScrollView, Text } from 'react-native';

LogBox.ignoreAllLogs();

import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

import { secureSessionStorage } from '@/data/auth/secure-session-storage';

// SPIKE #16: the WEB client id makes Google issue an ID token whose audience Supabase accepts.
GoogleSignin.configure({
  webClientId: '190800915067-rcghu8e9tmhjam3mrqra4g5mbdbibb3s.apps.googleusercontent.com',
});

async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) {
    return { error: new Error(`google: ${response.type}`) };
  }
  const result = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
  });
  console.log(
    `[spike16] identities=${result.data.user?.identities?.map((i) => i.provider).join(',')}`,
  );
  return result;
}

// adb reverse tcp:55321 tcp:55321
const supabase = createClient(
  'http://localhost:55321',
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// supabase-js docs: refresh only in the foreground.
AppState.addEventListener('change', (state) => {
  console.log(`[spike15] ${new Date().toISOString()} appstate ${state}`);
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

const credentials = { email: 'spike15@test.local', password: 'password-123' };

export function SpikeSessionScreen() {
  const [log, setLog] = useState<string[]>([]);
  const [user, setUser] = useState<string>('—');
  const add = (line: string) => {
    const stamped = `${new Date().toISOString().slice(11, 19)} ${line}`;
    console.log(`[spike15] ${stamped}`);
    setLog((l) => [stamped, ...l].slice(0, 14));
  };

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      add(
        `${event} exp=${session?.expires_at ? new Date(session.expires_at * 1000).toISOString().slice(11, 19) : '-'}`,
      );
      setUser(session?.user.email ?? '—');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const run = (label: string, fn: () => Promise<{ error: unknown }>) => async () => {
    const { error } = await fn();
    add(`${label}: ${error ? String((error as Error).message) : 'ok'}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 8 }}>
      <Text testID="user">user: {user}</Text>
      <Button title="Sign up" onPress={run('signUp', () => supabase.auth.signUp(credentials))} />
      <Button
        title="Sign in"
        onPress={run('signIn', () => supabase.auth.signInWithPassword(credentials))}
      />
      <Button
        title="Sign out"
        onPress={run('signOut', async () => {
          await GoogleSignin.signOut().catch(() => {});
          return supabase.auth.signOut();
        })}
      />
      <Button title="Google" onPress={run('google', signInWithGoogle)} />
      {log.map((l, i) => (
        <Text key={i}>{l}</Text>
      ))}
    </ScrollView>
  );
}
