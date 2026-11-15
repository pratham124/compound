import { z } from 'zod';

/** Digits in the code emailed to sign in. The server issues it and the phone checks its input against it. */
export const EMAIL_CODE_LENGTH = 6;

export const UserId = z.uuid().brand<'UserId'>();

export type UserId = z.infer<typeof UserId>;

export const Me = z.object({
  id: UserId,
  name: z.string(),
  email: z.email(),
});

export type Me = z.infer<typeof Me>;

export const Unauthenticated = z.object({ error: z.literal('unauthenticated') });

export type Unauthenticated = z.infer<typeof Unauthenticated>;
