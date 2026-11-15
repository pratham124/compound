const reanimatedResolver = require('react-native-reanimated/jest/resolver');

// Under Jest there is no UI runtime, so Gesture Handler's native install step throws after the test ends.
// Its web variant is a no-op, so resolve to that.
module.exports = (request, options) => {
  if (request === './installUIRuntimeBindings' && options.basedir.includes('react-native-gesture-handler')) {
    return options.defaultResolver('./installUIRuntimeBindings.web', options);
  }

  return reanimatedResolver(request, options);
};
