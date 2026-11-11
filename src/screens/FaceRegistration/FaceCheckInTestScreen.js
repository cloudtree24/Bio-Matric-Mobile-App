// @refresh reset
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import FaceCamera from '../../components/FaceCamera';
import FaceStatusModal from '../../components/FaceStatusModal';
import {useAdminSession} from '../../context/AdminSessionContext';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import faceRecognitionService from '../../services/faceRecognitionService';
import {getRegisteredBiometric} from '../../services/biometricApi';
import {fetchEmployeeDetails} from '../../services/employeeRegistrationApi';
import {getBiometricEmployeeId, getBiometricCompanyId, requireBackendId} from '../../utils/backendIdentity';
import {decodeBackendEmbedding, verifyBackendFace} from '../../services/backendFaceService';
import {createFaceCheckInController} from '../../services/faceCheckInService';

const FaceCheckInTestScreen = ({navigation}) => {
  const {companyId, employeeId: sessionEmployeeId, isSessionLoading} = useAdminSession();
  const focused = useIsFocused();
  const {cameraPermissionStatus, requestCameraPermission} = useCameraPermission();
  const [employeeCode, setEmployeeCode] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [scanSession, setScanSession] = useState(0);
  const identity = useRef(null);
  const registeredEmbedding = useRef(null);
  const controller = useRef(null);
  const processing = useRef(false);
  const preparingRef = useRef(false);
  const generation = useRef(0);
  const active = useRef(false);
  const resultShown = useRef(false);

  useEffect(() => {
    active.current = focused;
    generation.current += 1;
    setReady(false);
    setPreparing(false);
    setModal(null);
    identity.current = null;
    registeredEmbedding.current = null;
    controller.current = null;
    processing.current = false;
    preparingRef.current = false;
    resultShown.current = false;
    return () => {
      active.current = false;
      generation.current += 1;
      registeredEmbedding.current = null;
      identity.current = null;
    };
  }, [companyId, sessionEmployeeId, focused]);

  const startVerification = useCallback(async () => {
    if (preparingRef.current || !active.current || isSessionLoading) return;
    preparingRef.current = true;
    const version = ++generation.current;
    const current = () => active.current && version === generation.current;
    setPreparing(true);
    setReady(false);
    setModal(null);
    registeredEmbedding.current = null;
    identity.current = null;
    controller.current = null;
    resultShown.current = false;
    try {
      requireBackendId(companyId, 'Company ID');
      let employeeId = sessionEmployeeId;
      let biometricCompanyId = Number(companyId);
      if (!employeeId) {
        if (!employeeCode.trim()) throw new Error('Enter your employee code to continue.');
        const employees = await fetchEmployeeDetails(companyId, employeeCode.trim());
        if (!current()) return;
        if (employees.length !== 1) throw new Error('Employee not found. Check your employee code.');
        employeeId = getBiometricEmployeeId(employees[0]);
        biometricCompanyId = getBiometricCompanyId(employees[0], companyId);
      }
      requireBackendId(employeeId, 'Employee ID');
      const record = await getRegisteredBiometric(employeeId, biometricCompanyId);
      if (!current()) return;
      if (!record?.faceImage || !record?.faceEmbeding) {
        setModal({title: 'Face registration required', message: 'Ask your administrator to register your face before checking in.'});
        return;
      }
      const embedding = decodeBackendEmbedding(record.faceEmbeding);
      const granted = cameraPermissionStatus === 'granted' || await requestCameraPermission();
      if (!current()) return;
      if (!granted) throw new Error('Camera permission is required for face verification.');
      await faceRecognitionService.loadModel();
      if (!current()) return;
      identity.current = {employeeId: Number(employeeId), companyId: biometricCompanyId};
      registeredEmbedding.current = embedding;
      setScanSession(value => value + 1);
      setReady(true);
    } catch (error) {
      if (current()) setModal({title: 'Unable to start verification', message: error.message, retry: true, showSettings: /permission/i.test(error.message)});
    } finally {
      if (current()) { setPreparing(false); preparingRef.current = false; }
    }
  }, [cameraPermissionStatus, companyId, employeeCode, isSessionLoading, requestCameraPermission, sessionEmployeeId]);

  const verifyCapture = useCallback(async embedding => {
    if (processing.current || resultShown.current || !active.current || !registeredEmbedding.current || !identity.current) return {matched: false};
    processing.current = true;
    const version = generation.current;
    const current = () => active.current && version === generation.current;
    setModal({title: 'Face verification in progress', message: 'Comparing your face with your registered employee record…', busy: true});
    try {
      const match = verifyBackendFace(registeredEmbedding.current, embedding, identity.current);
      if (!current()) return {matched: false};
      resultShown.current = true;
      if (!match.matched) {
        setModal({title: 'Face does not match', message: 'Your face did not match the selected employee. Improve the lighting and try again.', retryScan: true});
        return match;
      }
      controller.current = createFaceCheckInController({
        companyId: identity.current.companyId,
        expectedEmployeeId: identity.current.employeeId,
        // This test route preserves its existing no-location policy.
        requireLocation: false,
        isActive: current,
        onState: state => {
          if (!current()) return;
          setModal(state.status === 'success'
            ? {title: 'Check-in successful', message: 'Your face matched and the server confirmed your check-in.'}
            : state.status === 'failed'
              ? {title: 'Face matched; check-in failed', message: state.error, retryAttendance: true}
              : {title: 'Face matched', message: 'Saving your check-in to the server…', busy: true});
        },
      });
      await controller.current.identify(match);
      return match;
    } catch (error) {
      if (current()) {
        resultShown.current = true;
        setModal({title: 'Verification failed', message: error.message, retryScan: true});
      }
      return {matched: false};
    } finally { if (current()) processing.current = false; }
  }, []);

  const retry = () => {
    if (modal?.retryAttendance) controller.current?.retry();
    else startVerification();
  };
  return <SafeAreaView style={styles.root}>
    {ready ? <FaceCamera key={scanSession} mode="recognition" isPaused={!focused || !!modal} onCancel={() => navigation.goBack()} onComplete={verifyCapture} onError={error => setModal({title: 'Face capture failed', message: error.message, retryScan: true})} /> : <View style={styles.form}>
      <Text style={styles.title}>Face Check-In</Text>
      <Text style={styles.description}>Verify your face against your employee record before saving check-in.</Text>
      {!sessionEmployeeId && <TextInput accessibilityLabel="Employee code" placeholder="Enter employee code" placeholderTextColor="#68707A" autoCapitalize="none" autoCorrect={false} value={employeeCode} onChangeText={setEmployeeCode} editable={!preparing} onSubmitEditing={startVerification} returnKeyType="go" style={styles.input} />}
      <Pressable accessibilityRole="button" disabled={preparing || isSessionLoading || !companyId} onPress={startVerification} style={styles.button}>{preparing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Start verification</Text>}</Pressable>
      {!companyId && <Text style={styles.description}>Please sign in to select your company.</Text>}
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><Text>Back</Text></Pressable>
    </View>}
    <FaceStatusModal visible={!!modal} {...modal} onRetry={modal?.retry || modal?.retryScan || modal?.retryAttendance ? retry : undefined} retryLabel={modal?.retryAttendance ? 'Retry check-in' : 'Try again'} onClose={() => { setModal(null); setReady(false); registeredEmbedding.current = null; }} />
  </SafeAreaView>;
};
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F6FBF8'}, form: {padding: 24, paddingTop: 56},
  title: {fontSize: 28, color: '#153C2D', fontWeight: '800'}, description: {color: '#476452', lineHeight: 22, marginVertical: 16},
  input: {minHeight: 48, borderWidth: 1, borderColor: '#D6E3DA', borderRadius: 8, paddingHorizontal: 12, color: '#153C2D', marginBottom: 16},
  button: {minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07583C', borderRadius: 10}, buttonText: {color: '#FFFFFF', fontWeight: '700'}, back: {alignItems: 'center', padding: 16},
});
export default FaceCheckInTestScreen;
