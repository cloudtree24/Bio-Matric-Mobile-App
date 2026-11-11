jest.mock('onnxruntime-react-native', () => ({}));
jest.mock('react-native-fs', () => ({}));
jest.mock('@bam.tech/react-native-image-resizer', () => ({}));
import {float32ToBase64} from '../src/utils/base64';
import {decodeBackendEmbedding, selectRegistrationSample, verifyBackendFace} from '../src/services/backendFaceService';
import {getBiometricEmployeeId} from '../src/utils/backendIdentity';
const vector = index => Float32Array.from({length: 128}, (_, i) => i === index ? 1 : 0);
const sample = index => ({faceImage: `data:image/jpeg;base64,${'a'.repeat(32)}`, faceEmbedding: float32ToBase64(vector(index))});
test('maps employee code to the nested numeric biometric identity', () => {
  expect(getBiometricEmployeeId({id: 99, employeeId: 'AA_11', employeeBiomatricDetail: {employeeId: 10}})).toBe(10);
  expect(() => getBiometricEmployeeId({employeeId: 'AA_11'})).toThrow();
});
test('normalizes backend Float32 embedding and rejects invalid/model-incompatible data', () => {
  expect(decodeBackendEmbedding(sample(0).faceEmbedding)).toEqual(vector(0));
  for (const value of ['garbage', float32ToBase64([1, 0]), float32ToBase64(new Float32Array(128)), float32ToBase64(Float32Array.from({length: 128}, () => NaN))]) {
    expect(() => decodeBackendEmbedding(value)).toThrow();
  }
});
test('selects one paired sample and rejects inconsistent three-sample registration', () => {
  expect(selectRegistrationSample([sample(0), sample(0), sample(0)])).toEqual({faceImage: 'a'.repeat(32), faceEmbedding: sample(0).faceEmbedding});
  expect(() => selectRegistrationSample([sample(0), sample(1), sample(0)])).toThrow('same person');
});
test('matches only compatible normalized embeddings using cosine AND distance', () => {
  expect(verifyBackendFace(vector(0), vector(0), {employeeId: 10, companyId: 1})).toMatchObject({matched: true, employeeId: 10, companyId: 1});
  expect(verifyBackendFace(vector(0), vector(1), {employeeId: 10, companyId: 1})).toMatchObject({matched: false});
});
