module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          src: './src',
        },
      },
    ],
    'react-native-reanimated/plugin', // must be last
    'react-native-worklets-core/plugin',
  ],
};
