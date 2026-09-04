export const FACE_CONFIG = {
  modelFileName: 'mobilefacenet.onnx',
  inputSize: 112,
  resizeWidth: 500,
  resizeHeight: 500,
  imageQuality: 70,
  // Medium-strict local face-match policy. Both limits must pass.
  cosineThreshold: 0.83,
  euclideanThreshold: 0.57,
  processingTimeoutMs: 30000,
  livenessTimeoutMs: 45000,
  eyeClosedThreshold: 0.35,
  headTurnAngle: 18,
  minimumImageBase64Length: 20,
  requiredLivenessSteps: ['blink', 'turnLeft', 'turnRight'],
};
