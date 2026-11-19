import axios from 'axios';
import BASE_URL from '../constants/apiConfig';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds default timeout
});

// Request interceptor for adding auth token and logging
axiosInstance.interceptors.request.use(
  config => {
    // Log requests in development only
    if (__DEV__) {
      console.log(
        `📤 API Request: ${config.method?.toUpperCase()} ${config.url}`,
      );
    }
    return config;
  },
  error => {
    if (__DEV__) {
      console.error('📤 Request Error:', error);
    }
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  response => {
    // Log successful responses in development only
    if (__DEV__) {
      console.log(
        `📥 API Response: ${response.config.url} - Status: ${response.status}`,
      );
    }
    return response;
  },
  error => {
    // Biometric errors are logged as sanitized metadata by their request layer.
    if (
      /EmployeeBiomatricRegister|BiometricAccess/.test(
        error.config?.url || '',
      ) ||
      error.code === 'ERR_CANCELED'
    ) {
      return Promise.reject(error);
    }
    // Always log errors
    if (error.response) {
      // Server responded with error status
      console.error(
        `❌ API Error: ${error.config?.url} - Status: ${error.response.status}`,
      );
      console.error(`❌ Response Body:`, JSON.stringify(error.response.data));
    } else if (error.request) {
      // Request made but no response
      console.error('❌ Network Error: No response received');
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  },
);

// 🟢 Set Authorization token
export const setAuthToken = token => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// 🟢 Set UserId
export const setUserIdHeader = userId => {
  if (userId) {
    axiosInstance.defaults.headers.common['UserId'] = String(userId);
  } else {
    delete axiosInstance.defaults.headers.common['UserId'];
  }
};

// 🟢 Create cancellable request
export const createCancellableRequest = () => {
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  return {
    source,
    cancel: (message = 'Request cancelled') => {
      source.cancel(message);
    },
  };
};

export default axiosInstance;
