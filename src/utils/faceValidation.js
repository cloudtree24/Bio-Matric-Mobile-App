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
    return {isValid: false, reason: 'No face detected. Center your face in the guide.'};
  }

  if (faces.length > 1) {
    return {isValid: false, reason: 'More than one face detected. Only one person can continue.'};
  }

  return {isValid: true, face: faces[0]};
};
