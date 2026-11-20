import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { ScrollViewInstance } from 'react-native';

import { space } from '../theme/tokens.ts';
import type { WorkoutExercise, WorkoutExerciseId } from './workout.ts';

type JumpToCardOptions = {
  cards: readonly WorkoutExercise[];
  focus: WorkoutExerciseId | null;
  onFocusHandled: () => void;
};

type Flash = { id: WorkoutExerciseId | null; token: number };

export function useJumpToCard({ cards, focus, onFocusHandled }: JumpToCardOptions) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const tops = useRef(new Map<WorkoutExerciseId, number>());
  const waiting = useRef<WorkoutExerciseId | null>(null);
  const [flash, setFlash] = useState<Flash>({ id: null, token: 0 });

  function show(id: WorkoutExerciseId) {
    const top = tops.current.get(id);

    if (top === undefined) {
      waiting.current = id;

      return;
    }

    waiting.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(0, top - space.md), animated: !reduceMotion });
    setFlash((previous) => ({ id, token: previous.token + 1 }));
    onFocusHandled();
  }

  useEffect(() => {
    if (focus === null) {
      return;
    }

    if (cards.some((card) => card.id === focus)) {
      show(focus);
    } else {
      onFocusHandled();
    }
  }, [focus]);

  function onCardLaidOut(id: WorkoutExerciseId, top: number) {
    tops.current.set(id, top);

    if (waiting.current === id) {
      show(id);
    }
  }

  function flashTokenFor(id: WorkoutExerciseId) {
    return flash.id === id ? flash.token : 0;
  }

  return { scrollRef, flashTokenFor, onCardLaidOut };
}
