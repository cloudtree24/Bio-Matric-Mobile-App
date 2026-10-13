import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';

import FaceCamera from '../../components/FaceCamera';
import {ROUTES} from '../../constants/routes';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import {useFaceRegistration} from '../../hooks/useFaceRegistration';
import faceRecognitionService from '../../services/faceRecognitionService';

const FaceCameraScreen = ({navigation, route}) => {
  const {employeeId, employeeName, companyId} = route.params || {};
  const {cameraPermissionStatus, requestCameraPermission} = useCameraPermission();
  const {registerFace} = useFaceRegistration();
  const [isPreparing, setIsPreparing] = useState(true);
  const [preparationError, setPreparationError] = useState('');
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const prepare = async () => {
      if (!employeeId || !companyId) {
        if (isMounted) setPreparationError('Registration identity is missing. Start again.');
        return;
      }
      try {
        const granted = cameraPermissionStatus === 'granted' || await requestCameraPermission();
        if (!granted) throw new Error('Camera permission is required to register a face.');
        await faceRecognitionService.loadModel();
      } catch (error) {
        if (isMounted) setPreparationError(error?.message || 'Could not prepare face registration.');
      } finally {
        if (isMounted) setIsPreparing(false);
      }
    };
    prepare();
    return () => { isMounted = false; };
  }, [cameraPermissionStatus, companyId, employeeId, requestCameraPermission]);

  const handleComplete = useCallback(async faces => {
    setCameraError('');
    try {
      await registerFace({faces, companyId, employeeId, employeeName});
      navigation.replace(ROUTES.FACE_REGISTRATION_RESULT, {companyId, employeeId, status: 'success'});
    } catch (error) {
      const message = error?.message || 'Face registration could not be completed.';
      const activationPending = message.includes('activation failed');
      navigation.replace(ROUTES.FACE_REGISTRATION_RESULT, {companyId, employeeId, message, status: activationPending ? 'activationPending' : 'failure'});
    }
  }, [companyId, employeeId, employeeName, navigation, registerFace]);

  if (isPreparing) {
    return <SafeAreaView style={styles.state}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.stateText}>Preparing secure face registration…</Text></SafeAreaView>;
  }

  if (preparationError) {
    return (
      <SafeAreaView style={styles.state}>
        <Text style={styles.stateText}>{preparationError}</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>Go back</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <FaceCamera mode="registration" onCancel={() => navigation.goBack()} onComplete={handleComplete} onError={error => setCameraError(error?.message || 'Face capture failed. Try again.')} />
      {!!cameraError && <Text accessibilityLiveRegion="polite" style={styles.cameraError}>{cameraError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {backgroundColor: '#FFFFFF', borderRadius: 22, marginTop: 20, paddingHorizontal: 24, paddingVertical: 12},
  backText: {color: '#173D24', fontWeight: '800'},
  cameraError: {backgroundColor: 'rgba(155, 28, 28, 0.9)', bottom: 92, color: '#FFFFFF', left: 20, padding: 12, position: 'absolute', right: 20, textAlign: 'center'},
  root: {backgroundColor: '#102817', flex: 1},
  state: {alignItems: 'center', backgroundColor: '#102817', flex: 1, justifyContent: 'center', padding: 24},
  stateText: {color: '#FFFFFF', fontSize: 16, lineHeight: 23, textAlign: 'center'},
});

export default FaceCameraScreen;
