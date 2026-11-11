jest.mock('../src/services/apiClient', () => ({__esModule: true, default: {get: jest.fn()}}));
import apiClient from '../src/services/apiClient';
import {getEmployeeTypes, getBranches, getDepartments, getDesignations, getFilteredEmployees, fetchEmployeeDetails} from '../src/services/employeeRegistrationApi';

test('uses company and selected filter IDs in the correct routes', async () => {
  apiClient.get.mockResolvedValue({data: []});
  await getEmployeeTypes(1);
  await getBranches(1);
  await getDepartments(1, 13);
  await getDesignations(22);
  await getFilteredEmployees(1, 1, 13, 22, 55);
  await getFilteredEmployees(1, 1, 13);
  expect(apiClient.get.mock.calls.map(([path]) => path)).toEqual([
    '/EmployeeTypeMaster/GetEmployeeTypeList/1', '/Branch/GetAllBranch/1',
    '/EmpRegistration/GetAllDepartmentByBranchId/1/13', '/CompanyOrganogram/GetDesignationByDepartmentId/22',
    '/EmpRegistration/GetEmployeeDetailsByFilter/1/1/13/22/55', '/EmpRegistration/GetEmployeeDetailsByFilter/1/1/13/0/0',
  ]);
});

test('accepts list responses and rejects unexpected server responses', async () => {
  apiClient.get.mockResolvedValueOnce({data: {data: [{id: 1}]}}).mockResolvedValueOnce({data: {message: 'error'}});
  await expect(getBranches(1)).resolves.toEqual([{id: 1}]);
  await expect(getBranches(1)).rejects.toThrow('Unexpected response');
});

test('looks up an entered employee ID and preserves empty results', async () => {
  const employee = {id: 15, employeeId: 'EMP15', employeeName: 'Test Employee'};
  apiClient.get.mockResolvedValueOnce({data: [employee]}).mockResolvedValueOnce({data: []});
  await expect(fetchEmployeeDetails(1, 15)).resolves.toEqual([employee]);
  expect(apiClient.get).toHaveBeenLastCalledWith('/EmpRegistration/FetchEmployeeDetails/1/15');
  await expect(fetchEmployeeDetails(1, 'unknown/id')).resolves.toEqual([]);
  expect(apiClient.get).toHaveBeenLastCalledWith('/EmpRegistration/FetchEmployeeDetails/1/unknown%2Fid');
});
