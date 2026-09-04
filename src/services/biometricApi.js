import apiClient from './apiClient';
import {validateBase64Image} from '../utils/faceValidation';

const isSuccessResponse = data => {
  const result = data?.data || data?.Data || data?.result || data?.Result || data;
  return result?.isSuccess === true || result?.IsSuccess === true || result?.success === true || result?.Success === true;
};

const responseMessage = data => data?.message || data?.Message || data?.data?.message || data?.data?.Message || '';

export const getFaceAccess = async (employeeId, companyId) => {
  const response = await apiClient.get(
    `/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
  );
  const record = Array.isArray(response.data) ? response.data[0] : response.data;

  return {isFaceEnable: Number(record?.isFaceEnable) === 1, record: record || null};
};

export const getRegisteredBiometric = async (employeeId, companyId) => {
  const response = await apiClient.get(
    `/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/${employeeId}/${companyId}`,
  );
  const faceImage = validateBase64Image(response.data?.faceImage);

  return {...response.data, faceImage: faceImage.isValid ? faceImage.value : null};
};

export const saveFaceRegistration = async payload => {
  const response = await apiClient.post('/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat', payload);
  if (!isSuccessResponse(response.data)) {
    throw new Error(responseMessage(response.data) || 'Face registration could not be saved.');
  }

  return response.data;
};

export const enableFaceAttendance = async payload => {
  const compatiblePayload = {
    ...payload,
    IsFaceAuthenticateEnable: payload.IsFaceAuthunticateEnable,
  };
  const response = await apiClient.post(
    '/EmployeeBiomatricRegister/UpdateBiomatricEnableStatus',
    compatiblePayload,
  );

  if (!isSuccessResponse(response.data)) {
    throw new Error(responseMessage(response.data) || 'Face attendance activation failed.');
  }

  return response.data;
};
