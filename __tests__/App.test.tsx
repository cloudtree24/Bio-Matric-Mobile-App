/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SplashScreen from '../src/screens/Splash/SplashScreen';
import RegisterScreen from '../src/screens/Register/RegisterScreen';

jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/context/AdminSessionContext', () => ({
  useAdminSession: jest.fn(() => ({isAdminLoggedIn: false, isSessionLoading: false})),
}));

const {useAdminSession} = require('../src/context/AdminSessionContext');

afterEach(() => {
  useAdminSession.mockReturnValue({isAdminLoggedIn: false, isSessionLoading: false});
});

test('opens Admin Login after the splash delay', async () => {
  jest.useFakeTimers();
  const navigation = {replace: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SplashScreen navigation={navigation} />);
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(1500);
  });

  expect(navigation.replace).toHaveBeenCalledWith('AdminLogin');

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
  jest.useRealTimers();
});

test('opens Admin Dashboard for a restored session', async () => {
  jest.useFakeTimers();
  useAdminSession.mockReturnValue({isAdminLoggedIn: true, isSessionLoading: false});
  const navigation = {replace: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SplashScreen navigation={navigation} />);
    jest.advanceTimersByTime(1500);
  });
  await ReactTestRenderer.act(async () => { jest.advanceTimersByTime(1500); });
  expect(navigation.replace).toHaveBeenCalledWith('AdminDashboard');
  await ReactTestRenderer.act(async () => { renderer!.unmount(); });
  jest.useRealTimers();
});

test('opens face enrollment from Face Register', async () => {
  const navigation = {navigate: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <RegisterScreen navigation={navigation} />,
    );
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({accessibilityLabel: 'Face Register'}).props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledWith('EnrollmentIdentity');

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});
