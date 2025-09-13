module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin' // Reanimated 4 for SDK 54 (must be last)
    ],
  };
};