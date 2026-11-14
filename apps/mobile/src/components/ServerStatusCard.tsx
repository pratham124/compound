import type { DependencyStatus } from '@compound/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ServerStatus } from '../api/serverStatus.ts';
import { layout, press, radius, space, type, type Palette } from '../theme/tokens.ts';

export type ServerStatusCardProps = {
  palette: Palette;
  status: ServerStatus;
  onRetry: () => void;
};

const DEPENDENCIES = [
  ['Postgres', 'postgres'],
  ['Valkey', 'valkey'],
  ['Queue', 'queue'],
] as const;

function message(status: Exclude<ServerStatus, { kind: 'ready' }>): string {
  switch (status.kind) {
    case 'loading':
      return 'Checking the server…';
    case 'not-configured':
      return "Set EXPO_PUBLIC_API_URL in apps/mobile/.env to your laptop's address, then restart Expo.";
    case 'unreachable':
      return "Can't reach the server. Is the stack up, and is the phone on the same Wi-Fi?";
    case 'invalid':
      return 'The server answered, but not with a health response.';
    default: {
      const _exhaustive: never = status;

      return _exhaustive;
    }
  }
}

function label(value: DependencyStatus): string {
  return value === 'up' ? 'Reachable' : 'Unreachable';
}

export function ServerStatusCard({ palette, status, onRetry }: ServerStatusCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <Text style={[type.headline, { color: palette.label }]}>Server</Text>
      {status.kind === 'ready' ? (
        DEPENDENCIES.map(([name, key]) => (
          <View key={key} style={styles.row}>
            <Text style={[type.body, { color: palette.label }]}>{name}</Text>
            <Text style={[type.body, { color: status.health.checks[key] === 'up' ? palette.accent : palette.danger }]}>
              {label(status.health.checks[key])}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[type.subheadline, { color: palette.secondary }]}>{message(status)}</Text>
      )}
      {status.kind === 'loading' ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.accentSoft, transform: [{ scale: pressed ? press.scale : 1 }] },
          ]}
        >
          <Text style={[type.callout, { color: palette.accent }]}>Check again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: radius.card, padding: layout.cardPadding, gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: space.md },
  button: {
    minHeight: layout.minTouch,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
});
