import {FACE_CONFIG} from '../config/faceConfig';
import {decodeFaceEmbedding, stripDataUriPrefix} from '../utils/base64';
import {cosineSimilarity} from './faceMatchingService';
import faceRecognitionService from './faceRecognitionService';

export const decodeBackendEmbedding = decodeFaceEmbedding;

// The API stores one sample. Choose the captured sample most consistent with
// the other samples, keeping its image and embedding paired.
export const selectRegistrationSample = faces => {
  if (!Array.isArray(faces) || faces.length !== FACE_CONFIG.registrationSampleCount) {
    throw new Error(`Capture ${FACE_CONFIG.registrationSampleCount} face samples before saving.`);
  }
  const vectors = faces.map(face => {
    if (!stripDataUriPrefix(face.faceImage)) throw new Error('Captured face image is missing.');
    return decodeBackendEmbedding(face.faceEmbedding);
  });
  let best = 0;
  let bestScore = -Infinity;
  vectors.forEach((vector, index) => {
    const scores = vectors.map(other => cosineSimilarity(vector, other));
    if (scores.some(score => score < FACE_CONFIG.registrationConsistencyThreshold)) {
      throw new Error('Face samples must belong to the same person. Try again.');
    }
    const score = scores.reduce((sum, value) => sum + value, 0);
    if (score > bestScore) { best = index; bestScore = score; }
  });
  return {faceImage: stripDataUriPrefix(faces[best].faceImage), faceEmbedding: faces[best].faceEmbedding};
};

export const verifyBackendFace = (registered, live, {employeeId, companyId}) => {
  if (live?.length !== FACE_CONFIG.embeddingSize || !live.every(Number.isFinite) || !live.some(value => value !== 0)) {
    throw new Error('The live face embedding is invalid. Try capturing again.');
  }
  const result = faceRecognitionService.matchEmbeddings(registered, faceRecognitionService.normalize(live));
  return {
    matched: result.isMatch, employeeId, companyId,
    score: result.similarity, distance: result.distance,
    reason: result.isMatch ? 'matched' : 'below_threshold',
  };
};
