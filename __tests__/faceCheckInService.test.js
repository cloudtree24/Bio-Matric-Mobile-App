jest.mock('../src/services/apiClient', () => ({__esModule: true, default: {post: jest.fn()}}));
import apiClient from '../src/services/apiClient';
import {createFaceCheckInController} from '../src/services/faceCheckInService';
import {buildAttendancePayload} from '../src/services/attendanceApi';

const match = {matched: true, employeeId: 44, employeeName: 'Employee One', score: 0.88, scoreGap: 0.27};
let checkLocation;
let onState;
let controller;
beforeEach(() => {
  jest.clearAllMocks();
  apiClient.post.mockResolvedValue({data: {isSuccess: true}});
  checkLocation = jest.fn(async () => ({inside: true}));
  onState = jest.fn();
  controller = createFaceCheckInController({companyId: 9, checkLocation, onState});
});

test('submits matched employee once despite concurrent and subsequent matches', async () => {
  await Promise.all([controller.identify(match), controller.identify({...match, employeeId: 45})]);
  await controller.identify(match);
  await controller.retry();
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.post).toHaveBeenCalledWith('/BiomatricAttendance/SaveAttenance', expect.objectContaining({EmployeeId: '44', EmployeeCode: '44', Direction: 'In'}));
  expect(checkLocation).toHaveBeenCalledWith(44, 9);
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'success', match: expect.objectContaining({employeeId: 44})}));
});

test.each([
  ['ambiguous', {...match, matched: false, scoreGap: 0.02}],
  ['below threshold', {...match, matched: false, score: 0.63}],
  ['zero faces', null],
  ['multiple faces', {matched: false, reason: 'MULTIPLE_FACES'}],
  ['processing error', {matched: false, reason: 'PROCESSING_ERROR'}],
])('%s cannot trigger attendance', async (_label, result) => {
  await controller.identify(result);
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(checkLocation).not.toHaveBeenCalled();
});

test('API failure retains recognition success and retries the same employee/payload only explicitly', async () => {
  apiClient.post.mockResolvedValueOnce({data: {isSuccess: false, message: 'Already checked in'}});
  expect(await controller.identify(match)).toEqual(match);
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'failed', error: 'Already checked in', match}));
  await controller.identify({...match, employeeId: 45});
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  await Promise.all([controller.retry(), controller.retry()]);
  expect(apiClient.post).toHaveBeenCalledTimes(2);
  expect(apiClient.post.mock.calls[1][1]).toEqual(apiClient.post.mock.calls[0][1]);
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'success'}));
});

test('location rejection cannot submit attendance', async () => {
  checkLocation.mockResolvedValue({inside: false, message: 'Outside geofence'});
  await controller.identify(match);
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'failed', error: 'Outside geofence'}));
});

test('uses normal-flow local date/time and device payload fields', () => {
  expect(buildAttendancePayload(44, new Date(2026, 9, 7, 9, 5, 3).getTime())).toEqual({
    EmployeeId: '44', EmployeeCode: '44', LogDateTime: '2026-10-07T09:05:03', LogDate: '2026-10-07', LogTime: '09:05:03',
    Direction: 'In', DeviceName: 'Mobile App', SerialNo: '1', VerificationCode: '1',
  });
});
