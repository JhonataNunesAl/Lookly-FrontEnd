module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource tells Babel to inject NativeWind's JSX transform
      // so className is resolved at compile time on every component
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated plugin must always be last
      'react-native-reanimated/plugin',
    ],
  };
};
