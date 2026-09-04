import {FACE_CONFIG} from '../config/faceConfig';

export const createLivenessChallenge = () =>
  [...FACE_CONFIG.requiredLivenessSteps].sort(() => Math.random() - 0.5);

export const LIVENESS_INSTRUCTIONS = {
  blink: 'Blink once',
  turnLeft: 'Turn your face left',
  turnRight: 'Turn your face right',
};

export const getLivenessInstruction = step => LIVENESS_INSTRUCTIONS[step] || 'Follow the instruction';

const hasClosedEyes = face =>
  Number(face?.leftEyeOpenProbability) < FACE_CONFIG.eyeClosedThreshold &&
  Number(face?.rightEyeOpenProbability) < FACE_CONFIG.eyeClosedThreshold;

const hasOpenEyes = face =>
  Number(face?.leftEyeOpenProbability) >= FACE_CONFIG.eyeClosedThreshold &&
  Number(face?.rightEyeOpenProbability) >= FACE_CONFIG.eyeClosedThreshold;

export const createLivenessProgress = challenge => ({
  challenge,
  index: 0,
  blinkWasClosed: false,
});

export const advanceLivenessProgress = (progress, face) => {
  const step = progress.challenge[progress.index];
  if (!step) return {...progress, complete: true};

  if (step === 'blink') {
    if (hasClosedEyes(face)) return {...progress, blinkWasClosed: true};
    if (progress.blinkWasClosed && hasOpenEyes(face)) {
      return {...progress, index: progress.index + 1, blinkWasClosed: false};
    }
    return progress;
  }

  const yawAngle = Number(face?.yawAngle || 0);
  const matchesTurn =
    (step === 'turnLeft' && yawAngle >= FACE_CONFIG.headTurnAngle) ||
    (step === 'turnRight' && yawAngle <= -FACE_CONFIG.headTurnAngle);
  return matchesTurn ? {...progress, index: progress.index + 1} : progress;
};
