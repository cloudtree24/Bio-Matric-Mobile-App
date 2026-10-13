import {setupLocalSqlite} from '../testSupport/localSqlite';
import {float32ToBase64} from '../src/utils/base64';
import {findBestEmployeeMatch} from '../src/services/faceMatchingService';
let fixture;
let saveLocalEmployeeFaces;
let getLocalCompanyFaces;
let getAllLocalFaces;
beforeEach(async () => {
  fixture = await setupLocalSqlite();
  ({saveLocalEmployeeFaces, getLocalCompanyFaces, getAllLocalFaces} = require('../src/services/localFaceStorage'));
});
afterEach(() => fixture.database.close());
const person = (employeeId, vector, companyId = 'C1') => ({
  employeeId, companyId, employeeName: employeeId,
  faces: Array.from({length: 3}, () => ({faceImage: 'private-photo', faceEmbedding: float32ToBase64(vector)})),
});

test('persists two people concurrently, matches each, and rejects an unknown face', async () => {
  await Promise.all([saveLocalEmployeeFaces(person('E1', [1, 0, 0])), saveLocalEmployeeFaces(person('E2', [0, 1, 0]))]);
  const records = await getLocalCompanyFaces('C1');
  expect(records).toHaveLength(2);
  expect(findBestEmployeeMatch([1, 0, 0], records).employeeId).toBe('E1');
  expect(findBestEmployeeMatch([0, 1, 0], records).employeeId).toBe('E2');
  expect(findBestEmployeeMatch([0, 0, 1], records).matched).toBe(false);
  expect(JSON.stringify(fixture.database.exec('SELECT * FROM employees'))).not.toContain('private-photo');
  expect(fixture.open).toHaveBeenCalledWith(expect.objectContaining({encryptionKey: expect.stringMatching(/^[a-f0-9]{64}$/)}));
  expect(await getLocalCompanyFaces('C2')).toEqual([]);
});

test('re-registration updates one employee and preserves the other company', async () => {
  await saveLocalEmployeeFaces(person('E1', [1, 0]));
  await saveLocalEmployeeFaces(person('E1', [1, 0], 'C2'));
  await saveLocalEmployeeFaces(person('E1', [0, 1]));
  const records = await getLocalCompanyFaces('C1');
  expect(records).toHaveLength(1);
  expect(records[0].faces[0].embedding).toEqual(new Float32Array([0, 1]));
  expect(await getLocalCompanyFaces('C2')).toHaveLength(1);
});

test('rejects invalid samples before persisting', async () => {
  await expect(saveLocalEmployeeFaces({...person('E1', [1, 0]), faces: []})).rejects.toThrow('Exactly 3');
  await expect(saveLocalEmployeeFaces(person('E1', [0, 0]))).rejects.toThrow('Invalid face embedding');
  expect(fixture.database.exec('SELECT * FROM employees')).toEqual([]);
});

test('identifies employees across companies without asking for a company ID', async () => {
  await saveLocalEmployeeFaces(person('E1', [1, 0], 'C1'));
  await saveLocalEmployeeFaces(person('E1', [0, 1], 'C2'));
  const records = await getAllLocalFaces();
  expect(records).toHaveLength(2);
  expect(findBestEmployeeMatch([0, 1], records)).toMatchObject({matched: true, employeeId: 'E1', companyId: 'C2'});
  expect(findBestEmployeeMatch([1, 0], records)).toMatchObject({matched: true, employeeId: 'E1', companyId: 'C1'});
});
