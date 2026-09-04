import Config from 'react-native-config';

import legacyApiBaseUrl from '../constants/apiConfig';

// `.env` is preferred. The existing project-local URL remains a fallback so
// development builds continue to work while a developer has not created `.env`.
const apiBaseUrl = (Config.API_BASE_URL || legacyApiBaseUrl || '').replace(/\/$/, '');

export const getApiBaseUrl = () => {
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not configured. Add it to your .env file.');
  }

  return apiBaseUrl;
};
