import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import FaceCheckInTestScreen from '../src/screens/FaceRegistration/FaceCheckInTestScreen';
import {getCompanyFaceTemplates} from '../src/services/biometricApi';
import {matchEmployeeFace} from '../src/services/faceMatchingService';
import {saveAttendance} from '../src/services/attendanceApi';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../src/context/AdminSessionContext', () => ({useAdminSession: () => ({companyId: 1})}));
jest.mock('../src/components/FaceCamera', () => 'FaceCamera');
jest.mock('../src/hooks/useCameraPermission', () => ({useCameraPermission: () => ({cameraPermissionStatus: 'granted', requestCameraPermission: jest.fn()})}));
jest.mock('../src/services/faceRecognitionService', () => ({__esModule: true, default: {loadModel: jest.fn().mockResolvedValue({})}}));
jest.mock('../src/services/biometricApi', () => ({getCompanyFaceTemplates: jest.fn()}));
jest.mock('../src/services/faceMatchingService', () => ({matchEmployeeFace: jest.fn()}));
jest.mock('../src/services/attendanceApi', () => ({buildAttendancePayload: employeeId => ({EmployeeId: employeeId}), saveAttendance: jest.fn()}));

let renderer;
const button = label => renderer.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && node.findAll(child => child.props.children === label).length)[0];
const templates = [{employeeId: 10, employeeCode: 'AA_11', employeeName: 'Employee One', companyId: 1, faces: [{embedding: new Float32Array([1, 0])}]}];
beforeEach(() => {
  jest.clearAllMocks();
  getCompanyFaceTemplates.mockResolvedValue(templates);
  saveAttendance.mockResolvedValue({isSuccess: true});
  matchEmployeeFace.mockReturnValue({matched: true, employeeId: 10, companyId: 1, employeeName: 'Employee One', score: 0.95, scoreGap: 0.3});
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; });
const start = async () => {
  await act(async () => { renderer = TestRenderer.create(<FaceCheckInTestScreen navigation={{goBack: jest.fn()}} />); });
  await act(async () => button('Start verification').props.onPress());
};

test('loads company templates once and checks in the identified employee', async () => {
  await start();
  expect(getCompanyFaceTemplates).toHaveBeenCalledWith(1);
  const camera = renderer.root.findByType('FaceCamera');
  await act(async () => { await camera.props.onComplete(new Float32Array([1, 0])); });
  expect(matchEmployeeFace).toHaveBeenCalledWith(expect.any(Float32Array), templates);
  expect(saveAttendance).toHaveBeenCalledWith({EmployeeId: 10});
  expect(JSON.stringify(renderer.toJSON())).toContain('Check-in successful');
});

test('keeps the camera closed when the company has no valid templates', async () => {
  getCompanyFaceTemplates.mockResolvedValue([]);
  await start();
  expect(renderer.root.findAllByType('FaceCamera')).toHaveLength(0);
  expect(JSON.stringify(renderer.toJSON())).toContain('No registered faces');
});

test('rejects ambiguous matches without saving attendance', async () => {
  matchEmployeeFace.mockReturnValue({matched: false, reason: 'ambiguous', score: 0.85, scoreGap: 0.01});
  await start();
  await act(async () => renderer.root.findByType('FaceCamera').props.onComplete(new Float32Array([1, 0])));
  expect(saveAttendance).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('Ambiguous match');
});
