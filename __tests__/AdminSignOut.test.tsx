import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import AdminSignOutScreen from '../src/screens/Admin/AdminSignOutScreen';
import {useAdminSession} from '../src/context/AdminSessionContext';
import {ROUTES} from '../src/constants/routes';

jest.mock('react-native-safe-area-context', () => ({SafeAreaView: 'SafeAreaView'}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('../src/context/AdminSessionContext', () => ({useAdminSession: jest.fn()}));

test('cancel keeps the session; sign out clears it and resets navigation', async () => {
  const setIsAdminLoggedIn = jest.fn();
  (useAdminSession as jest.Mock).mockReturnValue({setIsAdminLoggedIn});
  const navigation = {goBack: jest.fn(), reset: jest.fn()};
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<AdminSignOutScreen navigation={navigation} />);
  });
  try {
    await act(async () => renderer.root.findByProps({accessibilityLabel: 'Cancel'}).props.onPress());
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(setIsAdminLoggedIn).not.toHaveBeenCalled();
    await act(async () => renderer.root.findByProps({accessibilityLabel: 'Sign out'}).props.onPress());
    expect(setIsAdminLoggedIn).toHaveBeenCalledWith(false);
    expect(navigation.reset).toHaveBeenCalledWith({index: 0, routes: [{name: ROUTES.ADMIN_LOGIN}]});
  } finally {
    await act(async () => renderer.unmount());
  }
});
