import React from 'react';
import {act, create} from 'react-test-renderer';
import FaceCameraScreen from '../src/screens/FaceRegistration/FaceCameraScreen';
import {useFaceRegistration} from '../src/hooks/useFaceRegistration';
import {getRegisteredBiometric} from '../src/services/biometricApi';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../src/components/FaceCamera', () => 'FaceCamera');
jest.mock('../src/context/AdminSessionContext', () => ({useAdminSession: () => ({companyId: 1, operatorId: 123})}));
jest.mock('../src/hooks/useCameraPermission', () => { const permission = {cameraPermissionStatus: 'granted', requestCameraPermission: jest.fn()}; return {useCameraPermission: () => permission}; });
jest.mock('../src/hooks/useFaceRegistration', () => ({useFaceRegistration: jest.fn()}));
jest.mock('../src/services/biometricApi', () => ({getRegisteredBiometric: jest.fn()}));
jest.mock('../src/services/backendFaceService', () => ({decodeBackendEmbedding: jest.fn()}));
jest.mock('../src/services/faceRecognitionService', () => ({__esModule: true, default: {loadModel: jest.fn().mockResolvedValue({})}}));
const register = jest.fn();
const checkAccess = jest.fn();
let screen;
beforeEach(() => {
  jest.clearAllMocks();
  register.mockResolvedValue({isSuccess: true});
  checkAccess.mockResolvedValue();
  useFaceRegistration.mockReturnValue({registerFace: register, checkFaceAccess: checkAccess});
  getRegisteredBiometric.mockResolvedValue({faceImage: 'image', faceEmbeding: 'embedding'});
});
afterEach(async () => { if (screen) await act(async () => screen.unmount()); screen = null; });
const open = async () => {
  await act(async () => { screen = create(<FaceCameraScreen navigation={{goBack: jest.fn()}} route={{params: {employeeId: 10, companyId: 1}}} />); });
};
test('posts captured samples with operator identity and confirms saved registration', async () => {
  await open();
  const complete = screen.root.findByType('FaceCamera').props.onComplete;
  await act(async () => { await complete([{faceImage: 'capture'}]); });
  expect(register).toHaveBeenCalledWith({faces: [{faceImage: 'capture'}], companyId: 1, employeeId: 10, modifiedBy: 123});
  expect(getRegisteredBiometric).toHaveBeenCalledWith(10, 1);
  expect(JSON.stringify(screen.toJSON())).toContain('Registration successful');
});
test('refresh retry after a successful save does not post the registration again', async () => {
  getRegisteredBiometric.mockRejectedValueOnce(new Error('Network unavailable'));
  await open();
  await act(async () => screen.root.findByType('FaceCamera').props.onComplete([{faceImage: 'capture'}]));
  expect(JSON.stringify(screen.toJSON())).toContain('refresh pending');
  const retry = screen.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && node.findAll(child => child.props.children === 'Try again').length)[0];
  await act(async () => retry.props.onPress());
  expect(register).toHaveBeenCalledTimes(1);
  expect(getRegisteredBiometric).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(screen.toJSON())).toContain('Registration successful');
});
