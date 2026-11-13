import {Buffer} from 'buffer';
import {FACE_CONFIG} from '../config/faceConfig';

export const stripDataUriPrefix = value =>
  typeof value === 'string' ? value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '') : '';

export const toJpegDataUri = value => {
  const base64 = stripDataUriPrefix(value);
  return base64 ? `data:image/jpeg;base64,${base64}` : '';
};

export const float32ToBase64 = vector =>
  Buffer.from(new Float32Array(vector).buffer).toString('base64');

export const base64ToFloat32 = value => {
  const bytes = Buffer.from(value || '', 'base64');
  if (!bytes.length || bytes.length % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error('The saved face embedding is invalid. Register the face again.');
  }

  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
};

export const decodeFaceEmbedding = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error('The registered face embedding is invalid. Register the face again.');
  const embedding = base64ToFloat32(value);
  if (embedding.length !== FACE_CONFIG.embeddingSize || !embedding.every(Number.isFinite) || !embedding.some(v => v !== 0)) throw new Error('The registered face is incompatible with this model. Register the face again.');
  const norm = Math.sqrt(embedding.reduce((sum, entry) => sum + entry * entry, 0));
  if (!norm) throw new Error('The registered face is incompatible with this model. Register the face again.');
  return Float32Array.from(embedding, entry => entry / norm);
};
