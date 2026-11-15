const path = require('node:path');

// These are the rules of react-native-reanimated/jest/resolver.js (4.7.1) and the Worklets resolver it calls,
// which pick a package's web build when its name appears anywhere in the path. On Linux pnpm names folders after
// their peers (react-native-reanimated@4.7.1_react-native-worklets@0.13.0_..., expo-modules-core@..._react-native-worklets@...),
// so that also sent Reanimated's and Expo's native code to the web build. Here they match the package folder itself.
const REANIMATED_WEB_ONLY = [
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
];

function packageOf(dir) {
  const parts = dir.split(/[\\/]/);
  const at = parts.lastIndexOf('node_modules');

  return at === -1 ? undefined : parts[at + 1];
}

function isReanimatedWebOnly(request) {
  return REANIMATED_WEB_ONLY.some((entry) =>
    entry.includes('/') ? request.endsWith(entry) : path.posix.basename(request) === entry,
  );
}

module.exports = (request, options) => {
  const owner = packageOf(options.basedir);

  // Under Jest there is no UI runtime, so Gesture Handler's native install step throws after the test ends.
  // Its web variant is a no-op, so resolve to that.
  if (request === './installUIRuntimeBindings' && owner === 'react-native-gesture-handler') {
    return options.defaultResolver('./installUIRuntimeBindings.web', options);
  }

  const webBuild =
    (owner === 'react-native-reanimated' && request.startsWith('.') && isReanimatedWebOnly(request)) ||
    owner === 'react-native-worklets' ||
    request === 'react-native-worklets' ||
    request.startsWith('react-native-worklets/');

  if (!webBuild) {
    return options.defaultResolver(request, options);
  }

  return options.defaultResolver(request, {
    ...options,
    extensions: options.extensions?.filter((ext) => !ext.includes('native')),
  });
};
