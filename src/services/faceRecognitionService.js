import * as ort from 'onnxruntime-react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import jpeg from 'jpeg-js';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';

import {FACE_CONFIG} from '../config/faceConfig';
import {stripDataUriPrefix} from '../utils/base64';

const debugLog = (stage, details = {}) => {
  if (__DEV__) console.info(`[face-recognition] ${stage}`, details);
};

class FaceRecognitionService {
  session = null;
  loadingPromise = null;

  async loadModel() {
    if (this.session) return this.session;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.createSession();
    try {
      this.session = await this.loadingPromise;
      debugLog('model ready', {inputSize: FACE_CONFIG.inputSize});
      return this.session;
    } finally {
      this.loadingPromise = null;
    }
  }

  async createSession() {
    let modelPath;
    if (Platform.OS === 'android') {
      modelPath = `${RNFS.DocumentDirectoryPath}/${FACE_CONFIG.modelFileName}`;
      if (!(await RNFS.exists(modelPath))) {
        await RNFS.copyFileAssets(FACE_CONFIG.modelFileName, modelPath);
      }
    } else {
      const bundledPath = `${RNFS.MainBundlePath}/${FACE_CONFIG.modelFileName}`;
      if (!(await RNFS.exists(bundledPath))) {
        throw new Error('Face-recognition model is missing from the iOS app bundle.');
      }
      modelPath = bundledPath;
    }

    return ort.InferenceSession.create(modelPath, {executionProviders: ['cpu']});
  }

  async preprocessImage(imageBase64) {
    const sourceBase64 = stripDataUriPrefix(imageBase64);
    if (!sourceBase64) throw new Error('The captured face image is invalid.');

    const sourcePath = `${RNFS.CachesDirectoryPath}/face-source-${Date.now()}.jpg`;
    let resizedPath;
    try {
      await RNFS.writeFile(sourcePath, sourceBase64, 'base64');
      const resized = await ImageResizer.createResizedImage(
        sourcePath,
        FACE_CONFIG.inputSize,
        FACE_CONFIG.inputSize,
        'JPEG',
        100,
        0,
        undefined,
        false,
        // Face crops are rectangular; the model requires exactly 112 x 112.
        {mode: 'stretch', onlyScaleDown: false},
      );
      resizedPath = (resized.path || resized.uri).replace('file://', '');
      const processedImage = await RNFS.readFile(resizedPath, 'base64');
      debugLog('image preprocessed', {
        processedBytes: processedImage.length,
        sourceBytes: sourceBase64.length,
      });
      return processedImage;
    } finally {
      await Promise.all([RNFS.unlink(sourcePath).catch(() => {}), resizedPath ? RNFS.unlink(resizedPath).catch(() => {}) : Promise.resolve()]);
    }
  }

  normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (!norm) throw new Error('Face embedding could not be normalized.');
    return Float32Array.from(vector, value => value / norm);
  }

  async getEmbedding(imageBase64) {
    const session = await this.loadModel();
    const processedImage = await this.preprocessImage(imageBase64);
    const decoded = jpeg.decode(Buffer.from(processedImage, 'base64'), {useTArray: true, formatAsRGBA: false});
    if (!decoded?.data || decoded.width !== FACE_CONFIG.inputSize || decoded.height !== FACE_CONFIG.inputSize) {
      throw new Error('Face image preprocessing failed.');
    }

    const pixelCount = FACE_CONFIG.inputSize * FACE_CONFIG.inputSize;
    const input = new Float32Array(3 * pixelCount);
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 3;
      input[index] = decoded.data[offset] / 127.5 - 1;
      input[pixelCount + index] = decoded.data[offset + 1] / 127.5 - 1;
      input[2 * pixelCount + index] = decoded.data[offset + 2] / 127.5 - 1;
    }

    const tensor = new ort.Tensor('float32', input, [1, 3, FACE_CONFIG.inputSize, FACE_CONFIG.inputSize]);
    const output = await session.run({[session.inputNames[0]]: tensor});
    const embedding = this.normalize(output[session.outputNames[0]].data);
    debugLog('embedding created', {embeddingLength: embedding.length});
    return embedding;
  }

  cosineSimilarity(left, right) {
    if (left.length !== right.length) throw new Error('Face embeddings are incompatible.');
    let dot = 0;
    for (let index = 0; index < left.length; index += 1) dot += left[index] * right[index];
    return Math.max(-1, Math.min(1, dot));
  }

  euclideanDistance(left, right) {
    if (left.length !== right.length) throw new Error('Face embeddings are incompatible.');
    let total = 0;
    for (let index = 0; index < left.length; index += 1) total += (left[index] - right[index]) ** 2;
    return Math.sqrt(total);
  }

  matchEmbeddings(registeredEmbedding, capturedEmbedding) {
    const similarity = this.cosineSimilarity(registeredEmbedding, capturedEmbedding);
    const distance = this.euclideanDistance(registeredEmbedding, capturedEmbedding);
    const isMatch = similarity >= FACE_CONFIG.cosineThreshold && distance <= FACE_CONFIG.euclideanThreshold;
    debugLog('face match completed', {
      cosineThreshold: FACE_CONFIG.cosineThreshold,
      distance,
      euclideanThreshold: FACE_CONFIG.euclideanThreshold,
      isMatch,
      similarity,
    });
    return {distance, isMatch, similarity};
  }

  async matchFaces(registeredImage, capturedImage) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Face processing timed out.')), FACE_CONFIG.processingTimeoutMs);
    });
    let registeredEmbedding;
    let capturedEmbedding;
    try {
      [registeredEmbedding, capturedEmbedding] = await Promise.race([
        Promise.all([this.getEmbedding(registeredImage), this.getEmbedding(capturedImage)]),
        timeout,
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
    return this.matchEmbeddings(registeredEmbedding, capturedEmbedding);
  }
}

export default new FaceRecognitionService();
