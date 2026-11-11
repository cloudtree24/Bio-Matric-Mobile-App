import apiClient from './apiClient';

const getList = async path => {
  const {data} = await apiClient.get(path);
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'result', 'items', 'value']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error('Unexpected response from the server.');
};
const id = value => encodeURIComponent(String(value));

export const getEmployeeTypes = companyId => getList(`/EmployeeTypeMaster/GetEmployeeTypeList/${id(companyId)}`);
export const getBranches = companyId => getList(`/Branch/GetAllBranch/${id(companyId)}`);
export const getDepartments = (companyId, branchId) => getList(`/EmpRegistration/GetAllDepartmentByBranchId/${id(companyId)}/${id(branchId)}`);
export const getDesignations = departmentId => getList(`/CompanyOrganogram/GetDesignationByDepartmentId/${id(departmentId)}`);
export const getFilteredEmployees = (companyId, employeeTypeId, branchId, departmentId = 0, designationId = 0) => getList(`/EmpRegistration/GetEmployeeDetailsByFilter/${id(companyId)}/${id(employeeTypeId)}/${id(branchId)}/${id(departmentId)}/${id(designationId)}`);
export const fetchEmployeeDetails = (companyId, employeeId) => getList(`/EmpRegistration/FetchEmployeeDetails/${id(companyId)}/${id(employeeId)}`);
