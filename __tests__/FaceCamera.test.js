import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import FaceCamera from '../src/components/FaceCamera';
import {cropCapturedFace} from '../src/services/faceCaptureService';
import faceRecognitionService from '../src/services/faceRecognitionService';

let mockDetectorOptions;
const mockPhoto = {getFileDataAsync: jest.fn(async () => new Uint8Array([1])), dispose: jest.fn()};
const mockPhotoOutput = {capturePhoto: jest.fn(async () => mockPhoto)};
jest.mock('react-native-vision-camera', () => ({Camera: 'Camera', useCameraDevice: () => ({}), usePhotoOutput: () => mockPhotoOutput}));
jest.mock('react-native-vision-camera-face-detector', () => ({useFaceDetectorOutput: options => { mockDetectorOptions = options; return {}; }}));
jest.mock('../src/services/faceCaptureService', () => ({cropCapturedFace: jest.fn(async () => 'crop')}));
jest.mock('../src/services/faceRecognitionService', () => ({__esModule: true, default: {getEmbedding: jest.fn(async () => new Float32Array([1, 0]))}}));
jest.mock('../src/services/livenessService', () => ({createLivenessChallenge: () => [], createLivenessProgress: () => ({}), advanceLivenessProgress: () => ({complete: true, index: 0})}));
jest.mock('../src/components/FaceGuideOverlay', () => 'FaceGuideOverlay');
jest.mock('../src/components/LivenessChallenge', () => 'LivenessChallenge');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

let renderer;
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = null; jest.useRealTimers(); });
const open = async onComplete => {
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="recognition" onComplete={onComplete} />); });
};
const detect = async faces => { await act(async () => mockDetectorOptions.onFacesDetected(faces)); };
const tick = async () => { await act(async () => jest.advanceTimersByTime(400)); };

test('waits for a frontal face after liveness rather than capturing the final head turn', async () => {
  const complete = jest.fn(async () => ({matched: true}));
  await open(complete);
  await detect([{yawAngle: 22}]);
  await tick();
  expect(mockPhotoOutput.capturePhoto).not.toHaveBeenCalled();
  await detect([{yawAngle: 0, pitchAngle: 0, rollAngle: 0, leftEyeOpenProbability: 1, rightEyeOpenProbability: 1}]);
  await tick();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('blocks zero/multiple faces, retries valid frames, and stops until camera reset', async () => {
  const complete = jest.fn(async () => ({matched: false}));
  await open(complete);
  await detect([]);
  await detect([{}, {}]);
  expect(mockPhotoOutput.capturePhoto).not.toHaveBeenCalled();
  await detect([{}]);
  expect(complete).toHaveBeenCalledTimes(1);
  await detect([]);
  await tick();
  await detect([{}, {}]);
  await tick();
  expect(complete).toHaveBeenCalledTimes(1);
  complete.mockResolvedValue({matched: true});
  await detect([{}]);
  await tick();
  expect(complete).toHaveBeenCalledTimes(2);
  await tick();
  await tick();
  expect(complete).toHaveBeenCalledTimes(2);
  await act(async () => renderer.unmount());
  renderer = null;
  await open(complete);
  await detect([{}]);
  expect(complete).toHaveBeenCalledTimes(3);
});

test('serializes slow recognition jobs despite repeated detector callbacks', async () => {
  let resolve;
  const complete = jest.fn(() => new Promise(done => { resolve = done; }));
  await open(complete);
  await detect([{}]);
  await tick();
  await detect([{}]);
  await tick();
  expect(mockPhotoOutput.capturePhoto).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledTimes(1);
  await act(async () => resolve({matched: true}));
  await tick();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('retries invalid still-face counts without running ONNX on that photo', async () => {
  cropCapturedFace.mockRejectedValueOnce(Object.assign(new Error('Multiple faces detected'), {code: 'INVALID_FACE_COUNT'}));
  const complete = jest.fn(async () => ({matched: true}));
  await open(complete);
  await detect([{}]);
  expect(faceRecognitionService.getEmbedding).not.toHaveBeenCalled();
  await tick();
  expect(faceRecognitionService.getEmbedding).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledTimes(1);
});

test('handles a disabled camera, unmounts it, and retries without capturing', async () => {
  const complete = jest.fn();
  await open(complete);
  await act(async () => {
    renderer.root.findByType('Camera').props.onError(new Error('java.lang.Error: Camera is disabled, probably due to a device policy!'));
  });
  expect(renderer.root.findAllByType('Camera')).toHaveLength(0);
  expect(renderer.root.findAllByType('Text').some(node => node.props.children === 'Camera access blocked')).toBe(true);
  await tick();
  expect(mockPhotoOutput.capturePhoto).not.toHaveBeenCalled();
  const retry = renderer.root.findAllByProps({accessibilityRole: 'button'}).find(node => node.findAllByType('Text').some(text => text.props.children === 'Retry camera'));
  await act(async () => retry.props.onPress());
  expect(renderer.root.findAllByType('Camera')).toHaveLength(1);
  expect(complete).not.toHaveBeenCalled();
});

test('registration retains live detection and captures three consistent samples automatically', async () => {
  const complete = jest.fn(async () => ({}));
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="registration" onComplete={complete} />); });
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Use manual capture');
  expect(renderer.root.findByType('Camera').props.outputs).toHaveLength(2);
  await detect([{}]);
  for (let index = 0; index < 6; index += 1) {
    await act(async () => jest.advanceTimersByTime(1000));
  }
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0]).toHaveLength(3);
});

test('registration rejects a captured photo containing multiple faces', async () => {
  cropCapturedFace.mockRejectedValueOnce(Object.assign(new Error('Multiple faces detected'), {code: 'INVALID_FACE_COUNT'}));
  const complete = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="registration" onComplete={complete} />); });
  await detect([{}]);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(complete).not.toHaveBeenCalled();
  expect(faceRecognitionService.getEmbedding).not.toHaveBeenCalled();
});

test('sustained multiple faces produce guidance without verification', async () => {
  const onError = jest.fn();
  const complete = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="recognition" onComplete={complete} onError={onError} />); });
  await detect([{}, {}]);
  await act(async () => jest.advanceTimersByTime(3000));
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: expect.stringContaining('Multiple faces detected')}));
  expect(complete).not.toHaveBeenCalled();
});

test('navigation during inference discards the captured embedding', async () => {
  let finish;
  faceRecognitionService.getEmbedding.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const complete = jest.fn();
  await open(complete);
  await detect([{}]);
  await act(async () => renderer.unmount());
  renderer = null;
  await act(async () => finish(new Float32Array([1, 0])));
  expect(complete).not.toHaveBeenCalled();
  expect(mockPhoto.dispose).toHaveBeenCalled();
});
