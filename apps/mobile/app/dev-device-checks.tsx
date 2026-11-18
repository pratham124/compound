import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useNetworkState, type NetworkState } from 'expo-network';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { checkLocalDatabaseBackup, openLocalDatabase } from '../src/localDatabase/localDatabase.ts';
import { layout, radius, space, type, type Palette } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

const IMAGE_URL = 'https://picsum.photos/id/237/400/300';

type ImagePolicy = 'memory-disk' | 'disk';

type ImageStep =
  | { kind: 'idle' }
  | { kind: 'loading'; policy: ImagePolicy }
  | { kind: 'loaded'; policy: ImagePolicy; cacheType: string }
  | { kind: 'failed'; policy: ImagePolicy };

function describeImage(step: ImageStep) {
  switch (step.kind) {
    case 'idle':
      return 'not loaded';
    case 'loading':
      return `loading (policy ${step.policy})`;
    case 'loaded':
      return `loaded from ${step.cacheType} (policy ${step.policy})`;
    case 'failed':
      return `FAILED (policy ${step.policy})`;
    default: {
      const _exhaustive: never = step;

      return _exhaustive;
    }
  }
}

async function describeDatabase(db: SQLiteDatabase) {
  await db.execAsync(
    'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS check_rows (id INTEGER PRIMARY KEY NOT NULL); INSERT INTO check_rows DEFAULT VALUES;',
  );

  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM check_rows');

  const check = checkLocalDatabaseBackup(db);

  if (check.kind === 'unsupported') {
    return `unsupported on this platform (rows: ${row?.n})\ndatabase at ${db.databasePath}`;
  }

  const inside = check.kind === 'excluded' ? 'yes' : 'NO';

  return `database at ${db.databasePath}\ninside excluded folder: ${inside}\nrows: ${row?.n}`;
}

function describeNetwork({ isInternetReachable, type }: NetworkState) {
  const reachable = isInternetReachable === undefined ? 'unknown' : isInternetReachable ? 'online' : 'OFFLINE';

  return `network: ${reachable} (${type ?? 'unknown'})`;
}

/** Dev only: open compound://dev-device-checks to check iCloud backup exclusion and the offline image cache (issue #64). */
export default function DevDeviceChecks() {
  const { palette } = useAppearance();

  const network = useNetworkState();

  const [databaseResult, setDatabaseResult] = useState('not run');

  const [imageStep, setImageStep] = useState<ImageStep>({ kind: 'idle' });

  const [imageRun, setImageRun] = useState(0);

  const [cacheNote, setCacheNote] = useState('');

  async function createDatabase() {
    try {
      const db = await openLocalDatabase('device-check.db');

      try {
        setDatabaseResult(await describeDatabase(db));
      } finally {
        await db.closeAsync();
      }
    } catch (error) {
      setDatabaseResult(`failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  function showImage(policy: ImagePolicy) {
    setImageStep({ kind: 'loading', policy });

    setImageRun((run) => run + 1);
  }

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <Text style={[type.footnote, { color: palette.label }]}>
        {describeNetwork(network)}
      </Text>
      <Button palette={palette} label="Haptic tap" onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)} />

      <Button palette={palette} label="Create database and check backup" onPress={() => void createDatabase()} />
      <Text style={[type.footnote, { color: palette.label }]}>{`database: ${databaseResult}`}</Text>

      <Button palette={palette} label="Load image (online)" onPress={() => showImage('memory-disk')} />
      <Button
        palette={palette}
        label="Clear memory cache"
        onPress={() => void Image.clearMemoryCache().then((cleared) => setCacheNote(`memory cache cleared: ${cleared}`))}
      />
      <Button palette={palette} label="Load image (cache on disk only)" onPress={() => showImage('disk')} />
      <Text style={[type.footnote, { color: palette.label }]}>{`image: ${describeImage(imageStep)}\n${cacheNote}`}</Text>
      {imageStep.kind === 'idle' ? null : (
        <Image
          key={imageRun}
          accessibilityLabel="Cache check image"
          source={{ uri: IMAGE_URL }}
          cachePolicy={imageStep.policy}
          style={styles.image}
          onLoad={(event) => setImageStep({ kind: 'loaded', policy: imageStep.policy, cacheType: event.cacheType })}
          onError={() => setImageStep({ kind: 'failed', policy: imageStep.policy })}
        />
      )}
    </ScrollView>
  );
}

function Button({ palette, label, onPress }: { palette: Palette; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, { backgroundColor: palette.accent }]}>
      <Text style={[type.footnote, { color: palette.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, padding: layout.screenMargin, paddingTop: space.xxl * 4 },
  button: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.capsule },
  image: { width: 200, height: 150 },
});
