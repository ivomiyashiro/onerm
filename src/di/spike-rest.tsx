// SPIKE #14 — exploratory, not merged.
import { useKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Button, ScrollView, Switch, Text, View } from 'react-native';

const CHANNEL = 'rest-timer';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function KeepAwake() {
  useKeepAwake('rest-timer');
  return <Text>keep-awake ON</Text>;
}

export function SpikeRestScreen() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [awake, setAwake] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const add = (line: string) => {
    console.log(`[spike14] ${line}`);
    setLog((l) => [line, ...l].slice(0, 12));
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Descanso',
      importance: Notifications.AndroidImportance.MAX,
    });
    Notifications.getPermissionsAsync().then((p) => add(`permission ${p.status}`));
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const scheduledFor = Number(n.request.content.data?.endsAt);
      add(`received in foreground, delay ${Date.now() - scheduledFor} ms`);
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);

  const schedule = async (end: number) => {
    try {
      // Fixed identifier: scheduling again replaces the previous alarm, no leaks.
      const id = await Notifications.scheduleNotificationAsync({
        identifier: CHANNEL,
        content: {
          title: '¡Descanso terminado!',
          body: 'Siguiente: Sentadilla · 60 kg × 8',
          data: { endsAt: end },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: end,
          channelId: CHANNEL,
        },
      });
      setNotificationId(id);
      setEndsAt(end);
      add(`scheduled ${id.slice(0, 8)} for ${new Date(end).toISOString()}`);
    } catch (e) {
      add(`schedule failed: ${String(e).slice(0, 120)}`);
    }
  };

  const remaining = endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000));

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 8 }}>
      <Text style={{ fontSize: 48 }}>{remaining ?? '—'}</Text>
      <Button title="Start 30 s" onPress={() => schedule(Date.now() + 30_000)} />
      <Button title="+15 s" onPress={() => endsAt && schedule(endsAt + 15_000)} />
      <Button
        title="Skip"
        onPress={async () => {
          await Notifications.cancelScheduledNotificationAsync(CHANNEL);
          setNotificationId(null);
          setEndsAt(null);
          add('skipped (cancelled)');
        }}
      />
      <Button
        title="Request permission"
        onPress={async () =>
          add(`request → ${(await Notifications.requestPermissionsAsync()).status}`)
        }
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Switch value={awake} onValueChange={setAwake} />
        {awake ? <KeepAwake /> : <Text>keep-awake off</Text>}
      </View>
      {log.map((l, i) => (
        <Text key={i}>{l}</Text>
      ))}
    </ScrollView>
  );
}
