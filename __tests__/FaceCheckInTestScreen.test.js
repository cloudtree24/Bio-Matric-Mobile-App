import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import FaceCheckInTestScreen from '../src/screens/FaceRegistration/FaceCheckInTestScreen';
import {getAllLocalFaces} from '../src/services/localFaceStorage';
import {saveLocalAttendance} from '../src/services/localAttendanceStorage';

jest.mock('../src/components/FaceCamera', () => 'FaceCamera');
jest.mock('../src/services/apiClient', () => ({__esModule: true, default: {post: jest.fn()}}));
jest.mock('../src/hooks/useCameraPermission', () => ({useCameraPermission: () => ({cameraPermissionStatus: 'granted', requestCameraPermission: jest.fn()})}));
jest.mock('../src/services/faceRecognitionService', () => ({__esModule: true, default: {loadModel: jest.fn().mockResolvedValue({})}}));
jest.mock('../src/services/localFaceStorage', () => ({getAllLocalFaces: jest.fn()}));
jest.mock('../src/services/localAttendanceStorage', () => ({saveLocalAttendance: jest.fn().mockResolvedValue({isSuccess: true})}));

let renderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  renderer = null;
  jest.clearAllMocks();
});

test('opens the camera automatically and checks in the identified employee under their company', async () => {
  getAllLocalFaces.mockResolvedValue([
    {companyId: 'C1', employeeId: 'E1', faces: [{embedding: new Float32Array([1, 0])}]},
    {companyId: 'C2', employeeId: 'E2', faces: [{embedding: new Float32Array([0, 1])}]},
  ]);
  await act(async () => { renderer = TestRenderer.create(<FaceCheckInTestScreen navigation={{goBack: jest.fn()}} />); });
  expect(getAllLocalFaces).toHaveBeenCalledTimes(1);
  const camera = renderer.root.findByType('FaceCamera');
  expect(camera.props.mode).toBe('recognition');
  await act(async () => { await camera.props.onComplete(new Float32Array([0, 1])); });
  expect(saveLocalAttendance).toHaveBeenCalledWith('C2', expect.objectContaining({EmployeeId: 'E2'}));
  expect(renderer.root.findByType('FaceCamera').props.isPaused).toBe(true);
  const again = renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.findAll(child => child.props.children === 'Test again').length > 0)[0];
  await act(async () => again.props.onPress());
  expect(renderer.root.findByType('FaceCamera').props.isPaused).toBe(false);
});

test('shows registration guidance when no faces are saved', async () => {
  getAllLocalFaces.mockResolvedValue([]);
  await act(async () => { renderer = TestRenderer.create(<FaceCheckInTestScreen navigation={{goBack: jest.fn()}} />); });
  expect(renderer.root.findAllByType('FaceCamera')).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('Register an employee face first.');
});
