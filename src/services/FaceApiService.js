import Config from 'react-native-config';
import apiClient from './apiClient';
import {prepareEmployees} from './faceMatchingService';

export const FACE_API_ROUTES = {
  registration: Config.FACE_REGISTRATION_ROUTE || '/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat',
  employees: Config.FACE_EMPLOYEES_ROUTE || '/api/EmployeeFace/GetByCompany/{companyId}',
};
const cache = new Map();
export const invalidateFaceCache = companyId => cache.delete(String(companyId));
export const getCompanyFaces = async companyId => {
  const key = String(companyId);
  if (!cache.has(key)) {
    const request = apiClient.get(FACE_API_ROUTES.employees.replace('{companyId}', encodeURIComponent(key)))
      .then(response => {
        const records = response.data?.data || response.data?.Data || response.data;
        if (!Array.isArray(records)) throw new Error('The registered employee response must be an array.');
        return prepareEmployees(records.filter(employee => String(employee.companyId) === key));
      });
    cache.set(key, request);
    request.catch(() => { if (cache.get(key) === request) cache.delete(key); });
  }
  return cache.get(key);
};

export const saveEmployeeFaces = async payload => {
  if (payload.faces?.length !== 3) throw new Error('Exactly 3 face samples are required.');
  const response = await apiClient.post(FACE_API_ROUTES.registration, payload);
  const data = response.data?.data || response.data?.Data || response.data;
  if (!(data?.isSuccess === true || data?.IsSuccess === true || data?.success === true || data?.Success === true)) {
    throw new Error(data?.message || data?.Message || 'Three-face registration could not be saved. Check backend support.');
  }
  invalidateFaceCache(payload.companyId);
  return response.data;
};
