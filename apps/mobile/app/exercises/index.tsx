import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { Exercise } from '@compound/contracts';

import { ExerciseList } from '../../src/exercises/ExerciseList.tsx';

export default function ExercisesScreen() {
  const router = useRouter();
  const select = useCallback((id: Exercise['id']) => router.push({ pathname: '/exercises/[id]', params: { id } }), [router]);

  return <ExerciseList onSelect={select} />;
}
