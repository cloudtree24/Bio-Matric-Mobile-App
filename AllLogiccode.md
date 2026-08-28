const handleRegisterFace = useCallback(async () => {
    logger.debug('👤 ========== FACE REGISTRATION START ==========');

    if (!(await requestCameraPermission())) {
      return showError('Permission Denied', 'Camera access required for face registration');
    }

    if (!(await loadFaceModel())) return;

    const resolvedCompanyId = employeeDetails?.childCompanyId || user?.childCompanyId;
    if (!employeeDetails?.id || !resolvedCompanyId) {
      return showError('Error', 'Employee or company details unavailable.');
    }

    dispatchModal({type: 'SHOW', key: 'isRegistering'});
    let timeoutId;
    try {
      const imagePickerModule = require('react-native-image-picker');
      const pickerLaunchCamera =
        imagePickerModule?.launchCamera ||
        imagePickerModule?.default?.launchCamera;
      if (typeof pickerLaunchCamera !== 'function') {
        throw new Error(
          'Camera module is unavailable. Please restart the app and try again.',
        );
      }
      const res = await new Promise(resolve =>
        pickerLaunchCamera(
          {
            mediaType: 'photo',
            includeBase64: true,
            cameraType: 'front',
            quality: APP_CONFIG.IMAGE.RESIZE_QUALITY,
            maxWidth: APP_CONFIG.IMAGE.RESIZE_WIDTH,
            maxHeight: APP_CONFIG.IMAGE.RESIZE_HEIGHT,
          },
          resolve,
        ),
      );
      if (res.didCancel) return;
      if (!res.assets?.[0]?.base64) {
        showError('Error', 'No image captured');
        return;
      }

      dispatchModal({type: 'SHOW', key: 'isProcessing'});
      const base64Image = `data:image/jpeg;base64,${res.assets[0].base64}`;

      timeoutId = setTimeout(() => {
        dispatchModal({type: 'HIDE', key: 'isProcessing'});
        dispatchModal({type: 'HIDE', key: 'isRegistering'});
        showError('Processing Error', 'Face processing took too long.');
      }, APP_CONFIG.TIMEOUTS.IMAGE_PROCESSING);

      const emb = await getEmbedding(base64Image);
      clearTimeout(timeoutId);

      if (!emb) throw new Error('Failed to get embedding');

      const embeddingBase64 = Buffer.from(new Float32Array(emb).buffer).toString('base64');
      

      console.log(embeddingBase64, pureBase64);


      const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

      logger.debug('💾 ========== FACE REGISTRATION PAYLOAD ==========', {
        employeeId: employeeDetails.id,
        companyId: resolvedCompanyId,
        faceBytes: pureBase64?.length || 0,
        embeddingBytes: embeddingBase64?.length || 0,
      });

      const payload = {
        ...buildBiometricRegistrationPayload(
          employeeDetails,
          pureBase64,
          embeddingBase64,
          null,
        ),
        CompanyId: resolvedCompanyId,
      };

console.log(payload , 'biometric registration payload');


      await ApiService.saveBiometricRegistration(payload);


      console.log(payload, 'biometric regicsl;sdkvo;dsl.lddspdpdslknslnkdlkndlnkstration payload');

      const enablePayload = {
        EmployeeId: employeeDetails.id,
        IsFaceAuthunticateEnable: 'true',
        IsFingerAuthenticateEnable: 'false',
        CreatedDate: new Date().toISOString(),
        CreatedBy: employeeDetails.id,
        ModifiedDate: new Date().toISOString(),
        ModifiedBy: employeeDetails.id,
      };

      console.log(enablePayload , 'dmkdkdkdkdkdkdkk')
      await ApiService.updateBiometricEnableStatus(enablePayload);

      await Promise.all([
        SecureStorage.setItem(STORAGE_KEYS.FACE_ENABLED, 'true'),
        SecureStorage.setItem(STORAGE_KEYS.FINGERPRINT_ENABLED, 'false'),
        SecureStorage.setItem(STORAGE_KEYS.BIOMETRIC_TYPE, 'face'),
      ]);

      dispatchBiometric({
        payload: {
          registeredFace: base64Image,
          cachedFaceImage: base64Image,
          biometricType: 'face',
          isBiometricEnabled: true,
        },
      });

      dispatchModal({type: 'HIDE', key: 'showRegistration'});
      showError('✅ Success', 'Face registered successfully!');
    } catch (err) {
      logger.error('Register face error:', err);
      showError('❌ Error', err.message || 'Failed to register face');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      faceScanCallbacksRef.current = {resolve: null, reject: null};
      dispatchModal({type: 'HIDE', key: 'showFaceScanCamera'});
      dispatchModal({type: 'RESET_LOADING'});
    }
  }, [
    requestCameraPermission,
    loadFaceModel,
    getEmbedding,
    employeeDetails,
    user?.childCompanyId,
    showError,
  ]);



  ////////// FaceRecognitionService

  import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import jpeg from 'jpeg-js';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {Platform} from 'react-native';
import {APP_CONFIG} from '../constants/APP_CONFIG';
import logger from '../utils/logger';

class FaceRecognitionService {
  constructor() {
    this.session = null;
  }

  async loadModel() {
    try {
      let modelPath = '';
      
      if (Platform.OS === 'android') {
        modelPath = `${RNFS.DocumentDirectoryPath}/mobilefacenet.onnx`;
        if (!(await RNFS.exists(modelPath))) {
          await RNFS.copyFileAssets('mobilefacenet.onnx', modelPath);
        }
      } else {
        const rawPath = `${RNFS.MainBundlePath}/mobilefacenet.onnx`;
        if (!(await RNFS.exists(rawPath))) {
          throw new Error('Model file not found in bundle');
        }
        modelPath = `file://${rawPath}`;
      }

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      });

