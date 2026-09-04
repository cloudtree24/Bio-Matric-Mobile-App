import {useCallback, useState} from 'react';

import faceRecognitionService from '../services/faceRecognitionService';
import {saveFaceRegistrationFlags, saveLocalFaceRegistration} from '../services/secureStorage';
import {float32ToBase64, stripDataUriPrefix} from '../utils/base64';

export const useFaceRegistration = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activationPending, setActivationPending] = useState(null);

  const checkFaceAccess = useCallback(async ({employeeId, companyId}) => {
    if (!employeeId || !companyId) throw new Error('Enter both Employee ID and Company ID.');
    if (__DEV__) console.info('[face-registration] local mode ready', {companyId, employeeId});
    return {isFaceEnable: true, record: null};
  }, []);

  const activateFaceAttendance = useCallback(async (employeeId, companyId) => {
    if (companyId) await saveFaceRegistrationFlags({employeeId, companyId});
    setActivationPending(null);
  }, []);

  const registerFace = useCallback(async ({employeeId, companyId, capturedImage}) => {
    setIsRegistering(true);
    try {
      await checkFaceAccess({employeeId, companyId});
      const embedding = await faceRecognitionService.getEmbedding(capturedImage);
      const faceEmbedding = float32ToBase64(embedding);
      if (__DEV__) {
        console.info('[face-registration] embedding ready', {
          embeddingBytes: faceEmbedding.length,
          faceBytes: stripDataUriPrefix(capturedImage).length,
        });
      }
      await saveLocalFaceRegistration({
        companyId,
        embeddingBase64: faceEmbedding,
        employeeId,
      });
      await activateFaceAttendance(employeeId, companyId);
      if (__DEV__) console.info('[face-registration] local registration saved', {companyId, employeeId});
      return {isSuccess: true};
    } finally {
      setIsRegistering(false);
    }
  }, [activateFaceAttendance, checkFaceAccess]);

  return {isRegistering, activationPending, checkFaceAccess, registerFace, activateFaceAttendance};
};
