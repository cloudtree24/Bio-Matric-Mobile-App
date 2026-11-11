import {validateFaceImageQuality} from '../src/utils/faceImageQuality';
const image = brightness => ({width: 64, height: 64, data: Uint8Array.from({length: 64 * 64 * 4}, (_, i) => i % 4 === 3 ? 255 : brightness(Math.floor(i / 4)))});
test('blocks dark, overexposed, blurred, and tiny captures', () => {
  expect(() => validateFaceImageQuality(image(() => 10))).toThrow('lighting');
  expect(() => validateFaceImageQuality(image(() => 250))).toThrow('lighting');
  expect(() => validateFaceImageQuality(image(() => 125))).toThrow('blurry');
  expect(() => validateFaceImageQuality({...image(() => 125), width: 10})).toThrow('closer');
});
test('accepts an evenly exposed image with sharp detail', () => {
  expect(() => validateFaceImageQuality(image(index => (index + Math.floor(index / 64)) % 2 ? 100 : 150))).not.toThrow();
});