      return true;
    } catch (error) {
      logger.error('Model load error:', error);
      throw error;
    }
  }

  normalize(vec) {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vec;
    
    const normalized = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      normalized[i] = vec[i] / norm;
    }
    return normalized;
  }

  async preprocessImage(base64Image) {
    try {
      const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const filePath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.jpg`;
      await RNFS.writeFile(filePath, pureBase64, 'base64');

      const resized = await ImageResizer.createResizedImage(
        filePath,
        APP_CONFIG.FACE.INPUT_SIZE,
        APP_CONFIG.FACE.INPUT_SIZE,
        'JPEG',
        100,
        0,
        null,
        false,
        {mode: 'cover', onlyScaleDown: false},
      );

      const resizedPath = resized.uri.replace('file://', '');
      const resizedBase64 = await RNFS.readFile(resizedPath, 'base64');

      // Cleanup
      await Promise.all([
        RNFS.unlink(filePath).catch(() => {}),
        RNFS.unlink(resizedPath).catch(() => {}),
      ]);

      return resizedBase64;
    } catch (error) {
      logger.error('Preprocessing error:', error);
      throw error;
    }
  }

  async getEmbedding(base64Image) {
    try {
      if (!this.session) {
        throw new Error('ONNX session not initialized');
      }

      const processedBase64 = await this.preprocessImage(base64Image);
      if (!processedBase64) {
        throw new Error('Image preprocessing failed');
      }

      const raw = jpeg.decode(Buffer.from(processedBase64, 'base64'), {
        useTArray: true,
        formatAsRGBA: false,
      });

      if (!raw || !raw.data) {
        throw new Error('JPEG decode failed');
      }

      const mean = [0.5, 0.5, 0.5];
      const std = [0.5, 0.5, 0.5];
      const INPUT_SIZE = APP_CONFIG.FACE.INPUT_SIZE;
      const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);

      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const idx = (y * INPUT_SIZE + x) * 3;
          const r = (raw.data[idx] / 255.0 - mean[0]) / std[0];
          const g = (raw.data[idx + 1] / 255.0 - mean[1]) / std[1];
          const b = (raw.data[idx + 2] / 255.0 - mean[2]) / std[2];

          floatData[y * INPUT_SIZE + x] = r;
          floatData[INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = g;
          floatData[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = b;
        }
      }

      const tensor = new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const feeds = {[this.session.inputNames[0]]: tensor};
      const results = await this.session.run(feeds);

      const embedding = results[this.session.outputNames[0]].data;
      return this.normalize(embedding);
    } catch (error) {
      logger.error('Embedding error:', error);
      throw error;
    }
  }

  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return Math.max(-1, Math.min(1, dot / (normA * normB)));
  }

  euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async matchFaces(face1, face2) {
    try {
      if (!this.session) {
        throw new Error('Model not loaded yet');
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Face processing timeout')),
          APP_CONFIG.FACE.PROCESSING_TIMEOUT
        )
      );

      const embeddingPromise = Promise.all([
        this.getEmbedding(face1),
        this.getEmbedding(face2),
      ]);

      const [emb1, emb2] = await Promise.race([embeddingPromise, timeoutPromise]);

      if (!emb1 || !emb2) {
        throw new Error('Failed to generate face embeddings');
      }

      const similarity = this.cosineSimilarity(emb1, emb2);
      const distance = this.euclideanDistance(emb1, emb2);

      const isMatch =
        similarity >= APP_CONFIG.FACE.COSINE_THRESHOLD &&
        distance <= APP_CONFIG.FACE.EUCLIDEAN_THRESHOLD;

      let confidence = 'LOW';
      if (
        similarity >= APP_CONFIG.FACE.HIGH_CONFIDENCE_COSINE &&
        distance <= APP_CONFIG.FACE.HIGH_CONFIDENCE_EUCLIDEAN
      ) {
        confidence = 'HIGH';
      } else if (
        similarity >= APP_CONFIG.FACE.MEDIUM_CONFIDENCE_COSINE &&
        distance <= APP_CONFIG.FACE.MEDIUM_CONFIDENCE_EUCLIDEAN
      ) {
        confidence = 'MEDIUM';
      }

      logger.debug('Face Match Result:', {
        similarity: similarity.toFixed(4),
        distance: distance.toFixed(4),
        isMatch,
        confidence,
        threshold: `≥${APP_CONFIG.FACE.COSINE_THRESHOLD} && ≤${APP_CONFIG.FACE.EUCLIDEAN_THRESHOLD}`,
      });

      return {isMatch, similarity, distance, confidence};
    } catch (error) {
      logger.error('matchFaces error:', error);
      throw error;
    }
  }
}

export default new FaceRecognitionService();
import axiosInstance from '../utils/axiosInstance';
import BASE_URL from '../constants/apiConfig';
import {APP_CONFIG} from '../constants/APP_CONFIG';
import logger from '../utils/logger';

class ApiService {
  // Attendance APIs
  static async saveAttendance(payload) {
    try {
      const response = await Promise.race([
        axiosInstance.post(
          `${BASE_URL}/BiomatricAttendance/SaveAttenance`,
          payload,
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Attendance save timeout')),
            APP_CONFIG.TIMEOUTS.ATTENDANCE,
          ),
        ),
      ]);

      if (!response.data?.isSuccess) {
        throw new Error(response.data?.message || 'Failed to save attendance');
      }

      return response.data;
    } catch (error) {
      console.error('saveAttendance error:', error);
      throw error;
    }
  }

  static async fetchEmployeeLeaveDetailsForDashboard(companyId, employeeId) {
    try {
      const [leaveDetailsResponse, leavePoliciesResponse] = await Promise.all([
        axiosInstance.get(
          `${BASE_URL}/LeavePolicy/GetPendingLeaveDetails/${companyId}/${employeeId}`,
        ),
        axiosInstance.get(
          `${BASE_URL}/LeavePolicy/GetAllLeavePolicy/${companyId}`,
        ),
      ]);

      const leaveDetails = Array.isArray(leaveDetailsResponse.data)
        ? leaveDetailsResponse.data
        : [];

      const leavePolicies = Array.isArray(leavePoliciesResponse.data)
        ? leavePoliciesResponse.data
        : [];

      return leaveDetails.map(item => {
        const matchedPolicy = leavePolicies.find(
          policy => Number(policy.policyId) === Number(item.policyId),
        );

        return {
          ...item,

          // Leave Name
          label: matchedPolicy?.leaveName ?? item.leavename,
          leaveName: matchedPolicy?.leaveName ?? item.leavename,

          // Dashboard Values
          annualLeaveBalance: matchedPolicy?.leaveNo ?? 0, // Alloted
          totalAvailable: item.usedLeaveNo ?? 0, // Total Available
          eligible: item.availbleLeaveNo ?? 0, // Eligible

          // Existing values
          leaveLimit: matchedPolicy?.leaveLimit ?? 0,
          appliedDays: matchedPolicy?.appliedDays ?? 0,
          policyId: item.policyId,
        };
      });
    } catch (error) {
      console.log('fetchEmployeeLeaveDetails Error:', error);
      return [];
    }
  }

  // Biometric APIs
  static async fetchBiometricDetails(employeeId, companyId) {
    try {
      const MIN_VALID_BIOMETRIC_BYTES = 20;

      console.log('🔐 ========== FETCH BIOMETRIC DETAILS API ==========');
      console.log(
        '🔐 API Endpoint:',
        `${BASE_URL}/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/${employeeId}/${companyId}`,
      );
      console.log('🔐 Employee ID:', employeeId);
      console.log('🔐 Company ID:', companyId);
      console.log('🔐 Timeout: 30 seconds');

      const response = await Promise.race([
        axiosInstance.get(
          `${BASE_URL}/EmployeeBiomatricRegister/getEmployeeBiomatricDetailsByString/${employeeId}/${companyId}`,
        ),
        new Promise(
          (_, reject) =>
            setTimeout(
              () => reject(new Error('Biometric fetch timeout after 30s')),
              30000,
            ), // Increased to 30 seconds
        ),
      ]);


        const normalizeBiometricString = value => {
          if (typeof value !== 'string') return null;
          const trimmedValue = value.trim();
          if (!trimmedValue) return null;

          const normalizedValue = trimmedValue.toLowerCase();
          if (
            normalizedValue === 'null' ||
            normalizedValue === 'undefined' ||
            normalizedValue === 'none' ||
            normalizedValue === 'n/a' ||
            normalizedValue === 'na'
          ) {
            return null;
          }

          return trimmedValue;
        };

      const rawFaceImage = normalizeBiometricString(response.data?.faceImage);
      const rawFingerEmbedding = normalizeBiometricString(response.data?.fingerEmbeding);
      const faceBytes = rawFaceImage?.length || 0;
      const fingerprintBytes = rawFingerEmbedding?.length || 0;

      const normalizedData = {
        ...(response.data || {}),
        faceImage: faceBytes > MIN_VALID_BIOMETRIC_BYTES ? rawFaceImage : null,
        fingerEmbeding:
          fingerprintBytes > MIN_VALID_BIOMETRIC_BYTES
            ? rawFingerEmbedding
            : null,
      };

      console.log('🔐 ========== API RESPONSE ==========');
      console.log('🔐 Response received successfully');
      console.log('🔐 Has Face:', Boolean(normalizedData.faceImage));
      console.log('🔐 Face bytes:', normalizedData.faceImage?.length || 0);
      console.log(
        '🔐 Fingerprint bytes:',
        normalizedData.fingerEmbeding?.length || 0,
      );
      console.log('🔐 ====================================\n');

      return normalizedData;
    } catch (error) {
      console.error('❌ fetchBiometricDetails error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  }
  // Save biometric registration (face data , fingerprint data)
  static async saveBiometricRegistration(payload) {
    try {
      console.log('🔐 ========== SAVE BIOMETRIC REGISTRATION API ==========');
      console.log(
        '🔐 API Endpoint:',
        `${BASE_URL}/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat`,
      );
      console.log('🔐 EmployeeId:', payload?.EmployeeId);
      console.log('🔐 CompanyId:', payload?.CompanyId);
      console.log('🔐 FaceImage bytes:', payload?.FaceImage?.length || 0);
      console.log('🔐 FaceEmbedding bytes:', payload?.FaceEmbeding?.length || 0);
      console.log('🔐 Fingerprint bytes:', payload?.FingerEmbeding?.length || 0);

      const response = await axiosInstance.post(
        `${BASE_URL}/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat`,
        payload,
      );

      const responseData = response?.data || {};
      console.log('🔐 Raw save response:', JSON.stringify(responseData, null, 2));

      const normalizedResponse =
        responseData.data ||
        responseData.Data ||
        responseData.result ||
        responseData.Result ||
        responseData;

      const normalizedMessage =
        normalizedResponse?.message ||
        normalizedResponse?.Message ||
        responseData?.message ||
        responseData?.Message ||
        '';

      const normalizedSuccess =
        normalizedResponse?.isSuccess === true ||
        normalizedResponse?.IsSuccess === true ||
        normalizedResponse?.success === true ||
        normalizedResponse?.Success === true ||
        normalizedResponse?.result === true ||
        normalizedResponse?.Result === true ||
        responseData?.isSuccess === true ||
        responseData?.IsSuccess === true;

      logger.debug('🔐 SAVE BIOMETRIC RESPONSE', {
        httpStatus: response?.status,
        isSuccess: normalizedSuccess,
        message: normalizedMessage,
      });
      console.log('🔐 HTTP status:', response?.status);
      console.log('🔐 Normalized success:', normalizedSuccess);
      console.log('🔐 Normalized message:', normalizedMessage || '(empty)');
      console.log('🔐 ====================================\n');

      if (!normalizedSuccess) {
        throw new Error(normalizedMessage || 'Failed to save face');
      }

      return {
        ...normalizedResponse,
        status: response?.status,
        isSuccess: true,
        message: normalizedMessage,
      };
    } catch (error) {
      console.error('saveBiometricRegistration error:', error);
      console.error('saveBiometricRegistration response:', error?.response?.data);
      console.error('saveBiometricRegistration status:', error?.response?.status);
      throw error;
    }
  }

  // Update biometric enable status (enable/disable biometric for attendance on Ui design )
  static async updateBiometricEnableStatus(payload) {
    try {
      const normalizedPayload = {...payload};

      // Keep compatibility with both backend field variants.
      if (
        normalizedPayload.IsFaceAuthunticateEnable !== undefined &&
        normalizedPayload.IsFaceAuthenticateEnable === undefined
      ) {
        normalizedPayload.IsFaceAuthenticateEnable =
          normalizedPayload.IsFaceAuthunticateEnable;
      }

      if (
        normalizedPayload.IsFaceAuthenticateEnable !== undefined &&
        normalizedPayload.IsFaceAuthunticateEnable === undefined
      ) {
        normalizedPayload.IsFaceAuthunticateEnable =
          normalizedPayload.IsFaceAuthenticateEnable;
      }

      console.log(
        '🔐 ========== UPDATE BIOMETRIC ENABLE STATUS API ==========',
      );
      console.log(
        '🔐 API Endpoint:',
        `${BASE_URL}/EmployeeBiomatricRegister/UpdateBiomatricEnableStatus`,
      );
      console.log('🔐 Payload:', JSON.stringify(normalizedPayload, null, 2));

      const response = await axiosInstance.post(
        `${BASE_URL}/EmployeeBiomatricRegister/UpdateBiomatricEnableStatus`,
        normalizedPayload,
      );

      console.log('🔐 ========== API RESPONSE ==========');
      console.log('🔐 Full Response:', JSON.stringify(response.data, null, 2));
      console.log('🔐 Success Status:', response.data?.isSuccess);
      console.log('🔐 Message:', response.data?.message);
      console.log('🔐 ====================================\n');

      if (!response.data?.isSuccess) {
        throw new Error(
          response.data?.message || 'Failed to update biometric enable status',
        );
      }

      return response.data;
    } catch (error) {
      console.error('❌ updateBiometricEnableStatus error:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  }

  // Fetch biometric enable or disable access face and fingerPrint in Admin panel
  static async fetchBiometricEnableStatus(employeeId, companyId) {
    try {
      console.log('🔐 ========== FETCH BIOMETRIC ENABLE STATUS API ==========');
      console.log(
        '🔐 API Endpoint:',
        `${BASE_URL}/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
      );
      console.log('🔐 Employee ID:', employeeId);
      console.log('🔐 Company ID:', companyId);
      console.log(
        '🔐 Full URL:',
        `${BASE_URL}/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
      );

      const response = await axiosInstance.get(
        `${BASE_URL}/BiometricAccess/GetAllBiometricAccessDetailsByEmployeeId/${companyId}/${employeeId}`,
      );

      console.log('🔐 ========== API RESPONSE ==========');
      console.log('🔐 Full Response:', JSON.stringify(response.data, null, 2));

      // Response is an array, get the first item
      const data =
        Array.isArray(response.data) && response.data.length > 0
          ? response.data[0]
          : null;

      if (data) {
        console.log('🔐 Employee Name:', data.employeeName);
        console.log('🔐 Department:', data.department);
        console.log('🔐 Designation:', data.designation);
        console.log(
          '🔐 isFaceEnable:',
          data.isFaceEnable,
          '(1 = Enabled, 0 = Disabled)',
        );
        console.log(
          '🔐 isFingerEnable:',
          data.isFingerEnable,
          '(1 = Enabled, 0 = Disabled)',
        );
        console.log('🔐 ====================================\n');

        return {
          isFaceEnable: data.isFaceEnable === 1,
          isFingerEnable: data.isFingerEnable === 1,
          employeeName: data.employeeName,
          department: data.department,
          designation: data.designation,
        };
      } else {
        console.log('⚠️ No biometric access data found for employee');
        console.log('🔐 ====================================\n');
        // Default to disabled if no data
        return {
          isFaceEnable: false,
          isFingerEnable: false,
        };
      }
    } catch (error) {
      console.error('❌ fetchBiometricEnableStatus error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      // Return defaults on error
      return {
        isFaceEnable: false,
        isFingerEnable: false,
      };
    }
  }

  // Geofencing APIs
  static async fetchGeofences(employeeId, companyId) {
    try {
      logger.debug('📍 ========== FETCH GEOFENCES ==========', {
        employeeId,
        companyId,
      });
      const response = await axiosInstance.get(
        `${BASE_URL}/GeoFencing/getGeoLocationDetailsByEmployeeId/${employeeId}/${companyId}`,
      );
      const fences = Array.isArray(response.data) ? response.data : [];

      console.log('📍 ========== GEOFENCES RECEIVED ==========');
      console.log('📍 Total Fences:', fences.length);
      logger.api(`📍 Geofence API returned ${fences.length} fence(s)`, fences);
      return fences;
    } catch (error) {
      console.error('fetchGeofences error:', error);
      throw error;
    }
  }

  // Shift APIs
  static async fetchShiftDetails(payload) {
    try {
      const response = await axiosInstance.post(
        `${BASE_URL}/Shift/GetAttendanceDataForSingleEmployeebyshiftwiseForeachDay`,
        payload,
      );

      return response.data;
    } catch (error) {
      console.error('fetchShiftDetails error:', error);
      throw error;
    }
  }

  // OT Policy APIs
  static async fetchOTPolicy(companyId) {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/OtPolicyMaster/GetAllOtPolicy/${companyId}`,
      );

      console.log('🧪 ========== FETCH OT POLICY API CALLED ==========');
      console.log(
        '🧪 API Endpoint:',
        `${BASE_URL}/OtPolicyMaster/GetAllOtPolicy/${companyId}`,
      );
      console.log('🧪 Company ID:', companyId);
      console.log('🧪 Full Response:', JSON.stringify(response.data, null, 2));

      // Find MinOverTime policy (for OT shift duration)
      const minOverTimePolicy = response.data?.find(
        p => p.policyCategory === 'MinOverTime',
      );
      const minOverTimeValue = minOverTimePolicy
        ? Number(minOverTimePolicy.value) || 30
        : 30;

      // Find MinEarlyGoing policy (for buffer time before shift end)
      const minEarlyGoingPolicy = response.data?.find(
        p => p.policyCategory === 'MinEarlyGoing',
      );
      const minEarlyGoingValue = minEarlyGoingPolicy
        ? Number(minEarlyGoingPolicy.value) || 20
        : 20;

      console.log('🧪 ========== POLICY VALUES EXTRACTED ==========');
      console.log('🧪 MinOverTime Policy:', minOverTimePolicy);
      console.log(
        '🧪 Eligible Minimum Time for Over Time (MinOverTime):',
        minOverTimeValue,
        'Minutes',
      );
      console.log('🧪 MinEarlyGoing Policy:', minEarlyGoingPolicy);
      console.log(
        '🧪 Eligible Minimum Time for Early Going (MinEarlyGoing):',
        minEarlyGoingValue,
        'Minutes',
      );
      console.log(
        '🧪 Buffer Time (from MinEarlyGoing):',
        minEarlyGoingValue,
        'Minutes',
      );
      console.log(
        '🧪 OT Shift Duration (from MinOverTime):',
        minOverTimeValue,
        'Minutes',
      );
      console.log('🧪 ===============================================');

      return {
        minOverTime: minOverTimeValue,
        minEarlyGoing: minEarlyGoingValue,
      };
    } catch (error) {
      console.error('❌ fetchOTPolicy error:', error);
      console.log('🧪 Using default values: MinOverTime=30, MinEarlyGoing=20');
      return {
        minOverTime: 30,
        minEarlyGoing: 20,
      };
    }
  }

  // Save OT Reason
  static async saveOTReason(payload) {
    try {
      console.log('🧪 ========== SAVE OT REASON API CALLED ==========');
      console.log(
        `${BASE_URL}/BiomatricAttendance/SaveOverTimeReasonFromAndroid`,
      );
      console.log('🧪 Payload:', JSON.stringify(payload, null, 2));

      const response = await axiosInstance.post(
        `${BASE_URL}/BiomatricAttendance/SaveOverTimeReasonFromAndroid`,
        payload,
      );

      console.log('🧪 ========== SAVE OT REASON API RESPONSE ==========');
      console.log('🧪 Response:', JSON.stringify(response.data, null, 2));
      console.log('🧪 Success:', response.data?.isSuccess);
      console.log('🧪 ==================================================');

      if (!response.data?.isSuccess) {
        throw new Error(response.data?.message || 'Failed to save OT reason');
      }

      return response.data;
    } catch (error) {
      console.error('❌ saveOTReason error:', error);
      console.error('🧪 Error details:', error.message);
      throw error;
    }
  }

  // Get OT Request Status (for approval polling) - POST Method - getOTRequestStatus
  static async getOTRequestStatus(payload) {
    try {
      const response = await axiosInstance.post(
        `${BASE_URL}/BiomatricAttendance/GetAllOverTimeRequestByEmployeeId`,
        payload,
      );

      console.log(
        '🧪 ========== GET OT REQUEST STATUS API RESPONSE ==========',
      );
      console.log(
        '🧪 Backend Response:',
        JSON.stringify(response.data, null, 2),
      );
      console.log('🧪 Response is array:', Array.isArray(response.data));
      console.log(
        '🧪 Total records:',
        Array.isArray(response.data) ? response.data.length : 0,
      );

      // Backend returns an array of OT requests
      if (Array.isArray(response.data) && response.data.length > 0) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        console.log('🧪 Current Date:', todayStr);
        console.log('🧪 Filtering requests for today...');

        // Filter requests for today only
        const todayRequests = response.data.filter(req => {
          const reqDate = new Date(req.overWorkedDate)
            .toISOString()
            .split('T')[0];
          return reqDate === todayStr;
        });

        console.log("🧪 Today's Requests:", todayRequests.length);
        console.log(
          "🧪 Today's Requests Data:",
          JSON.stringify(todayRequests, null, 2),
        );

        if (todayRequests.length > 0) {
          // Sort by totid (descending) to get the most recent request
          const sortedRequests = todayRequests.sort(
            (a, b) => (b.totid || 0) - (a.totid || 0),
          );
          const latestRequest = sortedRequests[0];

          console.log('🧪 ========== LATEST REQUEST FOR TODAY ==========');
          console.log('🧪 TOTID:', latestRequest.totid);
          console.log('🧪 Employee ID:', latestRequest.employeeId);
          console.log('🧪 Requested Minutes:', latestRequest.requestedMinutes);
          console.log('🧪 Shift Timing:', latestRequest.shiftTiming);
          console.log('🧪 Reason:', latestRequest.reason);
          console.log('🧪 STATUS:', latestRequest.status);
          console.log('🧪 Created Date:', latestRequest.createdDate);
          console.log('🧪 Modified By:', latestRequest.modifiedBy || 'null');
          console.log(
            '🧪 Modified Date:',
            latestRequest.modifiedDate || 'null',
          );
          console.log('🧪 ==============================================');

          // Return the latest request with status
          return {
            ...latestRequest,
            status: latestRequest.status || 'Pending',
          };
        } else {
          console.log('⚠️ No OT requests found for today');
          return {status: 'Pending'};
        }
      } else {
        console.log('⚠️ Backend returned empty array or no data');
        return {status: 'Pending'};
      }
    } catch (error) {
      console.error('❌ getOTRequestStatus error:', error);
      console.error('🧪 Error details:', error.message);
      console.error('🧪 Error response:', error.response?.data);
      console.error('🧪 Error status code:', error.response?.status);
      // Return pending status on error to keep polling
      return {status: 'Pending'};
    }
  }

  // Leave APIs
  static async fetchLeaveApprovalDetails(
    companyId,
    branchId,
    departmentId,
    employeeId,
  ) {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/CommonDashboard/GetLeaveApprovalDetails/${companyId}/${branchId}/${departmentId}/${employeeId}`,
      );

      return response.data.map(employee => ({
        id: employee.employeeId.toString(),
        name: employee.name,
        role: `${employee.designation}, ${employee.department}`,
        image: employee.empImage
          ? {uri: `${BASE_URL}/uploads/employee/${employee.empImage}`}
          : {uri: 'https://avatar.iran.liara.run/public/26'},
        empImage: employee.empImage,
      }));
    } catch (error) {
      console.error('fetchLeaveApprovalDetails error:', error);
      return [];
    }
  }

  static async fetchEmployeeLeaveDetails(companyId, employeeId) {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/CommonDashboard/GetEmployeeLeaveDetails/${companyId}/${employeeId}`,
      );

      const validLeaves = response.data.leaveBalances.filter(
        item => item.usedLeaveNo > 0 || item.availbleLeaveNo > 0,
      );

      return validLeaves.length > 0
        ? validLeaves.map(item => ({
            label: item.leavename,
            used: item.usedLeaveNo,
            available: item.availbleLeaveNo,
          }))
        : [{label: 'No Leave Assigned', used: 0, available: 0}];
    } catch (error) {
      console.error('fetchEmployeeLeaveDetails error:', error);
      return [];
    }
  }

  // Notification APIs
  static async sendLogoutNotification(payload) {
    try {
      const response = await axiosInstance.post(
        `${BASE_URL}/Notification/sendNotificationForLogoutInAndroid`,
        payload,
      );
      return response.data;
    } catch (error) {
      console.error('sendLogoutNotification error:', error);
      throw error;
    }
  }
}

