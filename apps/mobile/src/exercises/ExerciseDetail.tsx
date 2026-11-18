import type { Exercise } from '@compound/contracts';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { chatButton, layout, radius, space, type, type Palette } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { displayEquipment } from './catalogue.ts';
import { ExercisePicture } from './ExercisePicture.tsx';

export function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const { palette } = useAppearance();
  const stacked = useWindowDimensions().fontScale >= layout.largerTextFrom;

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={[type.largeTitle, { color: palette.label }]}>{exercise.name}</Text>
      <View style={styles.pictures}>
        {exercise.images.map((path, index) => <ExercisePicture key={path} path={path} label={`${exercise.name}, picture ${index + 1} of ${exercise.images.length}`} />)}
      </View>
      <View style={[styles.metadataGroup, { backgroundColor: palette.card }]}>
        <MetadataRow label="Primary muscle" value={exercise.primaryMuscles.map(displayEquipment).join(', ') || 'No muscle listed'} palette={palette} stacked={stacked} />
        <MetadataRow label="Equipment" value={displayEquipment(exercise.equipment)} palette={palette} stacked={stacked} />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[type.footnote, styles.sectionHeader, { color: palette.secondary }]}>How to do it</Text>
        <View style={[styles.card, { backgroundColor: palette.card }]}>
          {exercise.instructions.map((instruction, index) => (
            <View
              key={`${index}-${instruction}`}
              accessible
              accessibilityLabel={`Step ${index + 1}. ${instruction}`}
              style={[styles.step, index > 0 ? [styles.stepDivided, { borderTopColor: palette.separator }] : null]}
            >
              <View style={[styles.stepNumber, { backgroundColor: palette.accentSoft }]}>
                <Text maxFontSizeMultiplier={1.5} style={[styles.stepNumberText, { color: palette.accent }]}>{index + 1}</Text>
              </View>
              <Text style={[type.callout, styles.instruction, { color: palette.label }]}>{instruction}</Text>
            </View>
          ))}
          {exercise.instructions.length === 0 ? <Text style={[type.callout, styles.step, { color: palette.secondary }]}>No instructions listed.</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function MetadataRow({ label, value, palette, stacked }: { label: string; value: string; palette: Palette; stacked: boolean }) {
  return (
    <View style={[styles.metadata, stacked ? styles.metadataStacked : null]}>
      <Text style={[type.body, styles.metadataLabel, { color: palette.secondary }]}>{label}</Text>
      <Text style={[type.body, styles.metadataValue, stacked ? styles.metadataValueStacked : null, { color: palette.label }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, padding: layout.screenMargin, paddingTop: space.xxl, paddingBottom: chatButton.touch + space.xxl },
  pictures: { flexDirection: 'row', gap: space.sm },
  section: { marginTop: space.xs, gap: 6 },
  sectionHeader: { paddingHorizontal: space.lg },
  card: { borderRadius: radius.card, paddingHorizontal: space.lg, paddingVertical: 6 },
  step: { flexDirection: 'row', gap: space.md, paddingVertical: 10 },
  stepDivided: { borderTopWidth: 1 },
  stepNumber: { minWidth: 24, minHeight: 24, marginTop: 1, paddingHorizontal: space.xs, borderRadius: radius.capsule, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  stepNumberText: { fontFamily: type.callout.fontFamily, fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  instruction: { flex: 1 },
  metadataGroup: { borderRadius: radius.card, padding: space.sm, gap: layout.groupGap },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: layout.minTouch, paddingHorizontal: layout.cardPadding, paddingVertical: 10 },
  metadataStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: space.xxs },
  metadataLabel: { flexShrink: 1 },
  metadataValue: { flex: 1, textAlign: 'right', fontWeight: '600' },
  metadataValueStacked: { flex: 0, textAlign: 'left' },
});
