import Config from 'react-native-config';

import legacyApiBaseUrl from '../constants/apiConfig';

// `.env` is preferred. The existing project-local URL remains a fallback so
// development builds continue to work while a developer has not created `.env`.
// API_BASE_URL is the server origin; all HRMS routes live below `/api`.
const normalizeApiBaseUrl = value => {
  const baseUrl = String(value || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return '';
  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
};

const apiBaseUrl = normalizeApiBaseUrl(Config.API_BASE_URL || legacyApiBaseUrl);

export const getApiBaseUrl = () => {
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not configured. Add it to your .env file.');
  }

  return apiBaseUrl;
};
