import { uuidv7 } from './uuidv7.ts';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

it('is a version 7 UUID with the RFC variant', () => {
  for (let index = 0; index < 50; index += 1) {
    expect(uuidv7()).toMatch(UUID_V7);
  }
});

it('stores the given millisecond time in the first 48 bits', () => {
  const now = Date.UTC(2026, 10, 19, 18, 30, 15, 123);

  expect(Number.parseInt(uuidv7(now).replaceAll('-', '').slice(0, 12), 16)).toBe(now);
});

it('sorts later ids later as strings', () => {
  const now = Date.UTC(2026, 10, 19);

  expect(uuidv7(now + 1) > uuidv7(now)).toBe(true);
  expect(uuidv7(now + 60_000) > uuidv7(now + 1)).toBe(true);
});

it('gives two ids made at the same time different values', () => {
  expect(uuidv7(1_000)).not.toBe(uuidv7(1_000));
});
