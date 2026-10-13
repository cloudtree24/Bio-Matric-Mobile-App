import {useCallback, useRef, useState} from 'react';
import faceRecognitionService from '../services/faceRecognitionService';
import {saveLocalEmployeeFaces} from '../services/localFaceStorage';

export const useFaceRegistration = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [activationPending, setActivationPending] = useState(null);
  const processing = useRef(false);
  const checkFaceAccess = useCallback(async ({employeeId, companyId}) => {
    if (!employeeId || !companyId) throw new Error('Enter both Employee ID and Company ID.');
    return {isFaceEnable: true};
  }, []);
  const activateFaceAttendance = useCallback(async () => {
    setActivationPending(null);
  }, []);
  const registerFace = useCallback(async ({employeeId, employeeName, companyId, faces}) => {
    if (processing.current) throw new Error('Registration is already processing.');
    processing.current = true;
    setIsRegistering(true);
    try {
      await checkFaceAccess({employeeId, companyId});
      await faceRecognitionService.loadModel();
      await saveLocalEmployeeFaces({employeeId, companyId, employeeName, faces});
      return {isSuccess: true};
    } finally {
      processing.current = false;
      setIsRegistering(false);
    }
  }, [checkFaceAccess]);
  return {isRegistering, activationPending, checkFaceAccess, registerFace, activateFaceAttendance};
};
