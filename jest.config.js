module.exports = {
  preset: '@react-native/jest-preset',
  watchman: false,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|react-native-vector-icons)/)',
  ],
};
