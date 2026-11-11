import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {TextInput} from 'react-native';
import FaceCheckInTestScreen from '../src/screens/FaceRegistration/FaceCheckInTestScreen';
import {getRegisteredBiometric} from '../src/services/biometricApi';
import {fetchEmployeeDetails} from '../src/services/employeeRegistrationApi';
import {saveAttendance} from '../src/services/attendanceApi';
import {verifyBackendFace} from '../src/services/backendFaceService';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../src/context/AdminSessionContext', () => ({useAdminSession: () => ({companyId: 1})}));
jest.mock('../src/components/FaceCamera', () => 'FaceCamera');
jest.mock('../src/hooks/useCameraPermission', () => ({useCameraPermission: () => ({cameraPermissionStatus: 'granted', requestCameraPermission: jest.fn()})}));
jest.mock('../src/services/faceRecognitionService', () => ({__esModule: true, default: {loadModel: jest.fn().mockResolvedValue({})}}));
jest.mock('../src/services/biometricApi', () => ({getRegisteredBiometric: jest.fn()}));
jest.mock('../src/services/employeeRegistrationApi', () => ({fetchEmployeeDetails: jest.fn()}));
jest.mock('../src/services/attendanceApi', () => ({buildAttendancePayload: employeeId => ({EmployeeId: employeeId}), saveAttendance: jest.fn()}));
jest.mock('../src/services/backendFaceService', () => ({decodeBackendEmbedding: jest.fn(() => new Float32Array([1, 0])), verifyBackendFace: jest.fn()}));
let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && node.findAll(child => child.props.children === label).length)[0];
beforeEach(() => {
  jest.clearAllMocks();
  fetchEmployeeDetails.mockResolvedValue([{id: 99, employeeId: 'AA_11', employeeBiomatricDetail: {employeeId: 10}}]);
  getRegisteredBiometric.mockResolvedValue({employeeId: 10, companyId: 1, faceImage: 'image', faceEmbeding: 'embedding'});
  saveAttendance.mockResolvedValue({isSuccess: true});
  verifyBackendFace.mockReturnValue({matched: true, employeeId: 10, companyId: 1, score: 0.95, distance: 0.2});
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; });
const start = async () => {
  await act(async () => { renderer = TestRenderer.create(<FaceCheckInTestScreen navigation={{goBack: jest.fn()}} />); });
  await act(async () => renderer.root.findByType(TextInput).props.onChangeText('AA_11'));
  await act(async () => button('Start verification').props.onPress());
};
test('resolves employee code to biometric ID and only submits one verified backend check-in', async () => {
  await start();
  expect(getRegisteredBiometric).toHaveBeenCalledWith(10, 1);
  const camera = renderer.root.findByType('FaceCamera');
  await act(async () => { await Promise.all([camera.props.onComplete(new Float32Array([1, 0])), camera.props.onComplete(new Float32Array([1, 0]))]); });
  expect(saveAttendance).toHaveBeenCalledTimes(1);
  expect(saveAttendance).toHaveBeenCalledWith({EmployeeId: 10});
  expect(renderer.root.findByType('FaceCamera').props.isPaused).toBe(true);
  expect(JSON.stringify(renderer.toJSON())).toContain('Check-in successful');
});
test('missing backend registration keeps the camera closed', async () => {
  getRegisteredBiometric.mockResolvedValue(null);
  await start();
  expect(renderer.root.findAllByType('FaceCamera')).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('Face registration required');
  expect(saveAttendance).not.toHaveBeenCalled();
});
test('wrong face shows a mismatch modal and never saves attendance', async () => {
  verifyBackendFace.mockReturnValue({matched: false, employeeId: 10, score: 0.2, distance: 1.4});
  await start();
  await act(async () => renderer.root.findByType('FaceCamera').props.onComplete(new Float32Array([0, 1])));
  expect(saveAttendance).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Face does not match');
});
test('attendance failure can retry without repeating face verification', async () => {
  saveAttendance.mockRejectedValueOnce(new Error('Network unavailable'));
  await start();
  await act(async () => renderer.root.findByType('FaceCamera').props.onComplete(new Float32Array([1, 0])));
  expect(JSON.stringify(renderer.toJSON())).toContain('Face matched; check-in failed');
  await act(async () => button('Retry check-in').props.onPress());
  expect(saveAttendance).toHaveBeenCalledTimes(2);
  expect(verifyBackendFace).toHaveBeenCalledTimes(1);
});
