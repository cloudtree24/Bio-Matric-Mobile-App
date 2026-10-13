import apiClient from './apiClient';

// Same contract as ESSMobileApp HomeScreen.buildAttendancePayload.
export const buildAttendancePayload = (employeeId, timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const pad = value => String(value).padStart(2, '0');
  const logDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const logTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return {
    EmployeeId: String(employeeId), EmployeeCode: String(employeeId),
    LogDateTime: `${logDate}T${logTime}`, LogDate: logDate, LogTime: logTime,
    Direction: 'In', DeviceName: 'Mobile App', SerialNo: '1', VerificationCode: '1',
  };
};

// Ports the existing ApiService.saveAttendance to this app's authenticated client.
export const saveAttendance = async payload => {
  const response = await apiClient.post('/BiomatricAttendance/SaveAttenance', payload);
  if (!response.data?.isSuccess) {
    throw new Error(response.data?.message || 'Failed to save attendance');
  }
  return response.data;
};
