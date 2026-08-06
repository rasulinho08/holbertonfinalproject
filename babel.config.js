module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    // `babel-preset-expo` already appends react-native-worklets/plugin when
    // Reanimated is installed. Keep this array last if anything is added here.
    plugins: [],
  };
};
