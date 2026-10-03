// SPIKE #15 — exploratory, not merged.
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AppState, Button, LogBox, ScrollView, Text } from 'react-native';

LogBox.ignoreAllLogs();

import { secureSessionStorage } from '@/data/auth/secure-session-storage';

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
      <Button title="Sign out" onPress={run('signOut', () => supabase.auth.signOut())} />
      {log.map((l, i) => (
        <Text key={i}>{l}</Text>
      ))}
    </ScrollView>
  );
}