export default ApiService;


export const APP_CONFIG = {
  // Face Recognition Thresholds
  FACE: {
    INPUT_SIZE: 112,
    COSINE_THRESHOLD: 0.65, // Require a strong embedding match
    EUCLIDEAN_THRESHOLD: 0.60, // Require a close embedding distance
    PROCESSING_TIMEOUT: 30000,
    HIGH_CONFIDENCE_COSINE: 0.85,
    HIGH_CONFIDENCE_EUCLIDEAN: 0.55,
    MEDIUM_CONFIDENCE_COSINE: 0.65,
    MEDIUM_CONFIDENCE_EUCLIDEAN: 0.65,
  },

  // Storage Keys
  STORAGE: {
    CHECK_IN: 'user_check_in_data',
    CAPTURED_FACE: 'captured_face_data',
    REGISTERED_FACE: 'registered_face_cache', // ✅ ADD THIS
    BG_ELAPSED: 'bg_last_elapsed_seconds',
    CHECK_IN_DATE: 'CHECK_IN_DATE',
    SHIFT_END_TS: 'shift_end_ts',
    AUTO_CHECKOUT_TIME: 'auto_checkout_time',
    EMPLOYEE_DETAILS: 'employee_details_for_checkout',
    BUFFERING_START_TIME: 'buffering_start_time',
    SHIFT_END_TIME: 'shift_end_time',
  },

  // Timeouts
  TIMEOUTS: {
    LOCATION: 20000,
    ATTENDANCE: 15000,
    CAMERA: 30000,
    API: 10000,
    IMAGE_PROCESSING: 15000,
  },

  // Shift
  SHIFT: {
    DEFAULT_SECONDS: 28800, // 8 hours
    DEFAULT_HOURS: 8,
    MIN_OT_MINUTES: 30,
  },

  // Background Service
  BACKGROUND_SERVICE: {
    TASK_NAME: 'Shift Progress',
    TASK_TITLE: 'Shift in progress',
    TASK_DESC: 'Working...',
    COLOR: '#2563EB',
    UPDATE_INTERVAL: 1000, // 1 second
    API_INTERVAL: 10800000, // 3 hours = 3 * 60 * 60 * 1000 ms
    MAX_CONSECUTIVE_ERRORS: 5,
  },

  // Device (make this dynamic in production)
  DEVICE: {
    NAME: 'Mobile App',
    SERIAL: '1',
    VERIFICATION_CODE: '1',
  },

  // Image Processing
  IMAGE: {
    MAX_WIDTH: 800,
    MAX_HEIGHT: 800,
    QUALITY: 0.8,
    MAX_SIZE_BYTES: 5000000,
    RESIZE_WIDTH: 500, // Reduced from 500 to prevent SQLite "Row too big" error
    RESIZE_HEIGHT: 500, // Reduced from 500 to prevent SQLite "Row too big" error
    RESIZE_QUALITY: 0.7, // Reduced from 0.7 to prevent SQLite "Row too big" error
  },
};


