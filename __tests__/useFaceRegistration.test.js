import React from 'react';
import {act, create} from 'react-test-renderer';
import {useFaceRegistration} from '../src/hooks/useFaceRegistration';
import {saveFaceRegistration} from '../src/services/biometricApi';
jest.mock('../src/services/biometricApi', () => ({saveFaceRegistration: jest.fn()}));
jest.mock('../src/services/backendFaceService', () => ({selectRegistrationSample: jest.fn(() => ({faceImage: 'image', faceEmbedding: 'embedding'}))}));
let registration;
const Harness = () => { registration = useFaceRegistration(); return null; };
test('posts the exact backend payload once and rejects duplicate registration', async () => {
  let resolve;
  saveFaceRegistration.mockReturnValue(new Promise(done => { resolve = done; }));
  let screen;
  await act(async () => { screen = create(<Harness />); });
  let first;
  await act(async () => {
    first = registration.registerFace({employeeId: 10, companyId: 1, modifiedBy: 123, faces: []});
    await expect(registration.registerFace({employeeId: 10, companyId: 1, modifiedBy: 123, faces: []})).rejects.toThrow('already processing');
  });
  expect(saveFaceRegistration).toHaveBeenCalledTimes(1);
  expect(saveFaceRegistration).toHaveBeenCalledWith({EmployeeId: 10, CompanyId: 1, ModifiedBy: 123, FaceImage: 'image', FaceEmbeding: 'embedding', FingerImage: null, FingerEmbeding: null, RetinaImage: null, RetinaEmbeding: null, VoiceRecord: null, VoiceRecordEmbeding: null, CreatedDate: expect.any(String), IsDelete: 0});
  await act(async () => { resolve({isSuccess: true}); await first; });
  await act(async () => { await expect(registration.registerFace({employeeId: 10, companyId: 1, modifiedBy: 'invalid', faces: []})).rejects.toThrow('Admin ID'); });
  await act(async () => { await registration.registerFace({employeeId: 10, companyId: 1, faces: []}); });
  expect(saveFaceRegistration).toHaveBeenLastCalledWith(expect.objectContaining({ModifiedBy: null}));
  await act(async () => screen.unmount());
});
