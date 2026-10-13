import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';

import FaceCamera from '../../components/FaceCamera';
import {COLORS} from '../../constants/colors';
import {FACE_CONFIG} from '../../config/faceConfig';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import faceRecognitionService from '../../services/faceRecognitionService';
import {getAllLocalFaces} from '../../services/localFaceStorage';
import {findBestEmployeeMatch} from '../../services/faceMatchingService';
import {createFaceCheckInController} from '../../services/faceCheckInService';
import {saveLocalAttendance} from '../../services/localAttendanceStorage';

const FaceCheckInTestScreen = ({navigation}) => {
  const {cameraPermissionStatus, requestCameraPermission} = useCameraPermission();
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [isPreparing, setIsPreparing] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState(null);
  const [scanSession, setScanSession] = useState(0);
  const [checkIn, setCheckIn] = useState(null);
  const controller = useRef(null);

  const resetCheckIn = useCallback(() => {
    setResult(null);
    setScanSession(value => value + 1);
    setCheckIn(null);
    controller.current = null;
  }, []);

  const startTest = useCallback(async () => {
    setError('');
    setIsPreparing(true);
    try {
      const granted = cameraPermissionStatus === 'granted' || await requestCameraPermission();
      if (!granted) throw new Error('Camera permission is required for this test.');
      await faceRecognitionService.loadModel();
      const registered = await getAllLocalFaces();
      if (!registered.some(employee => employee.faces.some(face => face.embedding))) {
        throw new Error('No registered faces were found on this device. Register an employee face first.');
      }
      setEmployees(registered);
      resetCheckIn();
      setIsReady(true);
    } catch (requestError) {
      setError(requestError?.message || 'Could not prepare the face check-in test.');
    } finally {
      setIsPreparing(false);
    }
  }, [cameraPermissionStatus, requestCameraPermission, resetCheckIn]);

  const initialStart = useRef(startTest);
  useEffect(() => {
    initialStart.current();
  }, []);

  const verifyCapture = useCallback(async embedding => {
    setError('');
    const match = findBestEmployeeMatch(embedding, employees);
    if (match.matched) {
      if (controller.current) return match;
      const companyId = match.companyId;
      controller.current = createFaceCheckInController({
        companyId,
        requireLocation: false,
        submitAttendance: payload => saveLocalAttendance(companyId, payload),
        onState: setCheckIn,
      });
      setResult({...match, companyId});
      await controller.current.identify(match);
    }
    return match;
  }, [employees]);

  if (isReady) {
    return (
      <View style={styles.cameraRoot}>
        <FaceCamera key={scanSession} mode="recognition" isPaused={!!result} onCancel={() => navigation.goBack()} onComplete={verifyCapture} onError={cameraError => setError(cameraError?.message || 'Camera test failed.')} />
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.cameraError}>{error}</Text>}
        <Modal animationType="fade" onRequestClose={() => { if (checkIn?.status !== 'submitting') resetCheckIn(); }} transparent visible={!!result}>
          <View style={styles.modalBackdrop}>
            <View accessibilityViewIsModal style={styles.modalCard}>
              <Text style={[styles.resultIcon, result?.matched ? styles.match : styles.noMatch]}>{result?.matched ? '✓' : '!'}</Text>
              <Text style={styles.modalTitle}>{result?.matched ? 'Face matched' : 'Face not recognized'}</Text>
              <Text style={styles.modalText}>{result?.matched ? 'Employee identified from faces saved on this device.' : 'The captured face does not meet the configured matching threshold.'}</Text>
              <Text accessibilityLiveRegion="polite" style={styles.modalText}>
                {checkIn?.status === 'success' ? (checkIn.response?.alreadyCheckedIn ? 'Already checked in today on this device.' : 'Check-In Successful — saved on this device.') : checkIn?.status === 'failed' ? checkIn.error : 'Saving local check-in…'}
              </Text>
              {checkIn?.status === 'submitting' && <ActivityIndicator color={COLORS.darkGreen} />}
              {checkIn?.status === 'failed' && <Pressable accessibilityRole="button" onPress={() => controller.current.retry()} style={styles.modalButton}><Text style={styles.modalButtonText}>Retry check-in</Text></Pressable>}
              <Text style={styles.scoreText}>{result?.employeeName} · Employee {result?.employeeId} · Company {result?.companyId} · Score: {result?.score?.toFixed(3)}</Text>
              <Text style={styles.scoreText}>Second-best score: {result?.secondBestEmployeeId === null ? '—' : result?.secondBestScore?.toFixed(3)}</Text>
              <Text style={styles.thresholdText}>Required: similarity ≥ {FACE_CONFIG.matchThreshold} · gap ≥ {FACE_CONFIG.minScoreGap}</Text>
              <Pressable accessibilityRole="button" disabled={checkIn?.status === 'submitting'} onPress={resetCheckIn} style={styles.modalButton}><Text style={styles.modalButtonText}>Test again</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={checkIn?.status === 'submitting'} onPress={() => navigation.goBack()} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.form}>
        <Text style={styles.title}>Face Check-In Test</Text>
        <Text style={styles.description}>Match against faces saved on this device and record a local check-in. No internet or location check is required.</Text>
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={isPreparing} onPress={startTest} style={[styles.primaryButton, isPreparing && styles.disabled]}>{isPreparing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Retry opening camera</Text>}</Pressable>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>Back</Text></Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backButton: {alignItems: 'center', marginTop: 14, padding: 10},
  backText: {color: COLORS.darkGreen, fontWeight: '700'},
  cameraError: {backgroundColor: 'rgba(155, 28, 28, 0.9)', bottom: 92, color: COLORS.white, left: 20, padding: 12, position: 'absolute', right: 20, textAlign: 'center'},
  cameraRoot: {backgroundColor: '#102817', flex: 1},
  closeButton: {alignItems: 'center', marginTop: 10, padding: 10},
  closeText: {color: COLORS.darkGreen, fontWeight: '700'},
  description: {color: '#476452', fontSize: 15, lineHeight: 22, marginBottom: 26, marginTop: 8},
  disabled: {opacity: 0.7},
  error: {color: '#B42318', fontSize: 14, marginBottom: 14},
  form: {flex: 1, padding: 24, paddingTop: 56},
  match: {backgroundColor: '#14BFA5'},
  modalBackdrop: {alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.48)', flex: 1, justifyContent: 'center', padding: 24},
  modalButton: {alignItems: 'center', backgroundColor: '#14BFA5', borderRadius: 12, marginTop: 24, padding: 14, width: '100%'},
  modalButtonText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
  modalCard: {alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 24, padding: 28, width: '100%'},
  modalText: {color: '#68707A', fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center'},
  modalTitle: {color: '#20262D', fontSize: 27, fontWeight: '800', marginTop: 16},
  noMatch: {backgroundColor: '#FFF1D6'},
  primaryButton: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 10, justifyContent: 'center', minHeight: 50},
  primaryText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
  resultIcon: {borderRadius: 34, color: COLORS.darkGreen, fontSize: 36, fontWeight: '800', height: 68, overflow: 'hidden', textAlign: 'center', width: 68},
  safeArea: {backgroundColor: COLORS.lightGreen, flex: 1},
  scoreText: {color: '#476452', fontSize: 13, marginTop: 18},
  thresholdText: {color: '#587061', fontSize: 12, marginTop: 6, textAlign: 'center'},
  title: {color: COLORS.darkGreen, fontSize: 28, fontWeight: '800'},
});

export default FaceCheckInTestScreen;
