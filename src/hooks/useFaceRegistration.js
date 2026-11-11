import {useCallback, useRef, useState} from 'react';
import {saveFaceRegistration} from '../services/biometricApi';
import {selectRegistrationSample} from '../services/backendFaceService';
import {requireBackendId} from '../utils/backendIdentity';
import {buildBiometricRegistrationPayload} from '../utils/biometricPayload';

export const useFaceRegistration = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const processing = useRef(false);
  const checkFaceAccess = useCallback(async ({employeeId, companyId, modifiedBy}) => {
    requireBackendId(employeeId, 'Employee ID');
    requireBackendId(companyId, 'Company ID');
    if (modifiedBy != null) requireBackendId(modifiedBy, 'Admin ID');
  }, []);
  const registerFace = useCallback(async ({employeeId, companyId, modifiedBy, faces}) => {
    if (processing.current) throw new Error('Registration is already processing.');
    processing.current = true;
    setIsRegistering(true);
    try {
      await checkFaceAccess({employeeId, companyId, modifiedBy});
      const sample = selectRegistrationSample(faces);
      return await saveFaceRegistration(buildBiometricRegistrationPayload({
        employeeId: requireBackendId(employeeId, 'Employee ID'),
        companyId: requireBackendId(companyId, 'Company ID'),
        modifiedBy: modifiedBy == null ? null : requireBackendId(modifiedBy, 'Admin ID'),
        ...sample,
      }));
    } finally {
      processing.current = false;
      setIsRegistering(false);
    }
  }, [checkFaceAccess]);
  return {isRegistering, checkFaceAccess, registerFace};
};
