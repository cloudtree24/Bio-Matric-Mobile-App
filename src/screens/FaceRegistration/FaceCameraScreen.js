// @refresh reset
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import FaceCamera from '../../components/FaceCamera';
import FaceStatusModal from '../../components/FaceStatusModal';
import {useAdminSession} from '../../context/AdminSessionContext';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import {useFaceRegistration} from '../../hooks/useFaceRegistration';
import {getRegisteredBiometric} from '../../services/biometricApi';
import {decodeBackendEmbedding} from '../../services/backendFaceService';
import faceRecognitionService from '../../services/faceRecognitionService';

const FaceCameraScreen = ({navigation, route}) => {
  const {employeeId, employeeName, companyId} = route.params || {};
  const originCompanyId = route.params?.sessionCompanyId ?? companyId;
  const {operatorId, companyId: sessionCompanyId} = useAdminSession();
  const focused = useIsFocused();
  const {cameraPermissionStatus, requestCameraPermission} = useCameraPermission();
  const {registerFace, checkFaceAccess} = useFaceRegistration();
  const [preparing, setPreparing] = useState(true);
  const [modal, setModal] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const sessionVersion = useRef(0);
  const submitting = useRef(false);
  const saved = useRef(false);
  const photoSamples = useRef(null);
  useEffect(() => {
    sessionVersion.current += 1;
    active.current = focused;
    return () => { active.current = false; photoSamples.current = null; };
  }, [focused, companyId, sessionCompanyId]);

  useEffect(() => {
    let current = true;
    const prepare = async () => {
      setPreparing(true);
      setModal(null);
      try {
        if (String(originCompanyId) !== String(sessionCompanyId)) throw new Error('Company session changed. Return to registration.');
        await checkFaceAccess({employeeId, companyId, modifiedBy: operatorId});
        const granted = cameraPermissionStatus === 'granted' || await requestCameraPermission();
        if (!granted) throw new Error('Camera permission is required to register a face.');
        await faceRecognitionService.loadModel();
      } catch (error) {
        if (current) setModal({title: 'Unable to start registration', message: error.message, showSettings: /permission/i.test(error.message)});
      } finally { if (current) setPreparing(false); }
    };
    if (focused) prepare();
    return () => { current = false; };
  }, [attempt, cameraPermissionStatus, checkFaceAccess, companyId, employeeId, focused, operatorId, originCompanyId, requestCameraPermission, sessionCompanyId]);

  const refreshSaved = useCallback(async (version = sessionVersion.current) => {
    try {
      const record = await getRegisteredBiometric(employeeId, companyId);
      if (!record?.faceImage || !record?.faceEmbeding) throw new Error('Saved face details are not yet available.');
      decodeBackendEmbedding(record.faceEmbeding);
      if (active.current && version === sessionVersion.current) setModal({title: 'Registration successful', message: `${employeeName || 'Employee'}’s face has been saved to the server.`});
    } catch (error) {
      if (active.current && version === sessionVersion.current) setModal({title: 'Face saved; refresh pending', message: error.message, refresh: true});
    }
  }, [companyId, employeeId, employeeName]);

  const submit = useCallback(async faces => {
    if (submitting.current || saved.current || !active.current) return;
    const version = sessionVersion.current;
    submitting.current = true;
    photoSamples.current = faces;
    setModal({title: 'Registration in progress', message: 'Face images captured. Saving the validated face to the server…', busy: true});
    try {
      await registerFace({faces, companyId, employeeId, modifiedBy: operatorId});
      saved.current = true;
      photoSamples.current = null;
      if (active.current && version === sessionVersion.current) await refreshSaved(version);
    } catch (error) {
      if (active.current && version === sessionVersion.current) setModal({title: 'Registration failed', message: error.message, retrySave: true});
    } finally { submitting.current = false; }
  }, [companyId, employeeId, operatorId, refreshSaved, registerFace]);

  const retry = () => {
    if (modal?.refresh) {
      setModal({title: 'Checking registration', message: 'Refreshing saved face details…', busy: true});
      refreshSaved();
    } else if (modal?.retrySave && photoSamples.current) submit(photoSamples.current);
    else setAttempt(value => value + 1);
  };
  return <View style={styles.root}>
    {preparing ? <SafeAreaView style={styles.state}><ActivityIndicator color="#FFFFFF" /><Text style={styles.text}>Preparing face registration…</Text></SafeAreaView> : !modal && <FaceCamera key={attempt} mode="registration" isPaused={!focused} onCancel={() => navigation.goBack()} onComplete={submit} onError={error => setModal({title: 'Capture failed', message: error.message})} />}
    <FaceStatusModal visible={!!modal} {...modal} onRetry={saved.current && !modal?.refresh ? undefined : retry} onClose={() => navigation.goBack()} />
  </View>;
};
const styles = StyleSheet.create({root: {flex: 1, backgroundColor: '#102817'}, state: {flex: 1, alignItems: 'center', justifyContent: 'center'}, text: {color: '#FFFFFF', marginTop: 16}});
export default FaceCameraScreen;
