export const buildBiometricRegistrationPayload = ({employeeId, companyId, faceImage, faceEmbedding}) => {
  const now = new Date().toISOString();

  return {
    EmployeeId: employeeId,
    FaceImage: faceImage,
    FaceEmbeding: faceEmbedding,
    FingerImage: null,
    FingerEmbeding: null,
    RetinaImage: null,
    RetinaEmbeding: null,
    VoiceRecord: null,
    VoiceRecordEmbeding: null,
    CreatedDate: now,
    ModifiedBy: employeeId,
    IsDelete: 0,
    CompanyId: companyId,
  };
};

export const buildFaceEnablePayload = employeeId => {
  const now = new Date().toISOString();

  return {
    EmployeeId: employeeId,
    IsFaceAuthunticateEnable: 'true',
    IsFingerAuthenticateEnable: 'false',
    CreatedDate: now,
    CreatedBy: employeeId,
    ModifiedDate: now,
    ModifiedBy: employeeId,
  };
};
