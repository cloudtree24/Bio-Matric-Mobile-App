import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';

import FaceCamera from '../../components/FaceCamera';
import {COLORS} from '../../constants/colors';
import {FACE_CONFIG} from '../../config/faceConfig';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import faceRecognitionService from '../../services/faceRecognitionService';
import {getLocalFaceRegistration} from '../../services/secureStorage';
import {base64ToFloat32} from '../../utils/base64';

const FaceCheckInTestScreen = ({navigation}) => {
  const {cameraPermissionStatus, requestCameraPermission} = useCameraPermission();
  const [companyId, setCompanyId] = useState('1');
  const [employeeId, setEmployeeId] = useState('1');
  const [error, setError] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => () => setResult(null), []);

  const startTest = useCallback(async () => {
    const nextEmployeeId = employeeId.trim();
    const nextCompanyId = companyId.trim();
    if (!nextEmployeeId || !nextCompanyId) {
      setError('Enter both Employee ID and Company ID.');
      return;
    }

    setError('');
    setIsPreparing(true);
    try {
      const granted = cameraPermissionStatus === 'granted' || await requestCameraPermission();
      if (!granted) throw new Error('Camera permission is required for this test.');
      await faceRecognitionService.loadModel();
      const registered = await getLocalFaceRegistration({
        companyId: nextCompanyId,
        employeeId: nextEmployeeId,
      });
      if (!registered?.embeddingBase64) {
        throw new Error('No local face registration was found. Register this employee first.');
      }
      if (__DEV__) console.info('[face-check-in] local registration found', {companyId: nextCompanyId, employeeId: nextEmployeeId});
      setEmployeeId(nextEmployeeId);
      setCompanyId(nextCompanyId);
      setIsReady(true);
    } catch (requestError) {
      setError(requestError?.message || 'Could not prepare the face check-in test.');
    } finally {
      setIsPreparing(false);
    }
  }, [cameraPermissionStatus, companyId, employeeId, requestCameraPermission]);

  const verifyCapture = useCallback(async capturedImage => {
    setError('');
    try {
      const registered = await getLocalFaceRegistration({companyId, employeeId});
      if (!registered?.embeddingBase64) throw new Error('No local face registration was found. Register this employee first.');
      const capturedEmbedding = await faceRecognitionService.getEmbedding(capturedImage);
      const match = faceRecognitionService.matchEmbeddings(
        base64ToFloat32(registered.embeddingBase64),
        capturedEmbedding,
      );

      if (__DEV__) console.info('[face-check-in] local verification completed', {
        companyId,
        configuredCosineThreshold: FACE_CONFIG.cosineThreshold,
        configuredEuclideanThreshold: FACE_CONFIG.euclideanThreshold,
        distance: match.distance,
        embeddingBytes: registered.embeddingBase64.length,
        employeeId,
        isMatch: match.isMatch,
        similarity: match.similarity,
      });
      setResult(match);
    } catch (requestError) {
      setError(requestError?.message || 'Face verification could not be completed.');
      throw requestError;
    }
  }, [companyId, employeeId]);

  if (isReady) {
    return (
      <View style={styles.cameraRoot}>
        <FaceCamera isPaused={!!result} onCancel={() => navigation.goBack()} onComplete={verifyCapture} onError={cameraError => setError(cameraError?.message || 'Camera test failed.')} />
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.cameraError}>{error}</Text>}
        <Modal animationType="fade" onRequestClose={() => setResult(null)} transparent visible={!!result}>
          <View style={styles.modalBackdrop}>
            <View accessibilityViewIsModal style={styles.modalCard}>
              <Text style={[styles.resultIcon, result?.isMatch ? styles.match : styles.noMatch]}>{result?.isMatch ? '✓' : '!'}</Text>
              <Text style={styles.modalTitle}>{result?.isMatch ? 'Face verified' : 'Face not matched'}</Text>
              <Text style={styles.modalText}>{result?.isMatch ? 'The captured face matches this employee registration.' : 'The captured face does not meet the configured matching threshold.'}</Text>
              <Text style={styles.scoreText}>Similarity: {result?.similarity?.toFixed(3)} · Distance: {result?.distance?.toFixed(3)}</Text>
              <Text style={styles.thresholdText}>Required: similarity ≥ {FACE_CONFIG.cosineThreshold} · distance ≤ {FACE_CONFIG.euclideanThreshold}</Text>
              <Pressable accessibilityRole="button" onPress={() => setResult(null)} style={styles.modalButton}><Text style={styles.modalButtonText}>Test again</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable>
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
        <Text style={styles.description}>This test verifies a new camera capture against the face already registered for the entered employee.</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} editable={!isPreparing} onChangeText={setEmployeeId} placeholder="Employee ID" placeholderTextColor="#6B7280" style={styles.input} value={employeeId} />
        <TextInput autoCapitalize="none" autoCorrect={false} editable={!isPreparing} onChangeText={setCompanyId} placeholder="Company ID" placeholderTextColor="#6B7280" style={styles.input} value={companyId} />
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={isPreparing} onPress={startTest} style={[styles.primaryButton, isPreparing && styles.disabled]}>{isPreparing ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Start face test</Text>}</Pressable>
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
  input: {backgroundColor: COLORS.white, borderColor: COLORS.primary, borderRadius: 10, borderWidth: 1, color: COLORS.darkGreen, fontSize: 16, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 13},
  match: {backgroundColor: '#DDF6E2'},
  modalBackdrop: {alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.48)', flex: 1, justifyContent: 'center', padding: 24},
  modalButton: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 10, marginTop: 24, padding: 14, width: '100%'},
  modalButtonText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
  modalCard: {alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 18, padding: 26, width: '100%'},
  modalText: {color: '#476452', fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center'},
  modalTitle: {color: COLORS.darkGreen, fontSize: 25, fontWeight: '800', marginTop: 16},
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
