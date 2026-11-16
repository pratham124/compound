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

export const Units = z.enum(['metric', 'imperial']);

export type Units = z.infer<typeof Units>;

// A leading letter rules out UTC offsets such as +05:00, which Intl accepts but Postgres reads with the opposite sign.
const TIME_ZONE_NAME = /^[A-Za-z][A-Za-z0-9_+/-]*$/;

function canonicalTimeZone(value: string): string | null {
  if (!TIME_ZONE_NAME.test(value)) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** A real time zone name, stored in Intl's canonical spelling (so `america/toronto` becomes `America/Toronto`). */
export const TimeZone = z
  .codec(z.string(), z.string(), {
    decode: (value, context) => {
      const canonical = canonicalTimeZone(value);

      if (canonical === null) {
        context.issues.push({ code: 'custom', message: 'Not a time zone name', input: value });

        return z.NEVER;
      }

      return canonical;
    },
    encode: (value) => value,
  })
  .brand<'TimeZone'>();

export type TimeZone = z.infer<typeof TimeZone>;

export const Profile = z.object({ timeZone: TimeZone, units: Units });

export type Profile = z.infer<typeof Profile>;

/** The phone's own time zone, used only when the person's profile is first created. */
export const ProfileQuery = z.object({ timeZone: TimeZone.optional() });

export type ProfileQuery = z.infer<typeof ProfileQuery>;

export const ProfileUpdate = z.object({ units: Units });

export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