import AsyncStorage from '@react-native-async-storage/async-storage';
import {APP_CONFIG} from '../constants/APP_CONFIG';
import logger from '../utils/logger';

class SecureStorage {
  // Basic encryption (use react-native-encrypted-storage in production)
  static async setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      logger.error('SecureStorage setItem error:', error);
      return false;
    }
  }

  static async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;

      // SecureStorage values are JSON encoded, but Profile and older app
      // versions store biometric flags as plain AsyncStorage strings such as
      // `face` and `true`. Treat those valid legacy values as strings instead
      // of failing every check-in/background-service read.
      try {
        return JSON.parse(value);
      } catch (_) {
        return value;
      }
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  static async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      return false;
    }
  }

  static async multiRemove(keys) {
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('SecureStorage multiRemove error:', error);
      return false;
    }
  }

  // Check-in specific methods
  static async saveCheckInState(isCheckedIn, startTime = null, faceData = null) {
    try {
      const data = {
        checkedIn: isCheckedIn,
        checkInTime: startTime || (isCheckedIn ? Date.now() : null),
        timestamp: Date.now(),
      };

      const results = await Promise.all([
        this.setItem(APP_CONFIG.STORAGE.CHECK_IN, data),
        isCheckedIn 
          ? this.setItem(APP_CONFIG.STORAGE.CHECK_IN_DATE, new Date().toISOString().split('T')[0])
          : this.removeItem(APP_CONFIG.STORAGE.CHECK_IN_DATE),
        faceData 
          ? this.setItem(APP_CONFIG.STORAGE.CAPTURED_FACE, faceData)
          : !isCheckedIn 
            ? this.removeItem(APP_CONFIG.STORAGE.CAPTURED_FACE)
            : true,
      ]);

      return results.every(r => r);
    } catch (error) {
      console.error('saveCheckInState error:', error);
      return false;
    }
  }

  static async loadCheckInState() {
    try {
      const [checkInData, faceData] = await Promise.all([
        this.getItem(APP_CONFIG.STORAGE.CHECK_IN),
        this.getItem(APP_CONFIG.STORAGE.CAPTURED_FACE),
      ]);

      return { checkInData, faceData };
    } catch (error) {
      console.error('loadCheckInState error:', error);
      return { checkInData: null, faceData: null };
    }
  }
}

export default SecureStorage;

