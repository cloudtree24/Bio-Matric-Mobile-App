// @refresh reset
// Remount on Fast Refresh so changes to hooks cannot reuse incompatible state.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';
import { ROUTES } from '../../constants/routes';
import { useAdminSession } from '../../context/AdminSessionContext';
import {
  fetchEmployeeDetails,
  getFilteredEmployees,
} from '../../services/employeeRegistrationApi';

const RegisterScreen = ({ navigation }) => {
  const { companyId, isSessionLoading } = useAdminSession();
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const [suggestionEmployees, setSuggestionEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [suggestionsError, setSuggestionsError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const historyWrites = useRef(Promise.resolve());
  const historyKey = `@hems/employee-search-history/${companyId}`;

  useEffect(() => {
    let active = true;
    setSuggestionEmployees([]);
    setHistory([]);
    setHistoryReady(false);
    setHistoryError('');
    setSuggestionsError('');
    setShowSuggestions(false);
    if (!companyId) return;
    historyWrites.current
      .then(() => AsyncStorage.getItem(historyKey))
      .then(value => {
        if (!active) return;
        const saved = value ? JSON.parse(value) : [];
        setHistory(
          Array.isArray(saved)
            ? saved.filter(item => typeof item === 'string')
            : [],
        );
      })
      .catch(() => {
        if (active) setHistoryError('Unable to load search history.');
      })
      .finally(() => {
        if (active) setHistoryReady(true);
      });
    getFilteredEmployees(companyId, 0, 0, 0, 0)
      .then(items => {
        if (active)
          setSuggestionEmployees(items.filter(item => item?.employeeId));
      })
      .catch(() => {
        if (active)
          setSuggestionsError(
            'Suggestions unavailable. You can still search by employee ID.',
          );
      });
    return () => {
      active = false;
    };
  }, [companyId, historyKey]);

  const query = employeeId.trim().toLowerCase();
  const suggestions = query
    ? suggestionEmployees
        .filter(
          item =>
            String(item.employeeId).toLowerCase().includes(query) ||
            String(item.employeeName || '')
              .toLowerCase()
              .includes(query),
        )
        .slice(0, 6)
    : [];

  useEffect(() => {
    setEmployeeId('');
    setEmployee(null);
    setError('');
    setLoading(false);
    requestVersion.current += 1;
    return () => {
      requestVersion.current += 1;
    };
  }, [companyId]);

  const changeEmployeeId = value => {
    setShowSuggestions(true);
    requestVersion.current += 1;
    setEmployeeId(value);
    setEmployee(null);
    setError('');
    setLoading(false);
  };

  const searchEmployee = async (selectedInput = employeeId) => {
    if (!companyId || isSessionLoading || loading || !historyReady) return;
    const input = selectedInput.trim();
    setEmployee(null);
    if (!input) {
      setError('Please enter an employee ID.');
      return;
    }
    setEmployeeId(input);
    setShowSuggestions(false);
    const nextHistory = [
      input,
      ...history.filter(item => item !== input),
    ].slice(0, 20);
    setHistory(nextHistory);
    setHistoryError('');
    const version = ++requestVersion.current;
    historyWrites.current = historyWrites.current
      .then(() => AsyncStorage.setItem(historyKey, JSON.stringify(nextHistory)))
      .catch(() => {
        if (version === requestVersion.current)
          setHistoryError('Unable to save search history.');
      });
    setLoading(true);
    setError('');
    try {
      const employees = await fetchEmployeeDetails(companyId, input);
      if (version !== requestVersion.current) return;
      if (employees.length === 0) {
        setError('Employee not found. Check the employee ID and try again.');
      } else if (employees.length !== 1 || !employees[0]?.employeeId) {
        setError(
          'Unable to identify a single employee from the server response.',
        );
      } else {
        setEmployee(employees[0]);
      }
    } catch (requestError) {
      if (version === requestVersion.current) setError(requestError.message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  
// const Registerface = async (employeeId, companyId) => {
//   try {
//     console.log('Register Face Clicked');

//     console.log('Employee ID:', employeeId);
//     console.log('Company ID:', companyId);
//   } catch (error) {
//     console.log('Register Face Error:', error);
//   }
// };




const Registerface = async (
  employeeId,
  companyId,
  faceImageBase64,
  faceEmbeddingBase64,
  modifiedBy,
) => {
  try {
    console.log('Register Face API Started');

    if (!faceImageBase64 || !faceEmbeddingBase64) {
      Alert.alert(
        'Face Registration',
        'Face image or face embedding is missing.',
      );
      return;
    }

    // Remove Base64 data URI prefix if present
    const cleanFaceImage = faceImageBase64.replace(
      /^data:image\/\w+;base64,/,
      '',
    );

    const payload = {
      EmployeeId: Number(employeeId),
      FaceImage: cleanFaceImage,
      FaceEmbeding: faceEmbeddingBase64,
      FingerImage: null,
      FingerEmbeding: null,
      RetinaImage: null,
      RetinaEmbeding: null,
      VoiceRecord: null,
      VoiceRecordEmbeding: null,
      CreatedDate: new Date().toISOString(),
      ModifiedBy: Number(modifiedBy),
      IsDelete: 0,
      CompanyId: Number(companyId),
    };

    const response = await fetch(
      'http://192.168.29.2:91/api/EmployeeBiomatricRegister/SaveEmployeeImageStringFormat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    console.log('Face Registration Response:', result);

    if (!response.ok) {
      throw new Error(result?.message || 'Face registration failed');
    }

    Alert.alert('Success', 'Employee face registered successfully.');
  } catch (error) {
    console.log('Register Face Error:', error);

    Alert.alert('Error', error.message || 'Unable to register face.');
  }
};



  // const handleRegisterFace = useCallback(async () => {
  //   logger.debug('👤 ========== FACE REGISTRATION START ==========');

  //   if (registrationRef.current) return;
  //   const attempt = { active: true };
  //   registrationRef.current = attempt;
  //   const current = () =>
  //     homeMountedRef.current &&
  //     registrationRef.current === attempt &&
  //     attempt.active;
  //   let timeoutId;
  //   try {
  //     if (!(await requestCameraPermission())) {
  //       if (current())
  //         showError(
  //           'Permission Denied',
  //           'Camera access required for face registration',
  //         );
  //       return;
  //     }
  //     if (!current() || !(await loadFaceModel()) || !current()) return;
  //     const resolvedCompanyId =
  //       employeeDetails?.childCompanyId || user?.childCompanyId;
  //     if (!employeeDetails?.id || !resolvedCompanyId) {
  //       showError('Error', 'Employee or company details unavailable.');
  //       return;
  //     }
  //     dispatchModal({ type: 'SHOW', key: 'isRegistering' });
  //     const imagePickerModule = require('react-native-image-picker');
  //     const pickerLaunchCamera =
  //       imagePickerModule?.launchCamera ||
  //       imagePickerModule?.default?.launchCamera;
  //     if (typeof pickerLaunchCamera !== 'function') {
  //       throw new Error(
  //         'Camera module is unavailable. Please restart the app and try again.',
  //       );
  //     }
  //     const res = await new Promise(resolve =>
  //       pickerLaunchCamera(
  //         {
  //           mediaType: 'photo',
  //           includeBase64: true,
  //           cameraType: 'front',
  //           quality: APP_CONFIG.IMAGE.RESIZE_QUALITY,
  //           maxWidth: APP_CONFIG.IMAGE.RESIZE_WIDTH,
  //           maxHeight: APP_CONFIG.IMAGE.RESIZE_HEIGHT,
  //         },
  //         resolve,
  //       ),
  //     );
  //     if (!current() || res.didCancel) return;
  //     if (!res.assets?.[0]?.base64) {
  //       showError('Error', 'No image captured');
  //       return;
  //     }

  //     dispatchModal({ type: 'SHOW', key: 'isProcessing' });
  //     const base64Image = `data:image/jpeg;base64,${res.assets[0].base64}`;

  //     const emb = await Promise.race([
  //       getEmbedding(base64Image),
  //       new Promise((_, reject) => {
  //         timeoutId = setTimeout(() => {
  //           attempt.active = false;
  //           reject(
  //             new Error('Face processing took too long. Please try again.'),
  //           );
  //         }, APP_CONFIG.TIMEOUTS.IMAGE_PROCESSING);
  //       }),
  //     ]);
  //     clearTimeout(timeoutId);
  //     if (!current()) return;

  //     if (!emb) throw new Error('Failed to get embedding');

  //     const embeddingBase64 = Buffer.from(
  //       new Float32Array(emb).buffer,
  //     ).toString('base64');

  //     const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  //     logger.debug('💾 ========== FACE REGISTRATION PAYLOAD ==========', {
  //       employeeId: employeeDetails.id,
  //       companyId: resolvedCompanyId,
  //       faceBytes: pureBase64?.length || 0,
  //       embeddingBytes: embeddingBase64?.length || 0,
  //     });

  //     const payload = {
  //       ...buildBiometricRegistrationPayload(
  //         employeeDetails,
  //         pureBase64,
  //         embeddingBase64,
  //         null,
  //       ),
  //       CompanyId: resolvedCompanyId,
  //     };

  //     // console.log(payload , 'biometric registration payload');

  //     await ApiService.saveBiometricRegistration(payload);

  //     if (!current()) return;

  //     const enablePayload = {
  //       EmployeeId: employeeDetails.id,
  //       IsFaceAuthunticateEnable: 'true',
  //       IsFingerAuthenticateEnable: 'false',
  //       CreatedDate: new Date().toISOString(),
  //       CreatedBy: employeeDetails.id,
  //       ModifiedDate: new Date().toISOString(),
  //       ModifiedBy: employeeDetails.id,
  //     };

  //     await ApiService.updateBiometricEnableStatus(enablePayload);
  //     if (!current()) return;

  //     await AsyncStorage.multiSet([
  //       [STORAGE_KEYS.FACE_ENABLED, 'true'],
  //       [STORAGE_KEYS.FINGERPRINT_ENABLED, 'false'],
  //       [STORAGE_KEYS.BIOMETRIC_TYPE, 'face'],
  //     ]);

  //     if (!current()) return;

  //     dispatchBiometric({
  //       payload: {
  //         registeredFace: base64Image,
  //         cachedFaceImage: base64Image,
  //         biometricType: 'face',
  //         isBiometricEnabled: true,
  //       },
  //     });

  //     dispatchModal({ type: 'HIDE', key: 'showRegistration' });
  //     showError('✅ Success', 'Face registered successfully!');
  //   } catch (err) {
  //     if (homeMountedRef.current && registrationRef.current === attempt) {
  //       logger.error('Register face error:', err);
  //       showError('❌ Error', err.message || 'Failed to register face');
  //     }
  //   } finally {
  //     if (timeoutId) clearTimeout(timeoutId);
  //     if (registrationRef.current === attempt) {
  //       registrationRef.current = null;
  //       attempt.active = false;
  //       if (homeMountedRef.current) {
  //         faceScanCallbacksRef.current = { resolve: null, reject: null };
  //         dispatchModal({ type: 'HIDE', key: 'showFaceScanCamera' });
  //         dispatchModal({ type: 'RESET_LOADING' });
  //       }
  //     }
  //   }
  // }, [
  //   requestCameraPermission,
  //   loadFaceModel,
  //   getEmbedding,
  //   employeeDetails,
  //   user?.childCompanyId,
  //   showError,
  // ]);





  const needsRegistration =
    employee &&
    (!String(employee.employeeBiomatricDetail?.faceImage || '').trim() ||
      !String(employee.employeeBiomatricDetail?.faceEmbeding || '').trim());

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={20} color="#07583C" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Register Biomatric</Text>
        {!isSessionLoading && !companyId && (
          <Text style={styles.error}>
            Company ID is unavailable. Please log in again.
          </Text>
        )}
        <View style={styles.card}>
          <Text style={styles.label}>Employee ID *</Text>
          <TextInput
            accessibilityLabel="Employee ID"
            placeholder="Enter employee ID"
            placeholderTextColor="#89978F"
            value={employeeId}
            onChangeText={changeEmployeeId}
            editable={!!companyId && !isSessionLoading}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => searchEmployee()}
            onFocus={() => setShowSuggestions(true)}
            style={styles.input}
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.label}>Matching employees</Text>
              {suggestions.map(item => (
                <Pressable
                  key={String(item.id ?? item.employeeId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select employee ${item.employeeId}`}
                  disabled={loading || !historyReady}
                  onPress={() => searchEmployee(String(item.employeeId))}
                  style={styles.suggestion}
                >
                  <Text style={styles.value}>
                    {item.employeeId} - {item.employeeName || '—'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {!!suggestionsError && (
            <Text style={styles.value}>{suggestionsError}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search employee"
            disabled={
              !companyId || isSessionLoading || loading || !historyReady
            }
            onPress={() => searchEmployee()}
            style={[
              styles.button,
              styles.searchButton,
              (!companyId || isSessionLoading || loading || !historyReady) &&
                styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Search</Text>
            )}
          </Pressable>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {!!historyError && <Text style={styles.error}>{historyError}</Text>}
          {history.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.label}>Recent searches</Text>
              {history.map(item => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Search employee ${item}`}
                  disabled={loading || !historyReady}
                  onPress={() => searchEmployee(item)}
                  style={styles.suggestion}
                >
                  <Text style={styles.value}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {employee && (
            <View style={styles.employee}>
              <Text style={styles.employeeName}>
                {employee.employeeName || '—'}
              </Text>

              <Text style={styles.value}>
                Employee ID: {employee.id || '—'}
              </Text>

              <Text style={styles.value}>
                Employee ID: {employee.employeeId || '—'}
              </Text>
              <Text style={styles.value}>
                Department: {employee.departmentName || '—'}
              </Text>
              <Text style={styles.value}>
                Designation: {employee.designationName || '—'}
              </Text>

              <View style={styles.faceRegisterRow}>
                <View style={styles.faceRegisterInfo}>
                  <Text style={styles.faceRegisterTitle}>
                    Face Registration
                  </Text>
                  <Text style={styles.faceRegisterSubtitle}>
                    {needsRegistration
                      ? 'Face verification not Register'
                      : 'Face registered successfully'}
                  </Text>
                </View>

                {needsRegistration ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Register face for ${
                      employee.employeeName || employee.employeeId
                    }`}
                    onPress={() => Registerface(employee.employeeId, companyId)}
                    style={styles.registerFaceButton}
                  >
                    <Text style={styles.registerFaceButtonText}>Register</Text>
                  </Pressable>
                ) : (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredBadgeText}>✓ Registered</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBF8' },
  content: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 16,
  },
  backText: { color: '#07583C', fontSize: 13 },
  title: { color: '#0A3425', fontSize: 25, fontWeight: '800', marginBottom: 5 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFEEE5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 10,
  },
  employee: { borderTopWidth: 1, borderColor: '#DFEEE5', paddingTop: 12 },
  employeeName: { color: '#153C2D', fontWeight: '700', marginBottom: 4 },
  value: { color: '#344D40', marginVertical: 2 },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#07583C',
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  error: { color: '#B42318', marginTop: 8 },
  label: { color: '#344D40', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E3DA',
    backgroundColor: '#FAFCFA',
    color: '#153C2D',
    fontSize: 14,
  },
  searchButton: { marginBottom: 16, minWidth: 90, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  suggestions: { marginVertical: 12 },
  suggestion: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderColor: '#DFEEE5',
    paddingVertical: 8,
  },

  faceRegisterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },

  faceRegisterInfo: {
    flex: 1,
    marginRight: 10,
  },

  faceRegisterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },

  faceRegisterSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  registerFaceButton: {
    backgroundColor: '#153C2D',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  registerFaceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  registeredBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },

  registeredBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
});
export default RegisterScreen;
