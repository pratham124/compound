import type { Exercise } from '@compound/contracts';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItemInfo } from 'react-native';

import { Blob } from '../components/Blob.tsx';
import { groupRow } from '../components/groupRow.ts';
import { PressableScale } from '../components/PressableScale.tsx';
import { chatButton, layout, radius, space, type, type Palette } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { displayEquipment, muscleGroups, searchExercises, type MuscleGroup } from './catalogue.ts';

export const DUMBBELL_ICON = 'M6 5v14 M3 8v8 M18 5v14 M21 8v8 M6 12h12';

type SelectExercise = (id: Exercise['id']) => void;

const exerciseKey = (exercise: Exercise) => exercise.id;

export const ExerciseRow = memo(function ExerciseRow({ id, name, equipment, palette, onSelect, first = true, last = true }: {
  id: Exercise['id']; name: string; equipment: string | null; palette: Palette; onSelect: SelectExercise;
  first?: boolean; last?: boolean;
}) {
  const select = useCallback(() => onSelect(id), [id, onSelect]);
  const subtitle = displayEquipment(equipment);

  return (
    <View style={[styles.group, first ? styles.groupFirst : null, last ? styles.groupLast : null, { backgroundColor: palette.card }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${subtitle}`}
        haptic="none"
        onPress={select}
        style={[groupRow, styles.row]}
      >
        <Blob tint={palette.accentSoft} stroke={palette.accent} iconPath={DUMBBELL_ICON} />
        <View style={styles.rowText}>
          <Text style={[type.headline, { color: palette.label }]}>{name}</Text>
          <Text style={[type.subheadline, { color: palette.secondary }]}>{subtitle}</Text>
        </View>
        <Text accessible={false} style={[type.title2, { color: palette.secondary }]}>{'›'}</Text>
      </PressableScale>
    </View>
  );
});

export function ExerciseList({ onSelect }: { onSelect: SelectExercise }) {
  const { palette } = useAppearance();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('All');
  const results = useMemo(() => searchExercises({ query, muscle }), [query, muscle]);

  const renderExercise = useCallback(({ item, index }: ListRenderItemInfo<Exercise>) => (
    <ExerciseRow id={item.id} name={item.name} equipment={item.equipment} palette={palette} onSelect={onSelect} first={index === 0} last={index === results.length - 1} />
  ), [onSelect, palette, results.length]);

  return (
    <FlatList
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      data={results}
      renderItem={renderExercise}
      keyExtractor={exerciseKey}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      ListHeaderComponent={(
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[type.largeTitle, { color: palette.label }]}>Exercises</Text>
          <TextInput
            accessibilityLabel="Search exercises"
            placeholder="Search exercises"
            placeholderTextColor={palette.secondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={[type.body, styles.search, { backgroundColor: palette.card, color: palette.label }]}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {muscleGroups.map((group) => (
              <PressableScale
                key={group}
                accessibilityRole="button"
                accessibilityLabel={group}
                accessibilityState={{ selected: group === muscle }}
                haptic="none"
                onPress={() => setMuscle(group)}
                style={[styles.chip, { backgroundColor: group === muscle ? palette.accent : palette.card }]}
              >
                <Text style={[type.subheadline, { color: group === muscle ? palette.onAccent : palette.label }]}>{group}</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={[type.headline, { color: palette.label }]}>No matching exercises</Text>
          <Text style={[type.subheadline, { color: palette.secondary }]}>Try another name or muscle.</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenMargin, paddingTop: space.xxl, paddingBottom: chatButton.touch + space.xxl },
  header: { gap: space.md, paddingBottom: space.md },
  search: { minHeight: layout.minTouch, borderRadius: radius.field, paddingHorizontal: space.md, paddingVertical: space.sm },
  filters: { gap: space.sm },
  chip: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.capsule },
  group: { paddingHorizontal: space.sm, paddingBottom: layout.groupGap },
  groupFirst: { paddingTop: space.sm, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  groupLast: { paddingBottom: space.sm, borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: space.xxs },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
});
