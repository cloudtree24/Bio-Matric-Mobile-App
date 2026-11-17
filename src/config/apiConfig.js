import Config from 'react-native-config';

// API_BASE_URL in `.env` is the single API URL source. It is the server origin;
// all HRMS routes live below `/api`.
const normalizeApiBaseUrl = value => {
  const baseUrl = String(value || '').trim().replace(/\/+$/, '');
  if (!baseUrl) return '';
  return /\/api$/i.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
};

const apiBaseUrl = normalizeApiBaseUrl(Config.API_BASE_URL);

export const getApiBaseUrl = () => {
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not configured. Add it to your .env file.');
  }

  return apiBaseUrl;
};
