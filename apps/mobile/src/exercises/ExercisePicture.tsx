import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../components/PressableScale.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

const IMAGE_ROOT = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/';

export function ExercisePicture({ path, label }: { path: string; label: string }) {
  const { palette } = useAppearance();
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const uri = IMAGE_ROOT + path.split('/').map(encodeURIComponent).join('/');

  return (
    <View style={[styles.frame, { backgroundColor: palette.card }]}>
      <Image
        key={attempt}
        accessible
        accessibilityLabel={label}
        source={{ uri, cacheKey: uri }}
        cachePolicy="memory-disk"
        contentFit="contain"
        style={styles.image}
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
      />
      {state === 'loading' ? <Text style={[type.footnote, styles.note, { color: palette.secondary }]}>Pictures download on first view.</Text> : null}
      {state === 'failed' ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Retry ${label}`}
          onPress={() => {
            setState('loading');
            setAttempt((value) => value + 1);
          }}
          style={styles.retry}
        >
          <Text style={[type.footnote, { color: palette.accent }]}>Picture unavailable. Connect and tap to retry.</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: radius.tile, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1 },
  note: { padding: space.sm },
  retry: { minHeight: layout.minTouch, justifyContent: 'center', padding: space.sm },
});
