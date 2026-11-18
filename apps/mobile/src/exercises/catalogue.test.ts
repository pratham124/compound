import { exercises, findExercise, searchExercises } from './catalogue.ts';

describe('bundled exercise catalogue', () => {
  it('browses every bundled exercise alphabetically without a server', () => {
    const results = searchExercises({ query: '', muscle: 'All' });

    expect(results.length).toBeGreaterThan(800);
    expect(results).toHaveLength(exercises.length);
    expect(results[0]?.name).toBe('3/4 Sit-Up');
    expect(new Set(results.map(({ id }) => id)).size).toBe(results.length);
  });

  it('searches names case-insensitively and trims surrounding spaces', () => {
    expect(searchExercises({ query: '  iNcLiNe DuMbBeLl PrEsS  ', muscle: 'All' }).map(({ id }) => id))
      .toEqual(['Incline_Dumbbell_Press']);
    expect(searchExercises({ query: 'no such exercise at all', muscle: 'All' })).toEqual([]);
  });

  it('combines the muscle filter with a name search', () => {
    const results = searchExercises({ query: 'press', muscle: 'Chest' });

    expect(results.map(({ id }) => id)).toContain('Incline_Dumbbell_Press');
    expect(results.map(({ id }) => id)).not.toContain('Dumbbell_Shoulder_Press');
    expect(searchExercises({ query: '', muscle: 'Core' }).map(({ id }) => id)).toContain('3_4_Sit-Up');
  });

  it('looks up the stable exercise id and handles an unknown link', () => {
    expect(findExercise('Incline_Dumbbell_Press')?.name).toBe('Incline Dumbbell Press');
    expect(findExercise('not-an-exercise')).toBeUndefined();
  });
});