import {useState, useEffect, useCallback, useRef} from 'react';
import {Alert, Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import jpeg from 'jpeg-js';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {InferenceSession, Tensor} from 'onnxruntime-react-native';

// iOS Configuration
const INPUT_SIZE = 224;
const COSINE_THRESHOLD = 0.85; // Require a strong embedding match for check-in
const EUCLIDEAN_THRESHOLD = 0.55; // Require a close embedding distance
const MODEL_NAME = 'tiny_model.onnx';

/**
 * iOS-specific Face Recognition Hook using ONNX Runtime
 * @returns {Object} Face recognition utilities for iOS
 */
const useIOSFaceRecognition = () => {
  const [session, setSession] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  // Load ONNX model on mount (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const loadModel = async () => {
      try {
        console.log('🍎 Loading iOS ONNX model...');
        setIsModelLoading(true);

        const modelPath = `${RNFS.MainBundlePath}/${MODEL_NAME}`;
        const exists = await RNFS.exists(modelPath);

        if (!exists) {
          Alert.alert(
            'Model Error',
            `ONNX model "${MODEL_NAME}" not found. Please add it to Copy Bundle Resources in Xcode.`,
          );
          return;
        }

        const inferenceSession = await InferenceSession.create(modelPath, {
          executionProviders: ['cpu'],
        });

        console.log('✅ iOS ONNX Model Loaded');
        setSession(inferenceSession);
      } catch (error) {
        console.error('❌ iOS Model load failed:', error);
        Alert.alert('Model Error', error.message);
      } finally {
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  // Normalize vector
  const normalize = useCallback(vec => {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
      sum += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sum);
    if (norm === 0) return vec;

    const normalized = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      normalized[i] = vec[i] / norm;
    }
    return normalized;
  }, []);

  // Preprocess image for iOS ONNX model
  const preprocessImage = useCallback(async base64Image => {
    try {
      const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const filePath = `${RNFS.CachesDirectoryPath}/temp_${Date.now()}.jpg`;

      await RNFS.writeFile(filePath, pureBase64, 'base64');

      const resized = await ImageResizer.createResizedImage(
        filePath,
        INPUT_SIZE,
        INPUT_SIZE,
        'JPEG',
        85,
        0,
        undefined,
        false,
        {
          mode: 'cover',
          onlyScaleDown: false,
        },
      );

      const resizedPath = resized.uri.replace('file://', '');
      const resizedBase64 = await RNFS.readFile(resizedPath, 'base64');

      // Cleanup temporary files
      RNFS.unlink(filePath).catch(() => {});
      RNFS.unlink(resizedPath).catch(() => {});

      return resizedBase64;
    } catch (err) {
      console.error('iOS preprocessing error:', err);
      return null;
    }
  }, []);

  // Get embedding from image
  const getEmbedding = useCallback(
    async base64Image => {
      try {
        if (!session) throw new Error('ONNX session not initialized');

        const processedBase64 = await preprocessImage(base64Image);
        if (!processedBase64) throw new Error('Image preprocessing failed');

        const raw = jpeg.decode(Buffer.from(processedBase64, 'base64'), {
          useTArray: true,
          formatAsRGBA: false,
        });

        if (!raw || !raw.data) throw new Error('JPEG decode failed');

        const mean = [0.5, 0.5, 0.5];
        const std = [0.5, 0.5, 0.5];
        const floatData = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);

        // Convert RGB to normalized tensor format
        for (let y = 0; y < INPUT_SIZE; y++) {
          for (let x = 0; x < INPUT_SIZE; x++) {
            const idx = (y * INPUT_SIZE + x) * 3;
            const r = (raw.data[idx] / 255.0 - mean[0]) / std[0];
            const g = (raw.data[idx + 1] / 255.0 - mean[1]) / std[1];
            const b = (raw.data[idx + 2] / 255.0 - mean[2]) / std[2];

            floatData[y * INPUT_SIZE + x] = r;
            floatData[INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = g;
            floatData[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = b;
          }
        }

        const tensor = new Tensor('float32', floatData, [
          1,
          3,
          INPUT_SIZE,
          INPUT_SIZE,
        ]);
        const feeds = {[session.inputNames[0]]: tensor};
        const results = await session.run(feeds);

        const embedding = results[session.outputNames[0]].data;
        return normalize(embedding);
      } catch (err) {
        console.error('iOS embedding error:', err);
        return null;
      }
    },
    [session, preprocessImage, normalize],
  );

  // Calculate cosine similarity
  const cosineSimilarity = useCallback((a, b) => {
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return Math.max(-1, Math.min(1, dot / (normA * normB)));
  }, []);

  // Calculate euclidean distance
  const euclideanDistance = useCallback((a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }, []);

  // Match two faces (iOS-specific thresholds)
  const matchFaces = useCallback(
    async (face1, face2) => {
      if (!session) {
        throw new Error('Model not loaded yet');
      }
      if (!face1 || !face2) {
        throw new Error('Both images are required for matching');
      }

      setIsProcessing(true);
      setMatchResult(null);

      try {
        console.log('🎯 iOS: Starting face matching...');

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Face processing timeout')), 30000);
        });

        const embeddingPromise = Promise.all([
          getEmbedding(face1),
          getEmbedding(face2),
        ]);

        const [emb1, emb2] = await Promise.race([
          embeddingPromise,
          timeoutPromise,
        ]);

        if (!emb1 || !emb2) {
          throw new Error('Failed to generate face embeddings');
        }

        const similarity = cosineSimilarity(emb1, emb2);
        const distance = euclideanDistance(emb1, emb2);

        // ✅ Moderate: AND logic (BOTH metrics must pass for match)
        const isMatch =
          similarity >= COSINE_THRESHOLD && distance <= EUCLIDEAN_THRESHOLD;

        // iOS confidence levels (Adjusted for 70% threshold)
        let confidence = 'LOW';
        if (similarity >= 0.85 && distance <= 0.50) {
          confidence = 'HIGH'; // 85%+ similarity, very close vectors
        } else if (similarity >= 0.70 && distance <= 0.70) {
          confidence = 'MEDIUM'; // 70%+ similarity, moderate distance
        }

        const result = {
          isMatch,
          similarity,
          distance,
          confidence,
          platform: 'iOS',
        };

        console.log('✅ iOS Match Result:', {
          similarity: similarity.toFixed(4),
          distance: distance.toFixed(4),
          isMatch,
          confidence,
          threshold: `≥${COSINE_THRESHOLD} && ≤${EUCLIDEAN_THRESHOLD}`,
        });

        setMatchResult(result);
        return result;
      } catch (error) {
        console.error('❌ iOS face matching error:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [session, getEmbedding, cosineSimilarity, euclideanDistance],
  );

  return {
    session,
    isModelLoading,
    isProcessing,
    matchResult,
    getEmbedding,
    matchFaces,
    cosineSimilarity,
    euclideanDistance,
  };
};

export default useIOSFaceRecognition;

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {APP_CONFIG} from '../constants/APP_CONFIG';
import logger from '../utils/logger';

const FaceScanCamera = ({
  visible,
  onClose,
  onScanComplete,
  onTimeout,
  scanDuration = 10, // 🔒 SECURITY: 10 seconds for better image quality and stricter matching
}) => {
  const [countdown, setCountdown] = useState(scanDuration);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const device = useCameraDevice('front');
  const camera = useRef(null);
  const countdownInterval = useRef(null);
  const captureTimeout = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      logger.debug('🔐 Camera permission status:', status);
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Start countdown when camera opens
  useEffect(() => {
    if (visible && hasPermission && device) {
      setCountdown(scanDuration);
      setIsScanning(true);
      setIsCapturing(false);
      
      // Wait for camera to fully initialize before starting countdown
      const cameraInitTimer = setTimeout(() => {
        logger.debug('Camera initialized - starting countdown');
        
        // Start countdown timer
        countdownInterval.current = setInterval(() => {
          setCountdown(prev => {
            const newValue = prev - 1;
            if (newValue <= 0) {
              clearInterval(countdownInterval.current);
              return 0;
            }
            return newValue;
          });
        }, 1000);

        // Animate progress bar
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: scanDuration * 1000,
          useNativeDriver: false,
        }).start();

        // Auto capture when countdown reaches 0
        captureTimeout.current = setTimeout(() => {
          captureAndProcess();
        }, scanDuration * 1000);
      }, 1500); // 1.5 second delay for camera initialization
      
      return () => {
        clearTimeout(cameraInitTimer);
      };
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
      if (captureTimeout.current) {
        clearTimeout(captureTimeout.current);
      }
      progressAnim.setValue(0);
    };
  }, [visible, hasPermission, device, scanDuration]);

  const captureAndProcess = async () => {
    if (isCapturing) {
      logger.warn('Capture already in progress');
      return;
    }
    
    setIsCapturing(true);

    try {
      // Small delay to ensure camera is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!camera.current) {
        throw new Error('Camera not ready');
      }

      // Use balanced mode for better quality
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'off',
        enableShutterSound: false,
      });

      const RNFS = require('react-native-fs');
      const ImageResizer = require('@bam.tech/react-native-image-resizer').default;
      
      // Use EXACT same settings as registration for consistent face matching
      const width = APP_CONFIG.IMAGE.RESIZE_WIDTH || 320;
      const height = APP_CONFIG.IMAGE.RESIZE_HEIGHT || 320;
      const quality = (APP_CONFIG.IMAGE.RESIZE_QUALITY || 0.5) * 100;
      
      const resized = await ImageResizer.createResizedImage(
        photo.path,
        width,
        height,
        'JPEG',
        quality,
        0,
        null,
        false,
        {mode: 'cover', onlyScaleDown: false},
      );

      const photoPath = resized.uri.replace('file://', '');
      const base64String = await RNFS.readFile(photoPath, 'base64');
      const base64Image = `data:image/jpeg;base64,${base64String}`;

      // Clean up
      RNFS.unlink(photoPath).catch(() => {});
      RNFS.unlink(photo.path).catch(() => {});
      
      // Call the callback with captured image
      onScanComplete(base64Image);
    } catch (error) {
      logger.error('Capture error:', error);
      setIsCapturing(false);
      onTimeout();
    }
  };

  const handleCancel = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    if (captureTimeout.current) {
      clearTimeout(captureTimeout.current);
    }
    setIsScanning(false);
    setIsCapturing(false);
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsCapturing(false);
      setIsScanning(false);
      setCountdown(scanDuration);
    }
  }, [visible, scanDuration]);

  if (!visible) return null;

  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </Modal>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* Live Camera Feed */}
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible}
          photo={true}
        />

        {/* Dark Overlay */}
        <View style={styles.overlay}>
          {/* Top Bar - Cancel (Left) & Timer (Right) */}
          <View style={styles.topBar}>
            {/* Cancel Button - Left */}
            <TouchableOpacity
              style={styles.cancelButtonTop}
              onPress={handleCancel}
              activeOpacity={0.8}>
              <Text style={styles.cancelIconText}>✕</Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{flex: 1}} />

            {/* Timer or Try Again Button - Right */}
            {countdown > 0 ? (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{countdown}s</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.tryAgainButton}
                onPress={handleCancel}
                activeOpacity={0.8}>
                <Text style={styles.tryAgainButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Camera framing guide; it is not a face-detection indicator. */}
          <View style={styles.centerContent}>
            <View style={[
              styles.faceRectangle,
              {borderColor: '#3B82F6'}
            ]}>
              <View style={[
                styles.faceCorner,
                styles.topLeft,
                {borderColor: '#3B82F6'}
              ]} />
              <View style={[
                styles.faceCorner,
                styles.topRight,
                {borderColor: '#3B82F6'}
              ]} />
              <View style={[
                styles.faceCorner,
                styles.bottomLeft,
                {borderColor: '#3B82F6'}
              ]} />
              <View style={[
                styles.faceCorner,
                styles.bottomRight,
                {borderColor: '#3B82F6'}
              ]} />
            </View>
          </View>

          {/* Bottom Message Bar - Button Style with Smiley Icon */}
          <View style={styles.bottomContainer}>
            <View style={styles.messageButton}>
              <View style={styles.messageTextContainer}>
                <Text style={styles.messageTitle}>
                  {countdown > 0 ? 'Camera Ready' : 'Scan Complete'}
                </Text>
                <Text style={styles.messageSubtext}>
                  {countdown > 0 
                    ? 'Hold still and look at camera' 
                    : 'Try Again'}
                </Text>
              </View>
              <View style={styles.smileyIconContainer}>
                <Text style={styles.smileyIcon}>{countdown > 0 ? '😊' : '✅'}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelIconText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  timerContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  tryAgainButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tryAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  faceRectangle: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderRadius: 20,
    borderStyle: 'dashed',
    position: 'relative',
  },
  faceCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 20,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    alignItems: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    minWidth: 320,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10,
  },
  messageTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  messageSubtext: {
    color: '#D1D5DB',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  smileyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  smileyIcon: {
    fontSize: 24,
  },
  messageCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 320,
  },
  scanningTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanningSubtext: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FaceScanCamera;import React, {memo, useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import {Card} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DeviceEventEmitter} from 'react-native';
import BiometricService from '../utils/BiomatricServices';
import ApiService from '../constants/ApiService';
import FaceRecognitionService from '../constants/FaceRecognitionService';
import useIOSFaceRecognition from '../hooks/useIOSFaceRecognition';
import {useAuth} from '../constants/AuthContext';
import {useFocusEffect} from '@react-navigation/native';
import {
  AS_KEY,
  MIN_FACE_IMAGE_LENGTH,
  MIN_FINGERPRINT_LENGTH,
} from '../utils/constants';
import {
  isValidFaceImage,
  isValidFingerprintEmbedding,
} from '../utils/biometricValidation';
import {Buffer} from 'buffer';
import Toast from 'react-native-toast-message';
import logger from '../utils/logger';
import DataText from '../component/DataText';
import styles from './profileStyles';

// ─────────────────────── Component ───────────────────────

/**
 * BiometricsSection — collapsible card for biometric authentication.
 *
 * Props:
 *   employeeId  — numeric employee ID from the profile
 *   companyId   — numeric company/childCompanyId for API calls
 */
