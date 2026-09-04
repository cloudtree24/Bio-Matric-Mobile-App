import {buildBiometricRegistrationPayload, buildFaceEnablePayload} from '../src/utils/biometricPayload';

describe('biometric payloads', () => {
  test('preserves identity values and sends only the supported face fields', () => {
    const payload = buildBiometricRegistrationPayload({
      companyId: 'company-a',
      employeeId: 'employee-7',
      faceEmbedding: 'embedding-base64',
      faceImage: 'image-base64',
    });

    expect(payload).toMatchObject({
      CompanyId: 'company-a',
      EmployeeId: 'employee-7',
      FaceEmbeding: 'embedding-base64',
      FaceImage: 'image-base64',
      FingerEmbeding: null,
      FingerImage: null,
      RetinaEmbeding: null,
      RetinaImage: null,
      VoiceRecord: null,
      VoiceRecordEmbeding: null,
    });
    expect(payload.CreatedDate).toEqual(expect.any(String));
  });

  test('uses the backend-compatible enable-status spelling', () => {
    expect(buildFaceEnablePayload('employee-7')).toMatchObject({
      EmployeeId: 'employee-7',
      IsFaceAuthunticateEnable: 'true',
      IsFingerAuthenticateEnable: 'false',
    });
  });
});
