import { z } from 'zod';

const SignedInSession = z.object({
  user: z.object({ id: z.string().min(1), name: z.string(), email: z.string() }),
});

export type SignedInSession = z.infer<typeof SignedInSession>;

export type SessionUser = SignedInSession['user'];

/** What `useSession().data` may hold on a device: the client's types promise a user, a stale cached session has none. */
export type SessionData = { user?: Partial<SessionUser> | null } | null | undefined;

export function parseSignedInSession(data: SessionData): SignedInSession | null {
  const parsed = SignedInSession.safeParse(data);

  return parsed.success ? parsed.data : null;
}
