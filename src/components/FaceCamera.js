// @refresh reset
// Remount native camera resources when this component changes during development.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Linking, Platform, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Buffer} from 'buffer';
import {Camera, useCameraDevice, usePhotoOutput} from 'react-native-vision-camera';
import {useFaceDetectorOutput} from 'react-native-vision-camera-face-detector';
import Icon from 'react-native-vector-icons/Ionicons';

import {cropCapturedFace} from '../services/faceCaptureService';
import faceRecognitionService from '../services/faceRecognitionService';
import {cosineSimilarity} from '../services/faceMatchingService';
import {float32ToBase64} from '../utils/base64';
import {FACE_CONFIG} from '../config/faceConfig';
import {advanceLivenessProgress, createLivenessChallenge, createLivenessProgress} from '../services/livenessService';
import {validateCaptureFace, validateSingleFace} from '../utils/faceValidation';
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

const FaceCamera = ({isPaused = false, mode = 'registration', onCancel, onComplete, onError}) => {
  const isProcessing = useRef(false);
  const isMatched = useRef(false);
  const lastProcessedTime = useRef(0);
  const latestFaces = useRef([]);
  const samples = useRef([]);
  const sampleEmbeddings = useRef([]);
  const [sampleCount, setSampleCount] = useState(0);
  const device = useCameraDevice('front');
  const [challenge, setChallenge] = useState(() => createLivenessChallenge());
  const progressRef = useRef(createLivenessProgress(challenge));
  const livenessTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const completionStartedRef = useRef(false);
  const autoCaptureStartedRef = useRef(false);
  const [faceMessage, setFaceMessage] = useState('Center one face in the guide');
  const [faceState, setFaceState] = useState('warning');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [phase, setPhase] = useState('liveness');
  const [captureCountdown, setCaptureCountdown] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [cameraFailure, setCameraFailure] = useState(null);
  const [manualCapture, setManualCapture] = useState(false);
  const photoOutput = usePhotoOutput(PHOTO_OUTPUT_OPTIONS);

  const resetLiveness = useCallback(() => {
    const nextChallenge = createLivenessChallenge();
    isMatched.current = false;
    completionStartedRef.current = false;
    autoCaptureStartedRef.current = false;
    clearInterval(countdownTimerRef.current);
    progressRef.current = createLivenessProgress(nextChallenge);
    setChallenge(nextChallenge);
    setChallengeIndex(0);
    setFaceMessage('Center one face in the guide');
    setFaceState('warning');
    setPhase('liveness');
    setCaptureCountdown(null);
    setAttempt(value => value + 1);
  }, []);

  const fail = useCallback(message => {
    clearTimeout(livenessTimerRef.current);
    clearInterval(countdownTimerRef.current);
    setFaceMessage(message);
    setFaceState('warning');
    setPhase('error');
    setCaptureCountdown(null);
  }, []);

  const handleCameraError = useCallback(error => {
    const message = error?.message || String(error);
    const disabled = /camera.*disabled|device policy|sensor privacy/i.test(message);
    const description = disabled
      ? 'Android has blocked the camera. Turn on Camera access in Quick Settings or Privacy settings. If this phone is managed by your organization, ask its device administrator to allow the camera.'
      : 'The camera could not start. Check camera permission in Settings, close other camera apps, then retry. If it still fails, restart the phone.';
    setCameraFailure({title: disabled ? 'Camera access blocked' : 'Camera unavailable', description});
    fail(description);
  }, [fail]);

  const openCameraSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.PRIVACY_SETTINGS');
      } else {
        await Linking.openSettings();
      }
    } catch {
      try { await Linking.openSettings(); }
      catch { setCameraFailure(current => ({...current, description: 'Open phone Settings manually and check Privacy > Camera access and this app’s Camera permission.'})); }
    }
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
    latestFaces.current = faces;
    if (manualCapture || !['liveness', 'readyToCapture'].includes(phase) || isPaused) return;
    const validation = phase === 'readyToCapture' ? validateCaptureFace(faces) : validateSingleFace(faces);
    if (!validation.isValid) {
      setFaceState('warning');
      setFaceMessage(validation.reason);
      return;
    }

    setFaceState('ready');
    if (phase === 'readyToCapture') { return; }
    const nextProgress = advanceLivenessProgress(progressRef.current, validation.face);
    progressRef.current = nextProgress;
    setChallengeIndex(nextProgress.index);
    if (nextProgress.complete || nextProgress.index >= challenge.length) {
      if (!completionStartedRef.current) {
        completionStartedRef.current = true;
        clearTimeout(livenessTimerRef.current);
        setFaceMessage('Security check complete. Look straight at the camera with your eyes open.');
        setPhase('readyToCapture');
      }
      return;
    }
    setFaceMessage('Keep your face in the guide');
  }, [challenge.length, isPaused, manualCapture, phase]);

  const onDetectorError = useCallback(
    () => { if (!manualCapture) fail('Live face detection is unavailable. Retry or use manual capture for registration.'); },
    [fail, manualCapture],
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
  const outputs = useMemo(() => manualCapture ? [photoOutput] : [detectorOutput, photoOutput], [detectorOutput, manualCapture, photoOutput]);

  const capture = useCallback(async () => {
    if (phase !== 'readyToCapture' || isPaused || isProcessing.current || isMatched.current) return;
    if (Date.now() - lastProcessedTime.current < FACE_CONFIG.identificationIntervalMs) return;
    if (!manualCapture) {
      const validation = validateCaptureFace(latestFaces.current);
      if (!validation.isValid) { autoCaptureStartedRef.current = false; setFaceMessage(validation.reason); return; }
    }
    isProcessing.current = true;
    lastProcessedTime.current = Date.now();
    setPhase('processing');
    setFaceMessage(mode === 'registration' ? `Capturing face ${samples.current.length + 1} of 3` : 'Identifying employee');
    let photo;
    try {
      photo = await photoOutput.capturePhoto({flashMode: 'off'}, CAPTURE_CALLBACKS);
      const data = await photo.getFileDataAsync();
      const faceImage = await cropCapturedFace(Buffer.from(data).toString('base64'));
      const embedding = await faceRecognitionService.getEmbedding(faceImage);
      if (mode === 'registration') {
        if (sampleEmbeddings.current.some(saved => cosineSimilarity(saved, embedding) < FACE_CONFIG.registrationConsistencyThreshold)) {
          throw new Error('Face samples must belong to the same person. Try again.');
        }
        if (samples.current.length < FACE_CONFIG.registrationSampleCount) {
          samples.current.push({faceImage, faceEmbedding: float32ToBase64(embedding)});
          sampleEmbeddings.current.push(embedding);
          setSampleCount(samples.current.length);
        }
        if (samples.current.length === FACE_CONFIG.registrationSampleCount) {
          await onComplete(samples.current);
          setFaceMessage('Registration completed');
          setPhase('completed');
        } else {
          autoCaptureStartedRef.current = false;
          setPhase('readyToCapture');
        }
      } else {
        const result = await onComplete(embedding);
        isMatched.current = !!result?.matched;
        setFaceMessage(result?.matched ? 'Face matched' : result?.reason === 'ambiguous' ? 'Ambiguous face match. Hold still' : 'Face not recognized');
        if (!result?.matched) setPhase('readyToCapture');
      }
    } catch (error) {
      const captureError = error instanceof Error ? error : new Error('Could not capture the face image.');
      if (captureError.code === 'INVALID_FACE_POSE' || (mode === 'recognition' && captureError.code === 'INVALID_FACE_COUNT')) {
        setFaceMessage(captureError.message);
        setFaceState('warning');
        setPhase('readyToCapture');
        return;
      }
      onError?.(captureError);
      fail(captureError.message);
    } finally {
      photo?.dispose();
      isProcessing.current = false;
    }
  }, [fail, isPaused, manualCapture, mode, onComplete, onError, phase, photoOutput]);

  useEffect(() => {
    if (manualCapture || phase !== 'readyToCapture' || isPaused) return undefined;

    let secondsRemaining = mode === 'recognition' ? 0 : 1;
    const tick = () => {
      setCaptureCountdown(secondsRemaining);
      if (secondsRemaining > 0) {
        secondsRemaining -= 1;
        return;
      }
      // Keep polling when a frame is invalid or processing is throttled.
      // The synchronous processing ref prevents overlapping photo/inference work.
      capture();
    };
    countdownTimerRef.current = setInterval(tick, mode === 'recognition' ? FACE_CONFIG.identificationIntervalMs : 1000);
    tick();
    return () => clearInterval(countdownTimerRef.current);
  }, [capture, isPaused, manualCapture, mode, phase]);

  if (cameraFailure) {
    return (
      <View style={styles.cameraErrorScreen}>
        <Text accessibilityRole="header" style={styles.cameraErrorTitle}>{cameraFailure.title}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.cameraErrorDescription}>{cameraFailure.description}</Text>
        <Pressable accessibilityRole="button" onPress={openCameraSettings} style={styles.captureButton}><Text style={styles.captureText}>Open Settings</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setCameraFailure(null); resetLiveness(); }} style={styles.captureButton}><Text style={styles.captureText}>Retry camera</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.captureButton}><Text style={styles.captureText}>Go back</Text></Pressable>
      </View>
    );
  }

  if (!device) {
    return <View style={styles.loading}><ActivityIndicator /><Text style={styles.loadingText}>Opening front camera…</Text></View>;
  }

  return (
    <View style={styles.root}>
      <View style={styles.cameraStage}>
        <FaceGuideOverlay captureCountdown={captureCountdown} faceState={faceState} message={faceMessage}>
          <Camera device={device} isActive={!isPaused} onError={handleCameraError} outputs={outputs} resizeMode="cover" style={StyleSheet.absoluteFill} />
        </FaceGuideOverlay>
      </View>
      {/* <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Face verification</Text>
          <Pressable accessibilityLabel="Close face verification" accessibilityRole="button" hitSlop={10} onPress={onCancel} style={styles.closeButton}>
            <Icon color="#FFFFFF" name="close" size={23} />
          </Pressable>
        </View>
      </SafeAreaView> */}
      {!manualCapture && <LivenessChallenge captureCountdown={captureCountdown} challenge={challenge} currentIndex={challengeIndex} hasManualCaptureOption={mode === 'registration'} />}
      {phase === 'processing' && <View style={styles.processing}><ActivityIndicator color="#FFFFFF" size="large" /><Text style={styles.processingText}>{faceMessage}</Text></View>}


      <View style={styles.actions}>
        {mode === 'registration' && phase !== 'processing' && phase !== 'completed' && (
          <Pressable accessibilityRole="button" onPress={() => {
            if (isProcessing.current) return;
            if (manualCapture) { setManualCapture(false); resetLiveness(); }
            else {
              clearTimeout(livenessTimerRef.current);
              clearInterval(countdownTimerRef.current);
              setManualCapture(true);
              setPhase('readyToCapture');
              setCaptureCountdown(null);
              setFaceMessage('Manual capture: center one face, then tap Capture face. Live liveness checks are skipped.');
            }
          }} style={styles.manualToggle}><Text style={styles.captureText}>{manualCapture ? 'Use automatic capture' : 'Use manual capture'}</Text></Pressable>
        )}
        {manualCapture && phase === 'readyToCapture' ? (
          <Pressable accessibilityRole="button" disabled={isPaused} onPress={capture} style={styles.captureButton}><Text style={styles.captureText}>Capture face {sampleCount + 1} of {FACE_CONFIG.registrationSampleCount}</Text></Pressable>
        ) : phase === 'readyToCapture' ? (
          <View style={styles.countdownAction}><Icon color="#FFFFFF" name="shield-checkmark" size={20} /><Text style={styles.captureText}>{mode === 'registration' ? `Capturing face ${Math.min(sampleCount + 1, 3)} of 3` : 'Identifying employee'}</Text></View>
        ) : phase === 'error' ? (
          <Pressable accessibilityRole="button" onPress={() => { if (manualCapture) { setPhase('readyToCapture'); setFaceMessage('Center one face and tap Capture face.'); } else resetLiveness(); }} style={styles.captureButton}><Text style={styles.captureText}>Try again</Text></Pressable>
        ) : (
          <View style={styles.statusButton}><Text style={styles.statusText}>{phase === 'processing' ? 'Please wait' : 'Follow the security check'}</Text></View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {bottom: 68,  left: 24, position: 'absolute', right: 24},
  manualToggle: {alignItems: 'center', backgroundColor: '#00634B', borderRadius: 12, marginBottom: 12, padding: 14},
  cameraStage: {alignItems: 'center', backgroundColor: '#079467', flex: 1, justifyContent: 'center', marginBottom: 20, paddingBottom: 82},
  cameraErrorScreen: {backgroundColor: '#079467', flex: 1, gap: 16, justifyContent: 'center', padding: 24},
  cameraErrorTitle: {color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center'},
  cameraErrorDescription: {color: '#FFFFFF', fontSize: 16, lineHeight: 24, marginBottom: 12, textAlign: 'center'},
  captureButton: {alignItems: 'center', backgroundColor: '#14BFA5', borderRadius: 12, justifyContent: 'center', minHeight: 52, paddingHorizontal: 24},
  captureText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  closeButton: {alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)', borderColor: 'rgba(255, 255, 255, 0.48)', borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', position: 'absolute', right: 18, width: 36},
  countdownAction: {alignItems: 'center', backgroundColor: 'rgba(0, 78, 56, 0.78)', borderColor: 'rgba(255, 255, 255, 0.45)', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52},
  header: {alignItems: 'center', backgroundColor: '#079467', flexDirection: 'row', height: 62, justifyContent: 'center'},
  headerSafeArea: {left: 0, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0, position: 'absolute', right: 0, top: 0},
  headerTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '700'},
  loading: {alignItems: 'center', backgroundColor: '#079467', flex: 1, justifyContent: 'center'},
  loadingText: {color: '#FFFFFF', marginTop: 10},
  processing: {alignItems: 'center', ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 83, 59, 0.9)', justifyContent: 'center', padding: 24},
  processingText: {color: '#FFFFFF', fontSize: 16, lineHeight: 23, marginTop: 14, textAlign: 'center'},
  root: {backgroundColor: '#079467', flex: 1},
  statusButton: {alignItems: 'center', backgroundColor: 'rgba(0, 78, 56, 0.72)', borderColor: 'rgba(255, 255, 255, 0.35)', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: 18},
  statusText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
});

export default FaceCamera;
