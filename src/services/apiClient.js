import axios from 'axios';
import Config from 'react-native-config';

import {getApiBaseUrl} from '../config/apiConfig';

const API_TIMEOUT_MS = 30000;
// This app uses the server's shared API credential. Keep the value in .env;
// putting it directly in JavaScript both exposes it and can break parsing.
let accessToken = String(Config.API_BEARER_TOKEN || '').trim() || null;
let apiUserId = String(Config.API_USER_ID || '').trim() || null;

export const setApiAccessToken = token => {
  accessToken = String(token || '').trim() || null;
};

export const setApiUserId = userId => {
  apiUserId = String(userId || '').trim() || null;
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

  if (apiUserId) {
    nextConfig.headers = {...nextConfig.headers, UserId: apiUserId};
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
