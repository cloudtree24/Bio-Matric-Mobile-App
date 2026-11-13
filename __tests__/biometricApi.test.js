jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {get: jest.fn(), post: jest.fn()},
}));

import apiClient from '../src/services/apiClient';
import {enableFaceAttendance, getCompanyFaceTemplates, getFaceAccess, saveFaceRegistration} from '../src/services/biometricApi';
import {float32ToBase64} from '../src/utils/base64';

describe('biometric API client', () => {
  beforeEach(() => jest.clearAllMocks());

  test('reads enabled face access from the existing route', async () => {
    apiClient.get.mockResolvedValue({data: [{isFaceEnable: 1}]});

    await expect(getFaceAccess('employee-7', 'company-a')).resolves.toMatchObject({isFaceEnable: true});
    expect(apiClient.get).toHaveBeenCalledWith('/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/company-a/employee-7');
  });

  test('rejects a registration response that is not successful', async () => {
    apiClient.post.mockResolvedValue({data: {isSuccess: false, message: 'Employee not found'}});

    await expect(saveFaceRegistration({EmployeeId: 'employee-7'})).rejects.toThrow('Employee not found');
  });

  test('normalizes the known enable-status spelling before posting', async () => {
    apiClient.post.mockResolvedValue({data: {isSuccess: true}});

    await enableFaceAttendance({EmployeeId: 'employee-7', IsFaceAuthunticateEnable: 'true'});
    expect(apiClient.post).toHaveBeenCalledWith(
      '/EmployeeBiomatricRegister/UpdateBiomatricEnableStatus',
      expect.objectContaining({
        IsFaceAuthenticateEnable: 'true',
        IsFaceAuthunticateEnable: 'true',
      }),
    );
  });
});

describe('backend biometric retrieval', () => {
  const {getRegisteredBiometric} = require('../src/services/biometricApi');
  const record = {employeeId: 10, companyId: 1, faceImage: 'a'.repeat(32), faceEmbeding: 'embedding', isDelete: 0};
  test('preserves embedding and uses employee/company route order', async () => {
    apiClient.get.mockResolvedValue({data: record});
    await expect(getRegisteredBiometric(10, 1)).resolves.toEqual(record);
    expect(apiClient.get).toHaveBeenLastCalledWith('/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/10/1');
  });
  test.each([null, [], {}, {...record, isDelete: 1}, {...record, faceImage: '', faceEmbeding: ''}])('recognizes missing or deleted registrations', async data => {
    apiClient.get.mockResolvedValue({data});
    await expect(getRegisteredBiometric(10, 1)).resolves.toBeNull();
  });
  test.each([{...record, employeeId: 11}, {...record, companyId: 2}, [record, record], 'invalid'])('rejects wrong identity or ambiguous response', async data => {
    apiClient.get.mockResolvedValue({data});
    await expect(getRegisteredBiometric(10, 1)).rejects.toThrow();
  });
  test('rejects display codes in numeric biometric routes', async () => {
    await expect(getRegisteredBiometric('AA_11', 1)).rejects.toThrow('Employee ID');
  });
});

test('loads, validates, decodes, and groups company face templates once', async () => {
  const embedding = float32ToBase64(Float32Array.from({length: 128}, (_, index) => index === 0 ? 1 : 0));
  apiClient.get.mockResolvedValue({data: [
    {employeeId: 13, employeeCode: 'AA_14', employeeName: 'Jamila Gonzales', faceEmbeding: embedding, companyId: 1},
    {employeeId: 13, employeeCode: 'AA_14', employeeName: 'Jamila Gonzales', faceEmbeding: embedding, companyId: 1},
    {employeeId: 14, faceEmbeding: embedding, companyId: 2},
    {employeeId: 15, faceEmbeding: 'invalid', companyId: 1},
    {employeeId: 16, faceEmbeding: embedding, companyId: 1, isDelete: 1},
  ]});

  await expect(getCompanyFaceTemplates(1)).resolves.toEqual([
    expect.objectContaining({employeeId: 13, employeeCode: 'AA_14', employeeName: 'Jamila Gonzales', companyId: 1, faces: [expect.objectContaining({embedding: expect.any(Float32Array)}), expect.objectContaining({embedding: expect.any(Float32Array)})]}),
  ]);
  expect(apiClient.get).toHaveBeenLastCalledWith('/EmployeeBiomatricRegister/GetAllEmployeeBiomatricDetails/1');
});
