import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AdminDashboardScreen from '../src/screens/Admin/AdminDashboardScreen';

jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

test('dashboard rerenders for clock updates without changing hook order', async () => {
  jest.useFakeTimers();
  const navigation = {navigate: jest.fn()};
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<AdminDashboardScreen navigation={navigation} />);
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
      renderer.update(<AdminDashboardScreen navigation={navigation} />);
    });
    expect(renderer.toJSON()).toBeTruthy();
  } finally {
    await ReactTestRenderer.act(async () => renderer?.unmount());
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});
