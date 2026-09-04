jest.mock('react-native', () => ({Platform: {OS: 'android'}}));
jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {DocumentDirectoryPath: '/documents'},
}));
jest.mock('@bam.tech/react-native-image-resizer', () => ({__esModule: true, default: {}}));
jest.mock('onnxruntime-react-native', () => ({InferenceSession: {}, Tensor: jest.fn()}));

import faceRecognitionService from '../src/services/faceRecognitionService';

describe('face matching thresholds', () => {
  afterEach(() => jest.restoreAllMocks());

  test('calculates cosine similarity and Euclidean distance for normalized embeddings', () => {
    expect(faceRecognitionService.cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(faceRecognitionService.euclideanDistance([1, 0], [0, 1])).toBeCloseTo(Math.sqrt(2));
  });

  test('requires both configured matching thresholds', async () => {
    jest.spyOn(faceRecognitionService, 'getEmbedding')
      .mockResolvedValueOnce(new Float32Array([1, 0]))
      .mockResolvedValueOnce(new Float32Array([0.9, Math.sqrt(0.19)]));

    await expect(faceRecognitionService.matchFaces('registered', 'captured')).resolves.toMatchObject({isMatch: true});
  });
});
