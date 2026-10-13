import {validateCaptureFace} from '../src/utils/faceValidation';

test.each(['yawAngle', 'pitchAngle', 'rollAngle'])('blocks a turned face on %s', angle => {
  expect(validateCaptureFace([{[angle]: 19}]).isValid).toBe(false);
  expect(validateCaptureFace([{[angle]: -19}]).isValid).toBe(false);
});

test('requires a single face with open eyes', () => {
  expect(validateCaptureFace([]).isValid).toBe(false);
  expect(validateCaptureFace([{}, {}]).isValid).toBe(false);
  expect(validateCaptureFace([{leftEyeOpenProbability: 0.1}]).isValid).toBe(false);
  expect(validateCaptureFace([{yawAngle: 0, pitchAngle: 0, rollAngle: 0, leftEyeOpenProbability: 1, rightEyeOpenProbability: 1}]).isValid).toBe(true);
});