const BiometricsSection = ({employeeId, companyId}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animatedRotation = useRef(new Animated.Value(0)).current;
  const animatedHeight = useRef(new Animated.Value(0)).current;

  // Biometric toggle state
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isFaceEnabled, setIsFaceEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  // Admin access state
  const [adminFaceEnabled, setAdminFaceEnabled] = useState(true);
  const [adminFingerprintEnabled, setAdminFingerprintEnabled] = useState(false);
  const [isLoadingAdminSettings, setIsLoadingAdminSettings] = useState(true);

  const {user} = useAuth();
  const iosFaceRecognition = useIOSFaceRecognition();

  const currentEmployeeId = employeeId || user?.id;

  // ─── Animate section open/close ───

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedHeight, {
        toValue: isOpen ? 1 : 0,
        damping: 15,
        stiffness: 100,
        useNativeDriver: false,
      }),
      Animated.timing(animatedRotation, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, animatedHeight, animatedRotation]);

  const toggleSection = () => setIsOpen(!isOpen);

  const rotateInterpolate = animatedRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // ─── Admin biometric settings ───

  const fetchAdminBiometricSettings = async () => {
    if (!currentEmployeeId || !companyId) {
      setIsLoadingAdminSettings(false);
      return;
    }

    try {
      const settings = await ApiService.fetchBiometricEnableStatus(
        currentEmployeeId,
        companyId,
      );

      if (Platform.OS === 'ios') {
        setAdminFaceEnabled(settings.isFaceEnable === true);
        setAdminFingerprintEnabled(false);
      } else {
        setAdminFaceEnabled(settings.isFaceEnable === true);
        setAdminFingerprintEnabled(settings.isFingerEnable === true);
      }

      // Sync local state from server
      const [savedType, savedFaceEnabled, savedFingerprintEnabled] =
        await Promise.all([
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_TYPE),
          AsyncStorage.getItem(AS_KEY.FACE_ENABLED),
          AsyncStorage.getItem(AS_KEY.FINGERPRINT_ENABLED),
        ]);

      const faceEnabledFromProfile =
        savedType === 'face' && savedFaceEnabled === 'true';
      const fingerprintEnabledFromProfile =
        savedType === 'fingerprint' &&
        savedFingerprintEnabled === 'true' &&
        Platform.OS !== 'ios';

      setIsFaceEnabled(faceEnabledFromProfile);
      setIsBiometricEnabled(fingerprintEnabledFromProfile);

      logger.debug('🔐 ===== PROFILE SYNCED FROM SERVER =====');
      logger.debug('🔐 Selected Face Enabled:', faceEnabledFromProfile);
      logger.debug('🔐 Synced Fingerprint Enabled:', fingerprintEnabledFromProfile);
      logger.debug('🔐 Selected Type:', savedType || 'none');
    } catch (error) {
      logger.error('❌ Error fetching admin biometric settings:', error);
      if (Platform.OS === 'ios') {
        setAdminFaceEnabled(true);
        setAdminFingerprintEnabled(false);
      } else {
        setAdminFaceEnabled(false);
        setAdminFingerprintEnabled(false);
      }
    } finally {
      setIsLoadingAdminSettings(false);
    }
  };

  // ─── Check biometric status on mount ───

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        // Check device biometric availability
        const {available: sensorAvailable, biometryType} = await BiometricService.isBiometricAvailable();
        if (mounted) {
          setBiometricAvailable(sensorAvailable);
          setBiometryType(biometryType);
        }

        // Read local storage
        const [
          biometricEnabled,
          biometricUserId,
          fingerprintEnabled,
          faceEnabled,
          biometricType,
        ] = await Promise.all([
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_ENABLED),
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_USER_ID),
          AsyncStorage.getItem(AS_KEY.FINGERPRINT_ENABLED),
          AsyncStorage.getItem(AS_KEY.FACE_ENABLED),
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_TYPE),
        ]);

        if (mounted) {
          setIsBiometricEnabled(biometricEnabled === 'true');
          setIsFaceEnabled(faceEnabled === 'true');
        }

        // Fetch admin settings
        await fetchAdminBiometricSettings();
      } catch (error) {
        logger.error('❌ Error checking biometric status:', error);
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, []);

  // ─── Listen for biometric status updates ───

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'biometricStatusUpdated',
      async data => {
        logger.debug('📱 Received biometric status update:', data);

        const [
          biometricEnabled,
          fingerprintEnabled,
          faceEnabled,
          biometricType,
        ] = await Promise.all([
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_ENABLED),
          AsyncStorage.getItem(AS_KEY.FINGERPRINT_ENABLED),
          AsyncStorage.getItem(AS_KEY.FACE_ENABLED),
          AsyncStorage.getItem(AS_KEY.BIOMETRIC_TYPE),
        ]);

        setIsBiometricEnabled(biometricEnabled === 'true');
        setIsFaceEnabled(faceEnabled === 'true');
      },
    );

    return () => subscription.remove();
  }, []);

  // ─── Refresh on focus ───

  useFocusEffect(
    React.useCallback(() => {
      fetchAdminBiometricSettings();
    }, [fetchAdminBiometricSettings]),
  );

  // ─── Enable biometric ───

  const handleEnableBiometric = async (type = 'fingerprint') => {
    if (!biometricAvailable) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device.',
      );
      return;
    }

    if (type === 'face') {
      if (!adminFaceEnabled) {
        Alert.alert('Access Denied', 'Face registration is not enabled by admin.');
        return;
      }
      setFaceLoading(true);
    } else {
      if (Platform.OS !== 'android') {
        Alert.alert('Not Supported', 'Fingerprint is supported on Android only.');
        return;
      }
      if (!adminFingerprintEnabled) {
        Alert.alert(
          'Access Denied',
          'Fingerprint registration is not enabled by admin.',
        );
        return;
      }
      setLoading(true);
    }

    try {
      logger.debug('🔐 ENABLE BIOMETRIC START — Type:', type);
      const resolvedCompanyId = companyId || user?.childCompanyId;
      if (!currentEmployeeId || !resolvedCompanyId) {
        throw new Error('Employee or company details are unavailable.');
      }

      if (type === 'face') {
        // ── Face Registration ──

        // Check if already registered
        let isAlreadyRegistered = false;

        try {
          const biometricData = await ApiService.fetchBiometricDetails(
            currentEmployeeId,
            resolvedCompanyId,
          );

          const faceImage = biometricData?.faceImage;
          isAlreadyRegistered = isValidFaceImage(faceImage);
        } catch (fetchError) {
          logger.warn('⚠️ Could not fetch biometric details:', fetchError.message);
        }

        if (!isAlreadyRegistered) {
          if (Platform.OS === 'android' && !FaceRecognitionService.session) {
            await FaceRecognitionService.loadModel();
          }

          const imagePickerModule = require('react-native-image-picker');
          const pickerLaunchCamera =
            imagePickerModule?.launchCamera ||
            imagePickerModule?.default?.launchCamera;
          if (typeof pickerLaunchCamera !== 'function') {
            throw new Error('Camera module is unavailable.');
          }

          const captureResult = await new Promise(resolve =>
            pickerLaunchCamera(
              {
                mediaType: 'photo',
                includeBase64: true,
                cameraType: 'front',
                quality: 0.8,
                maxWidth: 720,
                maxHeight: 720,
              },
              resolve,
            ),
          );

          if (captureResult?.didCancel) {
            throw new Error('Face registration was cancelled.');
          }

          const rawBase64 = captureResult?.assets?.[0]?.base64;
          if (!rawBase64) {
            throw new Error('No image captured for face registration.');
          }

          const faceImage = `data:image/jpeg;base64,${rawBase64}`;
          const embedding =
            Platform.OS === 'ios'
              ? await iosFaceRecognition.getEmbedding(faceImage)
              : await FaceRecognitionService.getEmbedding(faceImage);
          if (!embedding) {
            throw new Error('Failed to generate face embedding.');
          }

          const embeddingBase64 = Buffer.from(
            new Float32Array(embedding).buffer,
          ).toString('base64');

          const registrationPayload = {
            EmployeeId: currentEmployeeId,
            FaceImage: rawBase64,
            FaceEmbeding: embeddingBase64,
            FingerImage: null,
            FingerEmbeding: null,
            RetinaImage: null,
            RetinaEmbeding: null,
            VoiceRecord: null,
            VoiceRecordEmbeding: null,
            CreatedDate: new Date().toISOString(),
            ModifiedBy: currentEmployeeId,
            IsDelete: 0,
            CompanyId: resolvedCompanyId,
          };

          await ApiService.saveBiometricRegistration(registrationPayload);
          logger.debug('✅ Face registered in backend from Profile toggle');
        }

        // Enable face in backend
        const enablePayload = {
          EmployeeId: currentEmployeeId,
          IsFaceAuthunticateEnable: 'true',
          IsFingerAuthenticateEnable: 'false',
          CreatedDate: new Date().toISOString(),
          CreatedBy: currentEmployeeId,
          ModifiedDate: new Date().toISOString(),
          ModifiedBy: currentEmployeeId,
        };

        await ApiService.updateBiometricEnableStatus(enablePayload);

        // Update local storage
        await AsyncStorage.multiSet([
          [AS_KEY.FACE_ENABLED, 'true'],
          [AS_KEY.FINGERPRINT_ENABLED, 'false'],
          [AS_KEY.BIOMETRIC_TYPE, 'face'],
          [AS_KEY.BIOMETRIC_ENABLED, 'true'],
          [AS_KEY.BIOMETRIC_USER_ID, String(currentEmployeeId)],
        ]);

        setIsFaceEnabled(true);
        setIsBiometricEnabled(false);

        Toast.show({
          type: 'success',
          text1: 'Face Recognition Enabled',
          text2: 'You can now use Face Recognition for check-in.',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        // ── Fingerprint Registration (Android only) ──

        // Check if already registered
        let isAlreadyRegistered = false;

        try {
          const biometricData = await ApiService.fetchBiometricDetails(
            currentEmployeeId,
            resolvedCompanyId,
          );

          const fingerprintEmbedding = biometricData?.fingerEmbeding;
          isAlreadyRegistered = isValidFingerprintEmbedding(
            fingerprintEmbedding,
          );
        } catch (fetchError) {
          logger.warn(
            '⚠️ Could not fetch biometric details:',
            fetchError.message,
          );
        }

        if (!isAlreadyRegistered) {
          // Create new keys
          const authenticated = await BiometricService.authenticate(
            'Scan fingerprint to register',
          );
          if (!authenticated) {
            throw new Error('Fingerprint authentication was cancelled.');
          }

          const publicKey = await BiometricService.createKeys();
          const enabled = await BiometricService.enableBiometric(
            currentEmployeeId,
            publicKey,
          );
          if (!enabled) {
            throw new Error('Failed to enable local biometric key storage.');
          }

          const fingerprintPayload = {
            EmployeeId: currentEmployeeId,
            FaceImage: null,
            FaceEmbeding: null,
            FingerImage: null,
            FingerEmbeding: publicKey,
            RetinaImage: null,
            RetinaEmbeding: null,
            VoiceRecord: null,
            VoiceRecordEmbeding: null,
            CreatedDate: new Date().toISOString(),
            ModifiedBy: currentEmployeeId,
            IsDelete: 0,
            CompanyId: resolvedCompanyId,
          };

          await ApiService.saveBiometricRegistration(fingerprintPayload);
          logger.debug('✅ Fingerprint saved to backend');
        }

        // Enable in backend
        const enablePayload = {
          EmployeeId: currentEmployeeId,
          IsFaceAuthunticateEnable: 'false',
          IsFingerAuthenticateEnable: 'true',
          CreatedDate: new Date().toISOString(),
          CreatedBy: currentEmployeeId,
          ModifiedDate: new Date().toISOString(),
          ModifiedBy: currentEmployeeId,
        };

        await ApiService.updateBiometricEnableStatus(enablePayload);

        // Update local storage
        await AsyncStorage.multiSet([
          [AS_KEY.FACE_ENABLED, 'false'],
          [AS_KEY.FINGERPRINT_ENABLED, 'true'],
          [AS_KEY.BIOMETRIC_TYPE, 'fingerprint'],
          [AS_KEY.BIOMETRIC_ENABLED, 'true'],
          [AS_KEY.BIOMETRIC_USER_ID, String(currentEmployeeId)],
        ]);

        setIsBiometricEnabled(true);
        setIsFaceEnabled(false);

        Toast.show({
          type: 'success',
          text1: 'Fingerprint Enabled',
          text2: 'You can now use fingerprint for check-in.',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      logger.error('❌ Failed to enable biometric:', error);
      Alert.alert('Error', error?.message || 'Failed to enable biometric. Please try again.');
    } finally {
      setLoading(false);
      setFaceLoading(false);
    }
  };

  // ─── Disable biometric ───

  const handleDisableBiometric = async (type = 'fingerprint') => {
    Alert.alert(
      'Disable Biometric',
      `Are you sure you want to disable ${
        type === 'face' ? 'Face Recognition' : 'fingerprint'
      } authentication?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setFaceLoading(true);

            try {
              const success = await BiometricService.disableBiometric();
              logger.debug('🔓 Disable Success:', success);

              if (success) {
                const faceEnabledCheck = await AsyncStorage.getItem(
                  AS_KEY.FACE_ENABLED,
                );
                const fingerprintEnabledCheck = await AsyncStorage.getItem(
                  AS_KEY.FINGERPRINT_ENABLED,
                );

                let newFaceEnabled = faceEnabledCheck === 'true';
                let newFingerprintEnabled = fingerprintEnabledCheck === 'true';

                if (type === 'fingerprint') {
                  newFingerprintEnabled = false;
                } else if (type === 'face') {
                  newFaceEnabled = false;
                }

                const enablePayload = {
                  EmployeeId: currentEmployeeId,
                  IsFaceAuthunticateEnable: newFaceEnabled ? 'true' : 'false',
                  IsFingerAuthenticateEnable: newFingerprintEnabled
                    ? 'true'
                    : 'false',
                  CreatedDate: new Date().toISOString(),
                  CreatedBy: currentEmployeeId,
                  ModifiedDate: new Date().toISOString(),
                  ModifiedBy: currentEmployeeId,
                };

                try {
                  await ApiService.updateBiometricEnableStatus(enablePayload);
                  logger.debug('✅ Backend enable status updated');
                } catch (backendError) {
                  logger.error(
                    '❌ Failed to update backend enable status:',
                    backendError,
                  );
                }

                if (type === 'fingerprint') {
                  await AsyncStorage.setItem(
                    AS_KEY.FINGERPRINT_ENABLED,
                    'false',
                  );

                  if (faceEnabledCheck === 'true') {
                    await AsyncStorage.setItem(AS_KEY.BIOMETRIC_TYPE, 'face');
                    setIsFaceEnabled(true);
                    setIsBiometricEnabled(true);
                  } else {
                    await AsyncStorage.setItem(AS_KEY.BIOMETRIC_TYPE, 'none');
                    setIsFaceEnabled(false);
                    setIsBiometricEnabled(false);
                  }
                } else {
                  await AsyncStorage.setItem(AS_KEY.FACE_ENABLED, 'false');

                  if (fingerprintEnabledCheck === 'true') {
                    await AsyncStorage.setItem(
                      AS_KEY.BIOMETRIC_TYPE,
                      'fingerprint',
                    );
                    setIsBiometricEnabled(true);
                  } else {
                    await AsyncStorage.setItem(AS_KEY.BIOMETRIC_TYPE, 'none');
                    setIsBiometricEnabled(false);
                  }
                }

                Toast.show({
                  type: 'success',
                  text1: 'Biometric Disabled',
                  text2: `${
                    type === 'face' ? 'Face Recognition' : 'Fingerprint'
                  } has been disabled.`,
                  position: 'top',
                  visibilityTime: 3000,
                });
              }
            } catch (error) {
              logger.error('❌ Error disabling biometric:', error);
              Alert.alert('Error', 'Failed to disable biometric.');
            } finally {
              setLoading(false);
              setFaceLoading(false);
            }
          },
        },
      ],
    );
  };

  // ─── Test biometric ───

  const handleTestBiometric = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem(
        AS_KEY.BIOMETRIC_ENABLED,
      );
      const biometricUserId = await AsyncStorage.getItem(
        AS_KEY.BIOMETRIC_USER_ID,
      );
      const biometricType = await AsyncStorage.getItem(AS_KEY.BIOMETRIC_TYPE);

      if (!biometricEnabled || biometricEnabled !== 'true') {
        Alert.alert(
          'Not Enabled',
          'Please enable biometric authentication first.',
        );
        return;
      }

      const success = await BiometricService.authenticate(
        `Test ${biometricType || 'biometric'} authentication`,
        `Verify your identity to test ${biometricType || 'biometric'}`,
      );

      if (success) {
        Alert.alert(
          '✅ Authentication Successful!',
          'Your biometric authentication is working correctly. You can now use it for check-in.',
        );
      }
    } catch (error) {
      logger.error('❌ Biometric test failed:', error);
      Alert.alert('Authentication Failed', 'Biometric authentication failed.');
    }
  };

  // ─── Helpers ───

  const toggleBiometric = () => {
    if (isBiometricEnabled) {
      handleDisableBiometric('fingerprint');
    } else {
      handleEnableBiometric('fingerprint');
    }
  };

  const toggleFaceBiometric = () => {
    if (isFaceEnabled) {
      handleDisableBiometric('face');
    } else {
      handleEnableBiometric('face');
    }
  };

  const getBiometricIcon = () => {
    if (Platform.OS === 'ios') {
      return biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint';
    }
    return 'fingerprint';
  };

  const getBiometricLabel = () => {
    if (Platform.OS === 'ios') {
      return biometryType === 'FaceID' ? 'Face Recognition' : 'Biometric';
    }
    return 'Fingerprint Authentication';
  };

  // ─── Render ───

  // iOS: only show if admin has enabled face
  if (Platform.OS === 'ios' && !adminFaceEnabled) {
    logger.debug(
      '⚠️ Both Face and Fingerprint disabled by admin - hiding biometric section',
    );
    return null;
  }

  const heightInterpolate = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isOpen ? 1000 : 0],
  });

  return (
    <Card style={styles.sectionCard} elevation={0}>
      {/* Section Header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggleSection}
        style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={styles.sectionIconContainer}>
            <Icon name="shield-check" size={22} color="#224F2B" />
          </View>
          <DataText style={styles.sectionTitle}>
            Biometric Authentication
          </DataText>
        </View>
        <Animated.View
          style={{transform: [{rotate: rotateInterpolate}]}}>
          <Icon name="chevron-down" size={24} color="#666" />
        </Animated.View>
      </TouchableOpacity>

      {/* Expandable Content */}
      <Animated.View
        style={[
          styles.sectionContent,
          {
            maxHeight: heightInterpolate,
            opacity: animatedHeight,
            overflow: 'hidden',
          },
        ]}>
        {/* Android fingerprint toggle */}
        {Platform.OS === 'android' && adminFingerprintEnabled && (
          <View style={styles.biometricsCardContainer}>
            <View style={styles.biometricsRow}>
              <View style={styles.biometricsLeftContent}>
                <View style={styles.biometricsIconCircle}>
                  <Icon
                    name={getBiometricIcon()}
                    size={28}
                    color={biometricAvailable ? '#224F2B' : '#999'}
                  />
                </View>
                <View>
                  <DataText style={styles.biometricsText}>
                    {getBiometricLabel()}
                  </DataText>
                  {biometricAvailable && (
                    <DataText style={styles.biometricsSubtext}>
                      {isBiometricEnabled ? 'Active' : 'Inactive'}
                    </DataText>
                  )}
                </View>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#224F2B" />
              ) : (
                <Switch
                  trackColor={{false: '#d1d5db', true: '#86efac'}}
                  thumbColor={isBiometricEnabled ? '#119642' : '#f4f3f4'}
                  ios_backgroundColor="#d1d5db"
                  onValueChange={toggleBiometric}
                  value={isBiometricEnabled}
                  disabled={!biometricAvailable || loading}
                />
              )}
            </View>

            {/* Info Text */}
            {biometricAvailable && (
              <View style={styles.biometricInfoContainer}>
                <Icon name="information-outline" size={16} color="#666" />
                <DataText style={styles.biometricInfoText}>
                  {isBiometricEnabled
                    ? `You're using fingerprint for check-in. Face Recognition is disabled.`
                    : `Enable fingerprint for quick authentication. Note: This will disable Face Recognition.`}
                </DataText>
              </View>
            )}

            {!biometricAvailable && (
              <View style={styles.biometricInfoContainer}>
                <Icon name="alert-circle-outline" size={16} color="#F44336" />
                <DataText
                  style={[styles.biometricInfoText, {color: '#F44336'}]}>
                  Biometric authentication is not available on this device.
                </DataText>
              </View>
            )}
          </View>
        )}

        {/* Android divider */}
        {Platform.OS === 'android' && adminFingerprintEnabled && (
          <View style={styles.biometricDivider} />
        )}

        {/* Face Recognition toggle */}
        {(Platform.OS === 'android' || adminFaceEnabled) && (
          <View style={styles.biometricsCardContainer}>
            <View style={styles.biometricsRow}>
              <View style={styles.biometricsLeftContent}>
                <View
                  style={[
                    styles.biometricsIconCircle,
                    styles.faceIconCircleBg,
                  ]}>
                  <Icon name="face-recognition" size={28} color="#2563EB" />
                </View>
                <View>
                  <DataText style={styles.biometricsText}>
                    Enable Face Recognition
                  </DataText>
                  <DataText style={styles.biometricsSubtext}>
                    {isFaceEnabled ? 'Active' : 'Inactive'}
                  </DataText>
                </View>
              </View>
              {faceLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Switch
                  trackColor={{false: '#d1d5db', true: '#93C5FD'}}
                  thumbColor={isFaceEnabled ? '#2563EB' : '#f4f3f4'}
                  ios_backgroundColor="#d1d5db"
                  onValueChange={toggleFaceBiometric}
                  value={isFaceEnabled}
                  disabled={faceLoading}
                />
              )}
            </View>

            {/* Info Text */}
            <View
              style={[styles.biometricInfoContainer, styles.faceInfoContainer]}>
              <Icon name="information-outline" size={16} color="#2563EB" />
              <DataText style={[styles.biometricInfoText, {color: '#1E40AF'}]}>
                {isFaceEnabled
                  ? "You're using Face Recognition for check-in. Fingerprint is disabled."
                  : 'Enable Face Recognition to register your face via camera. This will disable Fingerprint.'}
              </DataText>
            </View>
          </View>
        )}
      </Animated.View>
    </Card>
  );
};

