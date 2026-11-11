import {FACE_CONFIG} from '../config/faceConfig';

// Heuristics for the cropped still image; device validation is required when
// tuning these values. Face detection alone cannot establish image quality.
export const validateFaceImageQuality = ({data, width, height}) => {
  if (width < FACE_CONFIG.minimumFacePixels || height < FACE_CONFIG.minimumFacePixels) {
    throw new Error('Move closer so your face is clear in the camera frame.');
  }
  const gray = new Float32Array(width * height);
  let brightness = 0;
  for (let index = 0; index < gray.length; index += 1) {
    gray[index] = 0.299 * data[index * 4] + 0.587 * data[index * 4 + 1] + 0.114 * data[index * 4 + 2];
    brightness += gray[index];
  }
  brightness /= gray.length;
  if (brightness < FACE_CONFIG.minimumBrightness || brightness > FACE_CONFIG.maximumBrightness) {
    throw new Error('Poor lighting. Move to even lighting and capture again.');
  }
  let sum = 0;
  let squareSum = 0;
  const count = (width - 2) * (height - 2);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const laplacian = gray[index - width] + gray[index + width] + gray[index - 1] + gray[index + 1] - 4 * gray[index];
      sum += laplacian;
      squareSum += laplacian * laplacian;
    }
  }
  if (squareSum / count - (sum / count) ** 2 < FACE_CONFIG.minimumSharpness) {
    throw new Error('Face image is blurry. Hold still and capture again.');
  }
};
