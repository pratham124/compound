import { parseSignedInSession } from './signedInSession.ts';

const user = { id: 'u1', name: 'Pratham', email: 'p@example.com' };

describe('parseSignedInSession', () => {
  it('keeps a session with a user', () => {
    expect(parseSignedInSession({ user })).toEqual({ user });
  });

  it('treats null as signed out', () => {
    expect(parseSignedInSession(null)).toBeNull();
  });

  it('treats a session without a user as signed out', () => {
    expect(parseSignedInSession({})).toBeNull();
  });

  it('treats a user without an id as signed out', () => {
    expect(parseSignedInSession({ user: { name: 'Pratham', email: 'p@example.com' } })).toBeNull();
  });
});
