import apiClient from './apiClient';
import {validateBase64Image} from '../utils/faceValidation';
import {requireBackendId} from '../utils/backendIdentity';
import {decodeFaceEmbedding} from '../utils/base64';

const isSuccessResponse = data => {
  const result = data?.data || data?.Data || data?.result || data?.Result || data?.response || data;
  return result?.isSuccess === true || result?.IsSuccess === true || result?.success === true || result?.Success === true;
};

const responseMessage = data => data?.message || data?.Message || data?.data?.message || data?.data?.Message || data?.response?.message || '';

export const getFaceAccess = async (employeeId, companyId) => {
  const response = await apiClient.get(
    `/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
  );
  const record = Array.isArray(response.data) ? response.data[0] : response.data;

  return {isFaceEnable: Number(record?.isFaceEnable) === 1, record: record || null};
};

export const getRegisteredBiometric = async (employeeId, companyId) => {
  const employee = requireBackendId(employeeId, 'Employee ID');
  const company = requireBackendId(companyId, 'Company ID');
  const {data} = await apiClient.get(
    `/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/${employee}/${company}`,
  );
  let record = data?.data ?? data?.Data ?? data?.result ?? data;
  if (Array.isArray(record)) {
    if (record.length > 1) throw new Error('Multiple biometric records returned for this employee.');
    record = record[0];
  }
  if (record == null) return null;
  if (typeof record !== 'object') throw new Error('Unexpected biometric response from the server.');
  if (Object.keys(record).length === 0) return null;
  if (Number(record.employeeId) !== employee || Number(record.companyId) !== company) {
    throw new Error('The biometric response does not match the requested employee and company.');
  }
  if (Number(record.isDelete) === 1) return null;
  const image = validateBase64Image(record.faceImage);
  if (!image.isValid && !record.faceEmbeding) return null;
  return {...record, faceImage: image.isValid ? image.value : null};
};

const getArrayResponse = data => {
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'Data', 'result', 'Result', 'items', 'value']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error('Unexpected biometric response from the server.');
};

const isInactiveBiometric = record =>
  Number(record?.isDelete ?? record?.isDeleted) === 1 ||
  record?.isActive === false || Number(record?.isActive) === 0 ||
  String(record?.status || '').toLowerCase() === 'inactive';

// Templates are decoded once at load time and grouped so a person with more
// than one enrolled template can never occupy multiple ranking positions.
export const getCompanyFaceTemplates = async companyId => {
  const company = requireBackendId(companyId, 'Company ID');
  const {data} = await apiClient.get(
    `/EmployeeBiomatricRegister/GetAllEmployeeBiomatricDetails/${company}`,
  );
  const templatesByEmployee = new Map();

  getArrayResponse(data).forEach(record => {
    const employeeId = Number(record?.employeeId);
    if (!record || isInactiveBiometric(record) || Number(record.companyId) !== company ||
      !Number.isInteger(employeeId) || employeeId <= 0 || !record.faceEmbeding) return;

    try {
      const embedding = decodeFaceEmbedding(record.faceEmbeding);
      const current = templatesByEmployee.get(employeeId) || {
        employeeId,
        employeeCode: record.employeeCode || null,
        employeeName: record.employeeName || null,
        companyId: company,
        faces: [],
      };
      current.faces.push({embedding});
      templatesByEmployee.set(employeeId, current);
    } catch {
      // A corrupt enrollment must not prevent other employees from checking in.
    }
  });

  return [...templatesByEmployee.values()];
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
