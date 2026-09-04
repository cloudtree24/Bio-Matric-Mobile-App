import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Buffer} from 'buffer';
import {Camera, useCameraDevice, usePhotoOutput} from 'react-native-vision-camera';
import {useFaceDetectorOutput} from 'react-native-vision-camera-face-detector';

import {FACE_CONFIG} from '../config/faceConfig';
import {advanceLivenessProgress, createLivenessChallenge, createLivenessProgress} from '../services/livenessService';
import {validateSingleFace} from '../utils/faceValidation';
import FaceGuideOverlay from './FaceGuideOverlay';
import LivenessChallenge from './LivenessChallenge';

const CAPTURE_CALLBACKS = {};
const PHOTO_OUTPUT_OPTIONS = {
  containerFormat: 'jpeg',
  quality: FACE_CONFIG.imageQuality / 100,
  qualityPrioritization: 'quality',
  targetResolution: {
    height: FACE_CONFIG.resizeHeight,
    width: FACE_CONFIG.resizeWidth,
  },
};

const FaceCamera = ({isPaused = false, onCancel, onComplete, onError}) => {
  const device = useCameraDevice('front');
  const [challenge, setChallenge] = useState(() => createLivenessChallenge());
  const progressRef = useRef(createLivenessProgress(challenge));
  const livenessTimerRef = useRef(null);
  const completionStartedRef = useRef(false);
  const [faceMessage, setFaceMessage] = useState('Center one face in the guide');
  const [faceState, setFaceState] = useState('warning');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [phase, setPhase] = useState('liveness');
  const [attempt, setAttempt] = useState(0);
  const photoOutput = usePhotoOutput(PHOTO_OUTPUT_OPTIONS);

  const resetLiveness = useCallback(() => {
    const nextChallenge = createLivenessChallenge();
    completionStartedRef.current = false;
    progressRef.current = createLivenessProgress(nextChallenge);
    setChallenge(nextChallenge);
    setChallengeIndex(0);
    setFaceMessage('Center one face in the guide');
    setFaceState('warning');
    setPhase('liveness');
    setAttempt(value => value + 1);
  }, []);

  const fail = useCallback(message => {
    clearTimeout(livenessTimerRef.current);
    setFaceMessage(message);
    setFaceState('warning');
    setPhase('error');
  }, []);

  useEffect(() => {
    if (phase !== 'liveness') return undefined;
    livenessTimerRef.current = setTimeout(
      () => fail('Face check timed out. Please try again.'),
      FACE_CONFIG.livenessTimeoutMs,
    );
    return () => clearTimeout(livenessTimerRef.current);
  }, [attempt, fail, phase]);

  const onFacesDetected = useCallback(faces => {
    if (phase !== 'liveness' || isPaused) return;
    const validation = validateSingleFace(faces);
    if (!validation.isValid) {
      setFaceState('warning');
      setFaceMessage(validation.reason);
      return;
    }

    setFaceState('ready');
    const nextProgress = advanceLivenessProgress(progressRef.current, validation.face);
    progressRef.current = nextProgress;
    setChallengeIndex(nextProgress.index);
    if (nextProgress.complete || nextProgress.index >= challenge.length) {
      if (!completionStartedRef.current) {
        completionStartedRef.current = true;
        clearTimeout(livenessTimerRef.current);
        setFaceMessage('Security check complete. Tap Capture face.');
        setPhase('readyToCapture');
      }
      return;
    }
    setFaceMessage('Keep your face in the guide');
  }, [challenge.length, isPaused, phase]);

  const onDetectorError = useCallback(
    () => fail('Face detection is unavailable. Please try again.'),
    [fail],
  );
  const detectorOutput = useFaceDetectorOutput({
    autoMode: false,
    cameraFacing: 'front',
    minFaceSize: 0.2,
    onError: onDetectorError,
    onFacesDetected,
    outputResolution: 'preview',
    performanceMode: 'fast',
    runClassifications: true,
    trackingEnabled: false,
  });
  const outputs = useMemo(() => [detectorOutput, photoOutput], [detectorOutput, photoOutput]);

  const capture = useCallback(async () => {
    if (phase !== 'readyToCapture' || isPaused) return;
    setPhase('processing');
    setFaceMessage('Processing your face securely…');
    let photo;
    try {
      photo = await photoOutput.capturePhoto({flashMode: 'off'}, CAPTURE_CALLBACKS);
      const data = await photo.getFileDataAsync();
      await onComplete(`data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`);
    } catch (error) {
      const captureError = error instanceof Error ? error : new Error('Could not capture the face image.');
      onError?.(captureError);
      fail(captureError.message);
    } finally {
      photo?.dispose();
    }
  }, [fail, isPaused, onComplete, onError, phase, photoOutput]);

  if (!device) {
    return <View style={styles.loading}><ActivityIndicator /><Text style={styles.loadingText}>Opening front camera…</Text></View>;
  }

  return (
    <View style={styles.root}>
      <Camera device={device} isActive={!isPaused} outputs={outputs} style={StyleSheet.absoluteFill} />
      <LivenessChallenge challenge={challenge} currentIndex={challengeIndex} />
      <FaceGuideOverlay faceState={faceState} message={faceMessage} />
      {phase === 'processing' && <View style={styles.processing}><ActivityIndicator color="#FFFFFF" size="large" /><Text style={styles.processingText}>Processing your face securely…</Text></View>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={phase === 'processing'} onPress={onCancel} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        {phase === 'readyToCapture' ? (
          <Pressable accessibilityRole="button" onPress={capture} style={styles.captureButton}><Text style={styles.captureText}>Capture face</Text></Pressable>
        ) : phase === 'error' ? (
          <Pressable accessibilityRole="button" onPress={resetLiveness} style={styles.captureButton}><Text style={styles.captureText}>Try again</Text></Pressable>
        ) : (
          <View style={styles.statusButton}><Text style={styles.statusText}>{phase === 'processing' ? 'Please wait' : 'Complete security check'}</Text></View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {bottom: 70, flexDirection: 'row', justifyContent: 'space-between', left: 20, position: 'absolute', right: 20},
  cancelButton: {alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.92)', borderRadius: 24, justifyContent: 'center', minHeight: 48, paddingHorizontal: 24},
  cancelText: {color: '#173D24', fontSize: 16, fontWeight: '700'},
  captureButton: {alignItems: 'center', backgroundColor: '#1F7A38', borderRadius: 24, justifyContent: 'center', minHeight: 48, paddingHorizontal: 24},
  captureText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  loading: {alignItems: 'center', flex: 1, justifyContent: 'center'},
  loadingText: {marginTop: 10},
  processing: {alignItems: 'center', ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16, 40, 23, 0.86)', justifyContent: 'center', padding: 24},
  processingText: {color: '#FFFFFF', fontSize: 16, lineHeight: 23, marginTop: 14, textAlign: 'center'},
  root: {backgroundColor: '#102817', flex: 1},
  statusButton: {alignItems: 'center', backgroundColor: 'rgba(31, 122, 56, 0.88)', borderRadius: 24, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18},
  statusText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
});

export default FaceCamera;
