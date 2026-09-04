import {FACE_CONFIG} from '../src/config/faceConfig';
import {advanceLivenessProgress, createLivenessProgress} from '../src/services/livenessService';

describe('liveness challenge progress', () => {
  test('requires eyes to close and reopen for a blink', () => {
    const initial = createLivenessProgress(['blink']);
    const closed = advanceLivenessProgress(initial, {leftEyeOpenProbability: 0.1, rightEyeOpenProbability: 0.2});
    const opened = advanceLivenessProgress(closed, {leftEyeOpenProbability: 0.8, rightEyeOpenProbability: 0.9});

    expect(closed).toMatchObject({blinkWasClosed: true, index: 0});
    expect(opened).toMatchObject({blinkWasClosed: false, index: 1});
  });

  test('uses configured yaw thresholds for both head turns', () => {
    const left = advanceLivenessProgress(createLivenessProgress(['turnLeft']), {yawAngle: FACE_CONFIG.headTurnAngle});
    const right = advanceLivenessProgress(createLivenessProgress(['turnRight']), {yawAngle: -FACE_CONFIG.headTurnAngle});

    expect(left.index).toBe(1);
    expect(right.index).toBe(1);
  });
});
