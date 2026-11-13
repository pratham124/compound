module.exports = {
  preset: 'jest-expo',
  // <rootDir> inside a glob breaks on Windows paths with a dot folder (Jest keeps the `\` before `.`),
  // so anchor with roots instead, and fail rather than pass when nothing matches.
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  passWithNoTests: false,
};
