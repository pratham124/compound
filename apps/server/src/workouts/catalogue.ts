import { ExerciseCatalogue } from '@compound/contracts';
import { readFileSync } from 'node:fs';

export const exercises = ExerciseCatalogue.parse(JSON.parse(readFileSync(new URL(import.meta.resolve('@compound/exercise-catalogue/catalogue.json')), 'utf8')));

const byId = new Map(exercises.map((exercise) => [exercise.id.toString(), exercise]));

export function findExercise(id: string) {
  return byId.get(id);
}
