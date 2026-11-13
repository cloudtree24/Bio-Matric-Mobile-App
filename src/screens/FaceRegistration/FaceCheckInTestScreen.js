// @refresh reset
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import FaceCamera from '../../components/FaceCamera';
import FaceStatusModal from '../../components/FaceStatusModal';
import { useAdminSession } from '../../context/AdminSessionContext';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import faceRecognitionService from '../../services/faceRecognitionService';
import { getCompanyFaceTemplates } from '../../services/biometricApi';
import { requireBackendId } from '../../utils/backendIdentity';
import { matchEmployeeFace } from '../../services/faceMatchingService';
import { createFaceCheckInController } from '../../services/faceCheckInService';
import {buildFaceAttendancePayload} from '../../services/attendanceApi';
import {ROUTES} from '../../constants/routes';

const FaceCheckInTestScreen = ({ navigation }) => {
  const { companyId, isSessionLoading } = useAdminSession();
  const focused = useIsFocused();
  const { cameraPermissionStatus, requestCameraPermission } =
    useCameraPermission();
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [scanSession, setScanSession] = useState(0);
  const employeeTemplates = useRef([]);
  const controller = useRef(null);
  const processing = useRef(false);
  const preparingRef = useRef(false);
  const generation = useRef(0);
  const active = useRef(false);
  const resultShown = useRef(false);
  const attendanceSubmitted = useRef(false);
  const navigationTimer = useRef(null);

  useEffect(() => {
    active.current = focused;
    generation.current += 1;
    setReady(false);
    setPreparing(false);
    setModal(null);
    employeeTemplates.current = [];
    controller.current = null;
    processing.current = false;
    preparingRef.current = false;
    resultShown.current = false;
    attendanceSubmitted.current = false;
    return () => {
      clearTimeout(navigationTimer.current);
      active.current = false;
      generation.current += 1;
      employeeTemplates.current = [];
    };
  }, [companyId, focused]);

  const startVerification = useCallback(async () => {
    if (preparingRef.current || !active.current || isSessionLoading) return;
    preparingRef.current = true;
    const version = ++generation.current;
    const current = () => active.current && version === generation.current;
    setPreparing(true);
    setReady(false);
    setModal(null);
    employeeTemplates.current = [];
    controller.current = null;
    resultShown.current = false;
    attendanceSubmitted.current = false;
    try {
      requireBackendId(companyId, 'Company ID');
      const biometricCompanyId = Number(companyId);
      const templates = await getCompanyFaceTemplates(biometricCompanyId);
      if (!current()) return;
      if (!templates.length) {
        setModal({
          title: 'No registered faces',
          message:
            'No active face registrations are available for this company. Ask your administrator for help.',
        });
        return;
      }
      const granted =
        cameraPermissionStatus === 'granted' ||
        (await requestCameraPermission());
      if (!current()) return;
      if (!granted)
        throw new Error('Camera permission is required for face verification.');
      await faceRecognitionService.loadModel();
      if (!current()) return;
      employeeTemplates.current = templates;
      setScanSession(value => value + 1);
      setReady(true);
    } catch (error) {
      if (current())
        setModal({
          title: 'Unable to start verification',
          message: error.message,
          retry: true,
          showSettings: /permission/i.test(error.message),
        });
    } finally {
      if (current()) {
        setPreparing(false);
        preparingRef.current = false;
      }
    }
  }, [
    cameraPermissionStatus,
    companyId,
    isSessionLoading,
    requestCameraPermission,
  ]);

  const verifyCapture = useCallback(
    async embedding => {
      if (
        processing.current ||
        resultShown.current ||
        !active.current ||
        !employeeTemplates.current.length
      )
        return { matched: false };
      processing.current = true;
      const version = generation.current;
      const current = () => active.current && version === generation.current;
      setModal({
        title: 'Face verification in progress',
        message: 'Identifying your registered employee record…',
        busy: true,
      });
      try {
        const match = matchEmployeeFace(embedding, employeeTemplates.current);
        if (!current()) return { matched: false };
        resultShown.current = true;
        if (!match.matched) {
          setModal(
            match.reason === 'ambiguous'
              ? {
                  title: 'Ambiguous match',
                  message:
                    'Your face is too similar to more than one employee record. Improve the lighting and try again.',
                  retryScan: true,
                }
              : {
                  title: 'Face not recognized',
                  message:
                    'Your face is not registered for this company. Improve the lighting and try again.',
                  retryScan: true,
                },
          );
          return match;
        }
        controller.current = createFaceCheckInController({
          companyId: Number(companyId),
          buildPayload: buildFaceAttendancePayload,
          // This test route preserves its existing no-location policy.
          requireLocation: false,
          isActive: current,
          onState: state => {
            if (!current()) return;
            if (state.status === 'success') {
              if (attendanceSubmitted.current) return;
              attendanceSubmitted.current = true;
              setModal({title: 'Check-in Successful', message: 'Your attendance has been recorded.', employee: state.match});
              navigationTimer.current = setTimeout(() => {
                if (current()) navigation.reset({index: 0, routes: [{name: ROUTES.ADMIN_DASHBOARD}]});
              }, 1800);
              return;
            }
            setModal(
              state.status === 'success'
                ? {
                    title: 'Check-in successful',
                    message:
                      'Your face matched and the server confirmed your check-in.',
                  }
                : state.status === 'failed'
                ? {
                    title: 'Face matched; check-in failed',
                    message: state.error,
                    retryAttendance: true,
                  }
                : {
                    title: 'Face matched',
                    message: 'Saving your check-in to the server…',
                    busy: true,
                  },
            );
          },
        });
        await controller.current.identify(match);
        return match;
      } catch (error) {
        if (current()) {
          resultShown.current = true;
          setModal({
            title: 'Verification failed',
            message: error.message,
            retryScan: true,
          });
        }
        return { matched: false };
      } finally {
        if (current()) processing.current = false;
      }
    },
    [companyId, navigation],
  );

  const retry = () => {
    if (modal?.retryAttendance) controller.current?.retry();
    else startVerification();
  };
  return (
    <SafeAreaView style={styles.root}>
      {ready ? (
        <FaceCamera
          key={scanSession}
          mode="recognition"
          isPaused={!focused || !!modal}
          onCancel={() => navigation.goBack()}
          onComplete={verifyCapture}
          onError={error =>
            setModal({
              title: 'Face capture failed',
              message: error.message,
              retryScan: true,
            })
          }
        />
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>Face Check-In</Text>
          <Text style={styles.description}>
            Verify your face against your company’s registered employee records
            before saving check-in.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={preparing || isSessionLoading || !companyId}
            onPress={startVerification}
            style={styles.button}
          >
            {preparing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Start verification</Text>
            )}
          </Pressable>
          {!companyId && (
            <Text style={styles.description}>
              Please sign in to select your company.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.back}
          >
            <Text>Back</Text>
          </Pressable>
        </View>
      )}
      <FaceStatusModal
        visible={!!modal}
        {...modal}
        onRetry={
          modal?.retry || modal?.retryScan || modal?.retryAttendance
            ? retry
            : undefined
        }
        retryLabel={modal?.retryAttendance ? 'Retry check-in' : 'Try again'}
        onClose={() => {
          setModal(null);
          setReady(false);
          employeeTemplates.current = [];
        }}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6FBF8' },
  form: { padding: 24, paddingTop: 56 },
  title: { fontSize: 28, color: '#153C2D', fontWeight: '800' },
  description: { color: '#476452', lineHeight: 22, marginVertical: 16 },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07583C',
    borderRadius: 10,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  back: { alignItems: 'center', padding: 16 },
});
export default FaceCheckInTestScreen;
