jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {get: jest.fn(), post: jest.fn()},
}));

import apiClient from '../src/services/apiClient';
import {enableFaceAttendance, getFaceAccess, saveFaceRegistration} from '../src/services/biometricApi';

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
