import { ExerciseCatalogue } from '@compound/contracts';

import catalogue from './catalogue.json';

export const exercises = ExerciseCatalogue.parse(catalogue).sort((a, b) => a.name.localeCompare(b.name, 'en'));

export const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

export type MuscleGroup = (typeof muscleGroups)[number];

const muscles: Record<MuscleGroup, readonly string[]> = {
  All: [],
  Chest: ['chest'],
  Back: ['lats', 'middle back', 'lower back', 'traps', 'neck'],
  Legs: ['quadriceps', 'hamstrings', 'calves', 'glutes', 'adductors', 'abductors'],
  Shoulders: ['shoulders'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Core: ['abdominals'],
};

const searchable = exercises.map((exercise) => ({ exercise, name: exercise.name.toLowerCase() }));
const byId = new Map(exercises.map((exercise) => [exercise.id.toString(), exercise]));

export function searchExercises({ query, muscle }: { query: string; muscle: MuscleGroup }) {
  const name = query.trim().toLowerCase();

  return searchable.flatMap(({ exercise, name: exerciseName }) =>
    exerciseName.includes(name) && (muscle === 'All' || exercise.primaryMuscles.some((value) => muscles[muscle].includes(value)))
      ? [exercise]
      : [],
  );
}

export function findExercise(id: string) {
  return byId.get(id);
}

export function displayEquipment(equipment: string | null) {
  return equipment === null ? 'No equipment listed' : equipment.charAt(0).toUpperCase() + equipment.slice(1);
}
