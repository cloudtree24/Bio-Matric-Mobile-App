import axios from 'axios';

import {getApiBaseUrl} from '../config/apiConfig';

const API_TIMEOUT_MS = 30000;
let accessToken = null;

export const setApiAccessToken = token => {
  accessToken = token || null;
};

const apiClient = axios.create({
  timeout: API_TIMEOUT_MS,
  headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
});

apiClient.interceptors.request.use(config => {
  const nextConfig = {...config};
  nextConfig.baseURL = nextConfig.baseURL || getApiBaseUrl();

  if (accessToken) {
    nextConfig.headers = {...nextConfig.headers, Authorization: `Bearer ${accessToken}`};
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return Promise.reject(new Error('The request timed out. Please try again.'));
    }

    const message = error.response?.data?.message || error.response?.data?.Message;
    return Promise.reject(new Error(message || 'Unable to reach the server. Please try again.'));
  },
);

export default apiClient;
