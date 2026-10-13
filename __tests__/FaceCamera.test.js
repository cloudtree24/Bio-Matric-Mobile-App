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

test('manual registration captures three validated samples only on button presses', async () => {
  const complete = jest.fn(async () => ({}));
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="registration" onComplete={complete} />); });
  const press = async label => {
    const button = renderer.root.findAllByProps({accessibilityRole: 'button'}).find(node => node.findAllByType('Text').some(text => text.props.children === label));
    await act(async () => button.props.onPress());
  };
  await press('Use manual capture');
  await tick();
  expect(mockPhotoOutput.capturePhoto).not.toHaveBeenCalled();
  expect(renderer.root.findByType('Camera').props.outputs).toEqual([mockPhotoOutput]);
  for (let sample = 1; sample <= 3; sample += 1) {
    const button = renderer.root.findAllByProps({accessibilityRole: 'button'}).find(node => node.findAllByType('Text').some(text => Array.isArray(text.props.children) && text.props.children[0] === 'Capture face '));
    await act(async () => button.props.onPress());
    await tick();
  }
  expect(cropCapturedFace).toHaveBeenCalledTimes(3);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0]).toHaveLength(3);
});

test('manual registration does not save a photo with invalid face count', async () => {
  cropCapturedFace.mockRejectedValueOnce(Object.assign(new Error('Multiple faces detected'), {code: 'INVALID_FACE_COUNT'}));
  const complete = jest.fn();
  await act(async () => { renderer = TestRenderer.create(<FaceCamera mode="registration" onComplete={complete} />); });
  const toggle = renderer.root.findAllByProps({accessibilityRole: 'button'}).find(node => node.findAllByType('Text').some(text => text.props.children === 'Use manual capture'));
  await act(async () => toggle.props.onPress());
  const capture = renderer.root.findAllByProps({accessibilityRole: 'button'}).find(node => node.findAllByType('Text').some(text => Array.isArray(text.props.children) && text.props.children[0] === 'Capture face '));
  await act(async () => capture.props.onPress());
  expect(complete).not.toHaveBeenCalled();
  expect(faceRecognitionService.getEmbedding).not.toHaveBeenCalled();
});
