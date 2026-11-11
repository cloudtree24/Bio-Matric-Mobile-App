export const requireBackendId = (value, label) => {
  if (!/^\d+$/.test(String(value ?? '').trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error(`${label} is unavailable or invalid. Please sign in again.`);
  }
  return Number(value);
};

export const getBiometricEmployeeId = employee => requireBackendId(
  employee?.employeeBiomatricDetail?.employeeId || employee?.id, 'Employee ID',
);

export const getBiometricCompanyId = (employee, sessionCompanyId) => requireBackendId(
  employee?.childCompanyId || employee?.employeeBiomatricDetail?.companyId || sessionCompanyId, 'Company ID',
);
