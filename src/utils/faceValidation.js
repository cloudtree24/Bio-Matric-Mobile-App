import {FACE_CONFIG} from '../config/faceConfig';

export const validateBase64Image = image => {
  const value = typeof image === 'string' ? image.trim() : '';
  const normalized = value.toLowerCase();

  if (!value || ['null', 'undefined', 'none', 'n/a', 'na'].includes(normalized)) {
    return {isValid: false, reason: 'No registered face image is available.'};
  }

  if (value.length < FACE_CONFIG.minimumImageBase64Length) {
    return {isValid: false, reason: 'The registered face image is invalid.'};
  }

  return {isValid: true, value};
};

export const validateSingleFace = faces => {
  if (!Array.isArray(faces) || faces.length === 0) {
    return {isValid: false, reason: 'No face detected'};
  }

  if (faces.length > 1) {
    return {isValid: false, reason: 'Multiple faces detected'};
  }

  return {isValid: true, face: faces[0]};
};

export const validateCaptureFace = faces => {
  const validation = validateSingleFace(faces);
  if (!validation.isValid) return validation;
  const {face} = validation;
  if (['yawAngle', 'pitchAngle', 'rollAngle'].some(key =>
    face[key] != null && (!Number.isFinite(face[key]) || Math.abs(face[key]) > FACE_CONFIG.captureMaxAngle))) {
    return {isValid: false, reason: 'Look straight at the camera and hold your head upright.'};
  }
  if (['leftEyeOpenProbability', 'rightEyeOpenProbability'].some(key =>
    face[key] != null && face[key] < FACE_CONFIG.eyeClosedThreshold)) {
    return {isValid: false, reason: 'Open your eyes and look at the camera.'};
  }
  return validation;
};
