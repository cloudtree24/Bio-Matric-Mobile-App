// @refresh reset
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import FaceCamera from '../../components/FaceCamera';
import FaceStatusModal from '../../components/FaceStatusModal';
import { useAdminSession } from '../../context/AdminSessionContext';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import faceRecognitionService from '../../services/faceRecognitionService';
import {
  getCompanyPhoneNumbers,
  getFaceTemplatesByPhone,
} from '../../services/biometricApi';
import { requireBackendId } from '../../utils/backendIdentity';
import { matchEmployeeFace } from '../../services/faceMatchingService';
import { createFaceCheckInController } from '../../services/faceCheckInService';
import {buildFaceAttendancePayload} from '../../services/attendanceApi';
import {ROUTES} from '../../constants/routes';

const FaceCheckInTestScreen = ({ navigation }) => {
  const { companyId, isSessionLoading } = useAdminSession();
  const focused = useIsFocused();
  const { cameraPermissionStatus, requestCameraPermission } = useCameraPermission();
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [suggestionStatus, setSuggestionStatus] = useState('idle');
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

  useEffect(() => {
    let activeRequest = true;
    setPhoneNumbers([]);
    if (!companyId || isSessionLoading) {
      setSuggestionStatus('idle');
      return undefined;
    }
    setSuggestionStatus('loading');
    getCompanyPhoneNumbers(companyId)
      .then(numbers => {
        if (activeRequest) {
          setPhoneNumbers(numbers);
          setSuggestionStatus('ready');
        }
      })
      .catch(() => {
        // Suggestions are optional, so allow manual verification to continue.
        if (activeRequest) setSuggestionStatus('error');
      });
    return () => {
      activeRequest = false;
    };
  }, [companyId, isSessionLoading]);

  const phoneSuggestions = phoneNumber
    ? phoneNumbers.filter(number => number.startsWith(phoneNumber)).slice(0, 5)
    : [];

  const startVerification = useCallback(async () => {
    if (preparingRef.current || !active.current || isSessionLoading) return;
    const enteredPhoneNumber = phoneNumber.trim();
    if (!enteredPhoneNumber) {
      setModal({
        title: 'Phone number required',
        message: 'Enter your registered phone number before face verification.',
      });
      return;
    }
    if (enteredPhoneNumber.length !== 10) {
      setModal({
        title: 'Invalid phone number',
        message: 'Enter the 10-digit mobile number after +91.',
      });
      return;
    }
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
      const templates = await getFaceTemplatesByPhone(
        biometricCompanyId,
        enteredPhoneNumber,
      );
      if (!current()) return;
      if (!templates.length) {
        setModal({
          title: 'No registered face found',
          message:
            'No active face registration matches this phone number. Check the number or ask your administrator for help.',
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
    phoneNumber,
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
            Enter your registered phone number, then verify your face before
            saving check-in.
          </Text>
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.phoneField}>
            <View accessible accessibilityLabel="Country code +91" style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              accessibilityLabel="Phone number"
              placeholder="Enter 10-digit number"
              placeholderTextColor="#89978F"
              value={phoneNumber}
              onChangeText={value => setPhoneNumber(value.replace(/\D/g, '').slice(0, 10))}
              editable={!preparing && !isSessionLoading}
              keyboardType="phone-pad"
              autoCorrect={false}
              maxLength={10}
              style={styles.phoneInput}
            />
          </View>
          {phoneSuggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Matching contact numbers</Text>
              {phoneSuggestions.map(number => (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  accessibilityLabel={`Use phone number ${number}`}
                  onPress={() => setPhoneNumber(number)}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>+91 {number}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {phoneNumber.length > 0 && suggestionStatus === 'loading' && (
            <Text style={styles.suggestionStatus}>Loading registered numbers…</Text>
          )}
          {phoneNumber.length > 0 && suggestionStatus === 'ready' &&
            phoneSuggestions.length === 0 && (
              <Text style={styles.suggestionStatus}>
                No registered number starts with these digits. You can still enter the full number manually.
              </Text>
            )}
          {phoneNumber.length > 0 && suggestionStatus === 'error' && (
            <Text style={styles.suggestionStatus}>
              Registered number suggestions could not be loaded. Enter the full number manually.
            </Text>
          )}
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
  label: {color: '#344D40', fontSize: 13, fontWeight: '700', marginBottom: 8},
  phoneField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E3DA',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  countryCode: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#D6E3DA',
    backgroundColor: '#F4F8F5',
    borderTopLeftRadius: 7,
    borderBottomLeftRadius: 7,
  },
  countryCodeText: {color: '#153C2D', fontWeight: '700'},
  phoneInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    color: '#153C2D',
  },
  suggestions: {
    marginTop: -4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DFEEE5',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  suggestionsLabel: {
    color: '#476452',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  suggestion: {paddingHorizontal: 12, paddingVertical: 11},
  suggestionText: {color: '#153C2D'},
  suggestionStatus: {color: '#476452', fontSize: 12, lineHeight: 18, marginBottom: 12},
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

