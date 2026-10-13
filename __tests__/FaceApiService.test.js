jest.mock('react-native-config', () => ({__esModule: true, default: {}}));
jest.mock('../src/services/apiClient', () => ({__esModule: true, default: {get: jest.fn(), post: jest.fn()}}));
import apiClient from '../src/services/apiClient';
import {getCompanyFaces, invalidateFaceCache, saveEmployeeFaces} from '../src/services/FaceApiService';
import {float32ToBase64} from '../src/utils/base64';

beforeEach(() => { jest.clearAllMocks(); invalidateFaceCache(9); });

test('fetches once, caches decoded embeddings, and scopes records to the company', async () => {
  apiClient.get.mockResolvedValue({data: [
    {employeeId: 44, companyId: 9, faces: [{faceEmbedding: float32ToBase64([1, 0])}]},
    {employeeId: 45, companyId: 10, faces: []},
  ]});
  const [first, second] = await Promise.all([getCompanyFaces(9), getCompanyFaces(9)]);
  expect(apiClient.get).toHaveBeenCalledTimes(1);
  expect(apiClient.get).toHaveBeenCalledWith('/api/EmployeeFace/GetByCompany/9');
  expect(first).toBe(second);
  expect(first).toHaveLength(1);
  expect(first[0].faces[0].embedding).toEqual(new Float32Array([1, 0]));
});

test('sends three samples in one call and invalidates the company cache', async () => {
  apiClient.get.mockResolvedValue({data: []});
  await getCompanyFaces(9);
  apiClient.post.mockResolvedValue({data: {isSuccess: true}});
  const payload = {employeeId: 44, companyId: 9, faces: Array.from({length: 3}, () => ({faceImage: 'image', faceEmbedding: float32ToBase64([1, 0])}))};
  await saveEmployeeFaces(payload);
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  expect(apiClient.post).toHaveBeenCalledWith('/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat', payload);
  await getCompanyFaces(9);
  expect(apiClient.get).toHaveBeenCalledTimes(2);
  await expect(saveEmployeeFaces({...payload, faces: []})).rejects.toThrow('Exactly 3');
});

test('retries a failed fetch instead of caching the failure', async () => {
  apiClient.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({data: []});
  await expect(getCompanyFaces(9)).rejects.toThrow('offline');
  await expect(getCompanyFaces(9)).resolves.toEqual([]);
});
