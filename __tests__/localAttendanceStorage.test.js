jest.mock('../src/services/apiClient', () => ({__esModule: true, default: {post: jest.fn()}}));
import apiClient from '../src/services/apiClient';
import {setupLocalSqlite} from '../testSupport/localSqlite';
let fixture;
let saveLocalAttendance;
let getLocalAttendance;
let createFaceCheckInController;
beforeEach(async () => {
  fixture = await setupLocalSqlite();
  ({saveLocalAttendance, getLocalAttendance} = require('../src/services/localAttendanceStorage'));
  ({createFaceCheckInController} = require('../src/services/faceCheckInService'));
});
afterEach(() => fixture.database.close());
const match = employeeId => ({matched: true, employeeId, employeeName: `Employee ${employeeId}`, score: 0.9, scoreGap: 0.2});
const session = () => createFaceCheckInController({companyId: 9, requireLocation: false, submitAttendance: payload => saveLocalAttendance(9, payload)});

test('matches two employees into distinct secure local check-ins without API or location', async () => {
  await session().identify(match(44));
  await session().identify(match(45));
  const records = await getLocalAttendance(9);
  expect(records.map(record => record.EmployeeId)).toEqual(['44', '45']);
  expect(records.every(record => record.Direction === 'In')).toBe(true);
  expect(await getLocalAttendance(10)).toEqual([]);
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('deduplicates same-day check-in across concurrent and fresh camera sessions', async () => {
  await Promise.all([session().identify(match(44)), session().identify(match(44))]);
  await session().identify(match(44));
  expect(await getLocalAttendance(9)).toHaveLength(1);
  expect(fixture.database.exec('SELECT COUNT(*) FROM attendance')[0].values[0][0]).toBe(1);
});

test('unknown face cannot write attendance', async () => {
  await session().identify({...match(44), matched: false});
  expect(fixture.database.exec("SELECT name FROM sqlite_master WHERE name = 'attendance'")).toEqual([]);
});

test('failed secure write retains identity and can be retried', async () => {
  await getLocalAttendance(9);
  const original = fixture.execute.getMockImplementation();
  fixture.execute.mockImplementationOnce(async () => { throw new Error('Storage unavailable'); });
  fixture.execute.mockImplementation(original);
  const onState = jest.fn();
  const controller = createFaceCheckInController({companyId: 9, requireLocation: false, submitAttendance: payload => saveLocalAttendance(9, payload), onState});
  await controller.identify(match(44));
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'failed', match: match(44)}));
  await controller.retry();
  expect(await getLocalAttendance(9)).toHaveLength(1);
  expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({status: 'success'}));
});
