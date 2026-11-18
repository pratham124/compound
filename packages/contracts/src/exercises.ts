import { z } from 'zod';

export const Exercise = z.object({
  id: z.string().min(1).brand<'ExerciseId'>(),
  name: z.string().min(1),
  force: z.string().nullable(),
  level: z.string(),
  mechanic: z.string().nullable(),
  equipment: z.string().nullable(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  category: z.string(),
  images: z.array(z.string().regex(/^[A-Za-z0-9_()/' .-]+\/\d+\.jpg$/)),
});

export type Exercise = z.infer<typeof Exercise>;

export const ExerciseCatalogue = z.array(Exercise);
