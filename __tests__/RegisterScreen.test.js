import React from 'react';
import {act, create} from 'react-test-renderer';
import {TextInput} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegisterScreen from '../src/screens/Register/RegisterScreen';
import {fetchEmployeeDetails, getFilteredEmployees} from '../src/services/employeeRegistrationApi';

jest.mock('@react-native-async-storage/async-storage', () => ({getItem: jest.fn(), setItem: jest.fn()}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({useFocusEffect: callback => require('react').useEffect(callback, [callback])}));
jest.mock('../src/services/biometricApi', () => ({getRegisteredBiometric: jest.fn(async () => null)}));
jest.mock('../src/services/backendFaceService', () => ({decodeBackendEmbedding: jest.fn()}));
jest.mock('../src/components/AppHeader', () => 'AppHeader');
jest.mock('../src/context/AdminSessionContext', () => ({useAdminSession: () => ({companyId: 1, isSessionLoading: false})}));
jest.mock('../src/services/employeeRegistrationApi', () => ({fetchEmployeeDetails: jest.fn(), getFilteredEmployees: jest.fn()}));

test('suggests matching employees, saves selected and unmatched searches, and reloads history', async () => {
  const employee = {id: 15, employeeId: 'EMP15', employeeName: 'Alice'};
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['OLD']));
  AsyncStorage.setItem.mockResolvedValue();
  getFilteredEmployees.mockResolvedValue([employee]);
  fetchEmployeeDetails.mockResolvedValueOnce([employee]).mockResolvedValueOnce([]);
  let screen;
  await act(async () => { screen = create(<RegisterScreen navigation={{goBack: jest.fn()}} />); });
  expect(JSON.stringify(screen.toJSON())).toContain('OLD');
  await act(async () => { screen.root.findByType(TextInput).props.onChangeText('ali'); });
  expect(JSON.stringify(screen.toJSON())).toContain('Alice');
  const suggestion = screen.root.findAll(item => item.props.accessibilityLabel === 'Select employee EMP15' && typeof item.props.onPress === 'function')[0];
  await act(async () => { suggestion.props.onPress(); });
  expect(fetchEmployeeDetails).toHaveBeenLastCalledWith(1, 'EMP15');
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@hems/employee-search-history/1', JSON.stringify(['EMP15', 'OLD']));
  await act(async () => { screen.root.findByType(TextInput).props.onChangeText('missing'); });
  await act(async () => { screen.root.findByType(TextInput).props.onSubmitEditing(); });
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@hems/employee-search-history/1', JSON.stringify(['missing', 'EMP15', 'OLD']));
  expect(JSON.stringify(screen.toJSON())).toContain('Employee not found');
  await act(async () => { screen.unmount(); });
});
