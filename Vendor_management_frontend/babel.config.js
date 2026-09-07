module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-reanimated/plugin (proxies to react-native-worklets/plugin, 81KB AST visitor)
    // is NOT included here because no app file uses Reanimated v2/v3/v4 APIs or the 'worklet'
    // directive — all animations use React Native's built-in Animated API.
    // Add it back only if you introduce useSharedValue/useAnimatedStyle/worklet functions.
    plugins: [],
  };
};
