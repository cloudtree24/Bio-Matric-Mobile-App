import apiClient from './apiClient';
import Config from 'react-native-config';

const optionalDeviceValue = value => String(value ?? '').trim() || null;

export const buildFaceAttendancePayload = match => {
  const employeeId = Number(match?.employeeId);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw new Error('The matched employee ID is invalid.');
  }
  // SaveAttenance expects the numeric employee ID in both fields.
  return buildAttendancePayload(employeeId);
};

export const formatAttendanceDateTime = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const pad = value => String(value).padStart(2, '0');
  const logDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const logTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return {logDate, logTime, logDateTime: `${logDate}T${logTime}`};
};

// Same contract as ESSMobileApp HomeScreen.buildAttendancePayload.
export const buildAttendancePayload = (employeeId, timestamp = Date.now()) => {
  const {logDate, logTime, logDateTime} = formatAttendanceDateTime(timestamp);
  return {
    EmployeeId: String(employeeId), EmployeeCode: String(employeeId),
    LogDateTime: logDateTime, LogDate: logDate, LogTime: logTime,
    Direction: 'In',
    DeviceName: optionalDeviceValue(Config.ATTENDANCE_DEVICE_NAME),
    SerialNo: optionalDeviceValue(Config.ATTENDANCE_SERIAL_NO),
    VerificationCode: optionalDeviceValue(Config.ATTENDANCE_VERIFICATION_CODE),
  };
};

// Ports the existing ApiService.saveAttendance to this app's authenticated client.
export const saveAttendance = async payload => {
  console.log('[attendance] SaveAttenance payload:', payload);
  try {
    const response = await apiClient.post('/BiomatricAttendance/SaveAttenance', payload);
    if (response.data?.isSuccess !== true) {
      throw new Error(response.data?.message || 'Failed to save attendance');
    }
    console.log('[attendance] SaveAttenance response:', response.data);
    return response.data;
  } catch (error) {
    console.log('[attendance] SaveAttenance error:', error.response?.data || error.message);
    throw error;
  }
};
