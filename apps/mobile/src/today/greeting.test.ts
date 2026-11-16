import { dateLineFor, greetingFor } from './greeting.ts';

/** A local-time moment on Saturday 7 November 2026. */
function at(hour: number, minute = 0) {
  return new Date(2026, 10, 7, hour, minute);
}

describe('greetingFor', () => {
  it.each([
    [0, 0, 'Good morning, Pratham.'],
    [11, 59, 'Good morning, Pratham.'],
    [12, 0, 'Good afternoon, Pratham.'],
    [17, 59, 'Good afternoon, Pratham.'],
    [18, 0, 'Good evening, Pratham.'],
    [23, 59, 'Good evening, Pratham.'],
  ])('at %i:%i says %s', (hour, minute, expected) => {
    expect(greetingFor({ now: at(hour, minute), name: 'Pratham' })).toBe(expected);
  });

  it('uses only the first word of the name', () => {
    expect(greetingFor({ now: at(9), name: '  Pratham Sitoula ' })).toBe('Good morning, Pratham.');
  });

  it('leaves out the comma and name when there is no name', () => {
    expect(greetingFor({ now: at(9), name: '' })).toBe('Good morning.');
    expect(greetingFor({ now: at(19), name: '   ' })).toBe('Good evening.');
  });
});

describe('dateLineFor', () => {
  it('writes the weekday, day and month with no year', () => {
    expect(dateLineFor(at(9))).toBe('Saturday, 7 November');
  });
});
