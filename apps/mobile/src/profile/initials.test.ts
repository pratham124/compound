import { initialsOf } from './initials.ts';

describe('initialsOf', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initialsOf('Pratham Sitoula')).toBe('PS');
    expect(initialsOf('ana maría de la cruz')).toBe('AC');
  });

  it('gives one letter for a one-word name', () => {
    expect(initialsOf('Pratham')).toBe('P');
  });

  it('gives nothing for a blank name', () => {
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
  });

  it('gives nothing when the name starts with an emoji or symbol', () => {
    expect(initialsOf('😀 Pratham')).toBe('');
    expect(initialsOf('(Pratham)')).toBe('');
  });

  it('keeps the marks on a letter written as a base letter plus a combining accent', () => {
    expect(initialsOf('élodie dupont')).toBe('ÉD');
  });
});