export default  BiometricsSection;


/**
 * BiometricManager - Utility for managing biometric authentication settings
 * Used by Profile screen to toggle between Face and Fingerprint authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorage from '../constants/SecureStorage';
import ApiService from '../constants/ApiService';

class BiometricManager {
  /**
   * Toggle biometric type between face and fingerprint
   * @param {string} newType - 'face' or 'fingerprint'
   * @param {object} employeeDetails - Employee information
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async switchBiometricType(newType, employeeDetails) {
    try {
      console.log('🔄 ========== SWITCHING BIOMETRIC TYPE ==========');
      console.log('🔄 Current Type -> New Type:', newType);
      console.log('🔄 Employee ID:', employeeDetails?.id);

      if (!['face', 'fingerprint'].includes(newType)) {
        throw new Error('Invalid biometric type. Must be "face" or "fingerprint".');
      }

      // Fetch current biometric data from backend
      const biometricData = await ApiService.fetchBiometricDetails(
        employeeDetails.id,
        employeeDetails.childCompanyId,
      );

      console.log('🔄 Backend Biometric Data:', JSON.stringify(biometricData, null, 2));

      // Verify the requested biometric type is registered
      if (newType === 'face') {
        const faceImage = biometricData?.faceImage;
        const hasValidFace =
          !!faceImage &&
          faceImage !== 'null' &&
          faceImage.trim() !== '' &&
          faceImage.length > 100;

        if (!hasValidFace) {
          return {
            success: false,
            message: 'Face not registered. Please register your face first.',
          };
        }
      } else if (newType === 'fingerprint') {
        const fingerEmbeding = biometricData?.fingerEmbeding;
        const hasValidFingerprint =
          !!fingerEmbeding &&
          fingerEmbeding !== 'null' &&
          fingerEmbeding.trim() !== '' &&
          fingerEmbeding.length > 50;

        if (!hasValidFingerprint) {
          return {
            success: false,
            message: 'Fingerprint not registered. Please register your fingerprint first.',
          };
        }
      }

      // Update backend enable status
      const enableStatusPayload = {
        EmployeeId: employeeDetails.id,
        IsFaceAuthunticateEnable: newType === 'face' ? 'true' : 'false',
        IsFingerAuthenticateEnable: newType === 'fingerprint' ? 'true' : 'false',
        CreatedDate: new Date().toISOString(),
        CreatedBy: employeeDetails.id,
        ModifiedDate: new Date().toISOString(),
        ModifiedBy: employeeDetails.id,
      };

      console.log('🔄 Enable Status Payload:', JSON.stringify(enableStatusPayload, null, 2));

      const response = await ApiService.updateBiometricEnableStatus(enableStatusPayload);

      if (!response?.isSuccess) {
        throw new Error(response?.message || 'Failed to update biometric enable status');
      }

      // Update local storage
      await AsyncStorage.setItem('biometric_type', newType);
      await AsyncStorage.setItem(`biometric_${newType}_enabled`, 'true');

      // Disable the other type
      const otherType = newType === 'face' ? 'fingerprint' : 'face';
      await AsyncStorage.setItem(`biometric_${otherType}_enabled`, 'false');

      console.log('✅ Biometric type switched successfully');
      console.log('🔄 New Type:', newType);
      console.log('🔄 ==============================================');

      return {
        success: true,
        message: `Successfully switched to ${newType} authentication`,
        biometricType: newType,
      };
    } catch (error) {
      console.error('❌ Error switching biometric type:', error);
      return {
        success: false,
        message: error.message || 'Failed to switch biometric type',
      };
    }
  }

  /**
   * Get current biometric type and status
   * @returns {Promise<{type: string, faceEnabled: boolean, fingerprintEnabled: boolean}>}
   */
  static async getCurrentBiometricStatus() {
    try {
      const biometricType = await AsyncStorage.getItem('biometric_type');
      const faceEnabled = await AsyncStorage.getItem('biometric_face_enabled');
      const fingerprintEnabled = await AsyncStorage.getItem('biometric_fingerprint_enabled');

      return {
        type: biometricType || 'none',
        faceEnabled: faceEnabled === 'true',
        fingerprintEnabled: fingerprintEnabled === 'true',
      };
    } catch (error) {
      console.error('❌ Error getting biometric status:', error);
      return {
        type: 'none',
        faceEnabled: false,
        fingerprintEnabled: false,
      };
    }
  }

  /**
   * Disable biometric authentication
   * @param {object} employeeDetails - Employee information
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async disableBiometric(employeeDetails) {
    try {
      console.log('🔒 ========== DISABLING BIOMETRIC ==========');

      const enableStatusPayload = {
        EmployeeId: employeeDetails.id,
        IsFaceAuthunticateEnable: 'false',
        IsFingerAuthenticateEnable: 'false',
        CreatedDate: new Date().toISOString(),
        CreatedBy: employeeDetails.id,
        ModifiedDate: new Date().toISOString(),
        ModifiedBy: employeeDetails.id,
      };

      const response = await ApiService.updateBiometricEnableStatus(enableStatusPayload);

      if (!response?.isSuccess) {
        throw new Error(response?.message || 'Failed to disable biometric');
      }

      // Clear local storage
      await AsyncStorage.setItem('biometric_type', 'none');
      await AsyncStorage.setItem('biometric_face_enabled', 'false');
      await AsyncStorage.setItem('biometric_fingerprint_enabled', 'false');

      console.log('✅ Biometric disabled successfully');
      console.log('🔒 ==========================================');

      return {
        success: true,
        message: 'Biometric authentication disabled successfully',
      };
    } catch (error) {
      console.error('❌ Error disabling biometric:', error);
      return {
        success: false,
        message: error.message || 'Failed to disable biometric',
      };
    }
  }

  /**
   * Check if specific biometric type is registered
   * @param {string} type - 'face' or 'fingerprint'
   * @param {object} employeeDetails - Employee information
   * @returns {Promise<boolean>}
   */
  static async isBiometricRegistered(type, employeeDetails) {
    try {
      const biometricData = await ApiService.fetchBiometricDetails(
        employeeDetails.id,
        employeeDetails.childCompanyId,
      );

      if (type === 'face') {
        const faceImage = biometricData?.faceImage;
        return (
          !!faceImage &&
          faceImage !== 'null' &&
          faceImage.trim() !== '' &&
          faceImage.length > 100
        );
      } else if (type === 'fingerprint') {
        const fingerEmbeding = biometricData?.fingerEmbeding;
        return (
          !!fingerEmbeding &&
          fingerEmbeding !== 'null' &&
          fingerEmbeding.trim() !== '' &&
          fingerEmbeding.length > 50
        );
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking biometric registration:', error);
      return false;
    }
  }
}

