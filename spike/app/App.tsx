import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  configureBackgroundTypes,
  requestAuthorization,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit';
import { TYPES } from './src/health';
import { getLog, getServerUrl, launchId, LogEntry, saveServerUrl, upload } from './src/upload';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  const refresh = useCallback(async () => setLog(await getLog()), []);

  const register = useCallback(
    () => configureBackgroundTypes([...TYPES], UpdateFrequency.immediate),
    [],
  );

  useEffect(() => {
    (async () => {
      setUrl((await getServerUrl()) ?? '');
      await refresh();
      try {
        await register(); // safe to repeat
      } catch {}
    })();
  }, [refresh, register]);

  const saveUrl = async () => {
    setUrl(await saveServerUrl(url));
    setStatus('URL saved');
  };

  const grant = async () => {
    try {
      const authorized = await requestAuthorization({ toRead: [...TYPES] });
      const registered = await register();
      setStatus(`authorization: ${authorized}, observers registered: ${registered}`);
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const test = async () => {
    await upload({ event: 'test', readAt: new Date().toISOString(), appState: 'active', launchId });
    await refresh();
    setStatus('test upload attempted');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Compound M0</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="https://xxxx.trycloudflare.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Button title="Save server URL" onPress={saveUrl} />
      <View style={styles.gap} />
      <Button title="Grant Health access + register observers" onPress={grant} />
      <Button title="Send test upload" onPress={test} />
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.sub}>launch {launchId}</Text>
      <Button title="Refresh log" onPress={refresh} />
      {log.map((e, i) => (
        <Text key={i} style={styles.row}>
          {e.at.slice(11, 19)} {e.event} {e.type?.replace(/^HK\w+Identifier/, '') ?? ''} [{e.status}]
          {e.note ? ` ${e.note}` : ''}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#999', padding: 8, marginBottom: 8, borderRadius: 4 },
  gap: { height: 12 },
  status: { marginVertical: 8 },
  sub: { color: '#666', fontSize: 12 },
  row: { fontFamily: 'Menlo', fontSize: 11, marginTop: 4 },
});
