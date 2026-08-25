/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SplashScreen from '../src/screens/Splash/SplashScreen';
import UserSubmitScreen from '../src/screens/UserSubmit/UserSubmitScreen';

test('opens User Submit after the splash delay', async () => {
  jest.useFakeTimers();
  const navigation = {replace: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SplashScreen navigation={navigation} />);
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(1500);
  });

  expect(navigation.replace).toHaveBeenCalledWith('UserSubmit');

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
  jest.useRealTimers();
});

test('opens Register only for Employee ID 1234', async () => {
  const navigation = {navigate: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <UserSubmitScreen navigation={navigation} />,
    );
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'user-id-input'}).props.onChangeText('9999');
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'submit-user-id'}).props.onPress();
  });
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(renderer!.root.findByProps({children: 'Invalid User ID'})).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'role-employee'}).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'user-id-input'}).props.onChangeText('1234');
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'submit-user-id'}).props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledWith('Register');

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('opens Admin Dashboard only for Admin ID 4321', async () => {
  const navigation = {navigate: jest.fn()};
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <UserSubmitScreen navigation={navigation} />,
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'user-id-input'}).props.onChangeText('4321');
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({testID: 'submit-user-id'}).props.onPress();
  });

  expect(navigation.navigate).toHaveBeenCalledWith('AdminDashboard');

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});
