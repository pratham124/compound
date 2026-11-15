module.exports = {
  preset: 'jest-expo',
  // <rootDir> inside a glob breaks on Windows paths with a dot folder (Jest keeps the `\` before `.`),
  // so anchor with roots instead, and fail rather than pass when nothing matches.
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  passWithNoTests: false,
  // better-auth ships ES modules only (some as .mjs), which Jest can't load until Babel compiles them.
  // The pattern is the preset's own, plus better-auth and what it pulls in.
  transform: { '\\.mjs$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|better-auth|@better-auth|@better-fetch|nanostores|better-call))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  resolver: '<rootDir>/jest.resolver.js',
  // AsyncStorage's own in-memory stand-in, because the native module doesn't exist under Node.
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};
