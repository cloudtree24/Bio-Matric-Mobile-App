import {setupLocalSqlite} from '../testSupport/localSqlite';
import {float32ToBase64} from '../src/utils/base64';
let fixture;
beforeEach(async () => { fixture = await setupLocalSqlite(); });
afterEach(() => fixture.database.close());
const faceService = 'com.hrms.local-face-records.v2';
const attendanceService = 'com.hrms.local-attendance.v1';
const seed = () => {
  fixture.credentials.set(faceService, {password: JSON.stringify([{companyId: '9', employeeId: '44', employeeName: 'One', faces: [{faceEmbedding: float32ToBase64([1, 0])}]}])});
  fixture.credentials.set(attendanceService, {password: JSON.stringify([{companyId: '9', EmployeeId: '44', LogDate: '2026-10-12', Direction: 'In'}])});
};

test('migrates both legacy stores once, persists key, and keeps rows after reopening', async () => {
  seed();
  const {getLocalCompanyFaces} = require('../src/services/localFaceStorage');
  expect(await getLocalCompanyFaces(9)).toHaveLength(1);
  const {getLocalAttendance} = require('../src/services/localAttendanceStorage');
  expect(await getLocalAttendance(9)).toHaveLength(1);
  expect(fixture.credentials.has(faceService)).toBe(false);
  expect(fixture.credentials.has(attendanceService)).toBe(false);
  const key = fixture.open.mock.calls[0][0].encryptionKey;
  jest.resetModules();
  expect(await require('../src/services/localFaceStorage').getLocalCompanyFaces(9)).toHaveLength(1);
  expect(fixture.open.mock.calls[1][0].encryptionKey).toBe(key);
  expect(fixture.database.exec('SELECT COUNT(*) FROM attendance')[0].values[0][0]).toBe(1);
});

test('failed migration rolls back and leaves legacy data intact for retry', async () => {
  seed();
  const original = fixture.execute.getMockImplementation();
  fixture.execute.mockImplementation(async (sql, params) => {
    if (sql.startsWith('INSERT OR IGNORE INTO attendance')) throw new Error('disk full');
    return original(sql, params);
  });
  const {getLocalCompanyFaces} = require('../src/services/localFaceStorage');
  await expect(getLocalCompanyFaces(9)).rejects.toThrow('disk full');
  expect(fixture.credentials.has(faceService)).toBe(true);
  expect(fixture.credentials.has(attendanceService)).toBe(true);
  fixture.execute.mockImplementation(original);
  expect(await getLocalCompanyFaces(9)).toHaveLength(1);
});

test('refuses an unencrypted SQLite build', async () => {
  seed();
  fixture.execute.mockResolvedValueOnce({rows: []});
  await expect(require('../src/services/localFaceStorage').getLocalCompanyFaces(9)).rejects.toThrow('SQLCipher');
  expect(fixture.credentials.has(faceService)).toBe(true);
});

test('attendance pages are bounded and company scoped', async () => {
  const {saveLocalAttendance, getLocalAttendance} = require('../src/services/localAttendanceStorage');
  for (let id = 1; id <= 4; id += 1) {
    await saveLocalAttendance('9', {EmployeeId: String(id), LogDate: '2026-10-12', Direction: 'In'});
  }
  expect((await getLocalAttendance(9, {limit: 2, offset: 2})).map(record => record.EmployeeId)).toEqual(['3', '4']);
  await expect(getLocalAttendance(9, {limit: 1001})).rejects.toThrow('Invalid attendance page');
});
