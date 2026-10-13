jest.mock('react-native', () => ({Platform: {OS: 'android'}}));
jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    DocumentDirectoryPath: '/documents',
    CachesDirectoryPath: '/cache',
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {createResizedImage: jest.fn()},
}));
jest.mock('onnxruntime-react-native', () => ({InferenceSession: {}, Tensor: jest.fn()}));

import faceRecognitionService from '../src/services/faceRecognitionService';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';
import * as ort from 'onnxruntime-react-native';
import jpeg from 'jpeg-js';
import {Buffer} from 'buffer';
import {FACE_CONFIG} from '../src/config/faceConfig';

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

  test('preprocesses a rectangular face crop into the exact model dimensions', async () => {
    const width = 80;
    const height = 120;
    const source = jpeg.encode({data: new Uint8Array(width * height * 4).fill(255), width, height}, 100);
    ImageResizer.createResizedImage.mockImplementation(async (path, targetWidth, targetHeight, format, quality, rotation, outputPath, keepMeta, options) => {
      // Model the native resizer: cover preserves the rectangular aspect ratio.
      const resizedHeight = options.mode === 'stretch' ? targetHeight : targetHeight * height / width;
      const resized = jpeg.encode({
        data: new Uint8Array(targetWidth * resizedHeight * 4).fill(255),
        width: targetWidth,
        height: resizedHeight,
      }, 100);
      RNFS.readFile.mockResolvedValue(Buffer.from(resized.data).toString('base64'));
      return {uri: 'file:///cache/resized.jpg'};
    });
    const session = {inputNames: ['input'], outputNames: ['output'], run: jest.fn().mockResolvedValue({output: {data: new Float32Array([3, 4])}})};
    jest.spyOn(faceRecognitionService, 'loadModel').mockResolvedValue(session);
    ort.Tensor.mockClear();

    const embedding = await faceRecognitionService.getEmbedding(Buffer.from(source.data).toString('base64'));

    const [type, pixels, shape] = ort.Tensor.mock.calls[0];
    expect(type).toBe('float32');
    expect(shape).toEqual([1, 3, FACE_CONFIG.inputSize, FACE_CONFIG.inputSize]);
    expect(pixels).toHaveLength(3 * FACE_CONFIG.inputSize ** 2);
    expect(pixels.every(value => Number.isFinite(value) && value >= -1 && value <= 1)).toBe(true);
    expect(session.run).toHaveBeenCalledTimes(1);
    expect(Array.from(embedding)).toEqual([expect.closeTo(0.6), expect.closeTo(0.8)]);
    expect(RNFS.unlink).toHaveBeenCalledWith('/cache/resized.jpg');
  });
});
