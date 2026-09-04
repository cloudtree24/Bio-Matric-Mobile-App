import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.hrms.face-registration';
const getLocalFaceService = ({employeeId, companyId}) =>
  `${SERVICE}.local.${String(companyId)}.${String(employeeId)}`;

export const saveFaceRegistrationFlags = async ({employeeId, companyId}) => {
  const flags = JSON.stringify({employeeId, companyId, faceEnabled: true});
  await Keychain.setGenericPassword('face-registration', flags, {service: SERVICE});
};

export const getFaceRegistrationFlags = async () => {
  const stored = await Keychain.getGenericPassword({service: SERVICE});
  return stored ? JSON.parse(stored.password) : null;
};

export const clearFaceRegistrationFlags = () => Keychain.resetGenericPassword({service: SERVICE});

export const saveLocalFaceRegistration = async ({employeeId, companyId, embeddingBase64}) => {
  const registration = JSON.stringify({
    companyId: String(companyId),
    createdAt: new Date().toISOString(),
    embeddingBase64,
    employeeId: String(employeeId),
  });
  await Keychain.setGenericPassword('local-face-registration', registration, {
    service: getLocalFaceService({employeeId, companyId}),
  });
};

export const getLocalFaceRegistration = async ({employeeId, companyId}) => {
  const stored = await Keychain.getGenericPassword({
    service: getLocalFaceService({employeeId, companyId}),
  });
  return stored ? JSON.parse(stored.password) : null;
};