export default BiometricManager;

/**
 * Centralised constants for the attendance module.
 *
 * Every magic number, storage key, and option array that was previously
 * scattered across HomeScreen.js lives here.  Changing a timing or adding
 * a storage key now requires editing exactly one file.
 *
 * APP_CONFIG is imported lazily to avoid module-load-order issues
 * (constants are read at module-init time, but APP_CONFIG is consumed
 * only inside the getter below).
 */

import {APP_CONFIG} from '../constants/APP_CONFIG';

// ======================== TIMING (ms) ========================

export const INITIAL_LOAD_MAX_WAIT_MS = 5000;
export const BIOMETRIC_API_TIMEOUT_MS = 6000;
export const POLL_INTERVAL_MS = 12_000; // approval polling
export const APPROVAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
export const OT_CONTINUATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
export const IOS_ALERT_DELAY_MS = 1000;
export const SHIFT_PROGRESS_TICK_MS = 1000;
export const AUTO_CHECKOUT_WATCHER_MS = 30_000; // foreground watcher
export const BG_TASK_DELAY_MS = 5000;
export const BG_ERROR_BACKOFF_MAX_MS = 10_000;

// ======================== SHIFT & OT ========================

export const OT_DURATION_OPTIONS = [30, 60, 90];
export const DEFAULT_OT_POLICY = {minOverTime: 30, minEarlyGoing: 20};
export const DEFAULT_SHIFT_SECONDS = APP_CONFIG.SHIFT.DEFAULT_SECONDS;
export const BUFFER_TIME_MINUTES = 10;
export const MAX_CONSECUTIVE_BG_ERRORS = 5;

// ======================== ASYNC-STORAGE KEYS ========================

/**
 * Stable, central mapping for every AsyncStorage key the attendance flow
 * uses.  Keys that were inline strings now resolve through APP_CONFIG
 * so the same key is referenced everywhere.
 */
export const AS_KEY = {
  BIOMETRIC_TYPE: 'biometric_type',
  FACE_ENABLED: 'biometric_face_enabled',
  FINGERPRINT_ENABLED: 'biometric_fingerprint_enabled',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_USER_ID: 'biometric_user_id',
  IS_IN_OT: 'is_in_ot',
  OT_REMARK: 'ot_remark',
  OT_DURATION: 'ot_duration_minutes',
  OT_START: 'ot_start_time',
  BG_ELAPSED: APP_CONFIG.STORAGE.BG_ELAPSED,
  CAPTURED_FACE: APP_CONFIG.STORAGE.CAPTURED_FACE,
  AUTO_CHECKOUT_TIME: APP_CONFIG.STORAGE.AUTO_CHECKOUT_TIME,
  EMPLOYEE_DETAILS: APP_CONFIG.STORAGE.EMPLOYEE_DETAILS,
  SHIFT_END_TIME: APP_CONFIG.STORAGE.SHIFT_END_TIME,
  BUFFERING_START_TIME: APP_CONFIG.STORAGE.BUFFERING_START_TIME,
  CHECK_IN_DATE: APP_CONFIG.STORAGE.CHECK_IN_DATE,
  REGISTERED_FACE: APP_CONFIG.STORAGE.REGISTERED_FACE,
};

// ======================== BACKGROUND SERVICE OPTIONS ========================

export const BACKGROUND_SERVICE_OPTIONS = {
  taskName: APP_CONFIG.BACKGROUND_SERVICE.TASK_NAME,
  taskTitle: APP_CONFIG.BACKGROUND_SERVICE.TASK_TITLE,
  taskDesc: APP_CONFIG.BACKGROUND_SERVICE.TASK_DESC,
  taskIcon: {name: 'ic_launcher', type: 'mipmap'},
  color: APP_CONFIG.BACKGROUND_SERVICE.COLOR,
  parameters: {delay: APP_CONFIG.BACKGROUND_SERVICE.UPDATE_INTERVAL},
};

// ======================== OT DURATION LIST (for FlatList) ========================

export const OT_DURATION_LIST = OT_DURATION_OPTIONS.map(m => ({
  value: m,
  label: m >= 60 ? `${m / 60}h` : `${m}m`,
}));

// ======================== FACE / FINGERPRINT VALIDATION ========================

export const MIN_FACE_IMAGE_LENGTH = 100;
export const MIN_FINGERPRINT_LENGTH = 50;

