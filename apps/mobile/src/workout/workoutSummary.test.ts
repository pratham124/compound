import { durationText, workoutDateText } from './workoutSummary.ts';

describe('durationText', () => {
  it('says Under 1 min below a minute', () => {
    expect(durationText({ startedAt: 1_000, finishedAt: 1_000 + 59_999 })).toBe('Under 1 min');
  });

  it('rounds down to whole minutes', () => {
    expect(durationText({ startedAt: 0, finishedAt: 60_000 })).toBe('1 min');
    expect(durationText({ startedAt: 0, finishedAt: 125_000 })).toBe('2 min');
  });

  it('switches to hours from an hour on, dropping zero minutes', () => {
    expect(durationText({ startedAt: 0, finishedAt: 59 * 60_000 })).toBe('59 min');
    expect(durationText({ startedAt: 0, finishedAt: 60 * 60_000 })).toBe('1 h');
    expect(durationText({ startedAt: 0, finishedAt: 95 * 60_000 })).toBe('1 h 35 min');
  });

  it('treats an unfinished or backwards workout as under a minute', () => {
    expect(durationText({ startedAt: 5_000, finishedAt: null })).toBe('Under 1 min');
    expect(durationText({ startedAt: 5_000, finishedAt: 1_000 })).toBe('Under 1 min');
  });
});

describe('workoutDateText', () => {
  const now = new Date(2026, 11, 1);

  it('names the weekday, day and month of the start, without a year, in the current year', () => {
    expect(workoutDateText(new Date(2026, 10, 19, 18, 30).getTime(), now)).toBe('Thursday, 19 November');
  });

  it('adds the year when the workout is from another year', () => {
    expect(workoutDateText(new Date(2025, 10, 19, 18, 30).getTime(), now)).toBe('Wednesday, 19 November 2025');
  });
});
