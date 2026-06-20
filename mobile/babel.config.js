module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated v4 relies on the Worklets Babel plugin to
    // transform its worklet functions. It must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
