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
import {useFocusEffect} from '@react-navigation/native';
import {getRegisteredBiometric} from '../../services/biometricApi';
import {decodeBackendEmbedding} from '../../services/backendFaceService';
import {getBiometricEmployeeId, getBiometricCompanyId} from '../../utils/backendIdentity';
import { ROUTES } from '../../constants/routes';
import { useAdminSession } from '../../context/AdminSessionContext';
import {
  fetchEmployeeDetails,
  getFilteredEmployees,
} from '../../services/employeeRegistrationApi';

const RegisterScreen = ({ navigation }) => {
  const { companyId, operatorId, isSessionLoading } = useAdminSession();
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

  const [faceStatus, setFaceStatus] = useState('loading');
  const [faceStatusError, setFaceStatusError] = useState('');
  const biometricCompanyId = employee?.childCompanyId || employee?.employeeBiomatricDetail?.companyId || companyId;
  const selectedBackendId = employee?.employeeBiomatricDetail?.employeeId || employee?.id;
  useFocusEffect(React.useCallback(() => {
    let active = true;
    setFaceStatus('loading');
    setFaceStatusError('');
    if (!employee) return;
    if (!selectedBackendId) { setFaceStatus('error'); setFaceStatusError('Employee biometric ID is missing.'); return; }
    getRegisteredBiometric(selectedBackendId, biometricCompanyId).then(record => {
      if (!active) return;
      if (!record?.faceEmbeding || !record?.faceImage) { setFaceStatus('missing'); return; }
      try { decodeBackendEmbedding(record.faceEmbeding); setFaceStatus('registered'); }
      catch { setFaceStatus('missing'); }
    }).catch(requestError => {
      if (active) { setFaceStatus('error'); setFaceStatusError(requestError.message); }
    });
    return () => { active = false; };
  }, [selectedBackendId, biometricCompanyId, employee]));

  const openRegistration = () => {
    try {
      getBiometricEmployeeId(employee);
      navigation.navigate(ROUTES.FACE_CAMERA, {
        employeeId: selectedBackendId, employeeName: employee.employeeName || '',
        companyId: getBiometricCompanyId(employee, companyId), sessionCompanyId: companyId, modifiedBy: operatorId ?? null,
      });
    } catch (identityError) { setError(identityError.message); }
  };
  const needsRegistration = faceStatus !== 'registered';

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
                Record ID: {employee.id || '—'}
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

              {!!faceStatusError && <><Text style={styles.error}>{faceStatusError}</Text><Pressable accessibilityRole="button" onPress={() => setEmployee(value => ({...value}))}><Text style={styles.value}>Retry registration status</Text></Pressable></>}
              <View style={styles.faceRegisterRow}>
                <View style={styles.faceRegisterInfo}>
                  <Text style={styles.faceRegisterTitle}>
                    Face Registration
                  </Text>
                  <Text style={styles.faceRegisterSubtitle}>
                    {needsRegistration
                      ? faceStatus === 'loading' ? 'Checking registration…' : faceStatus === 'error' ? 'Unable to check registration' : 'Face registration required'
                      : 'Face registered successfully'}
                  </Text>
                </View>

                {needsRegistration ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Register face for ${
                      employee.employeeName || employee.employeeId
                    }`}
                    onPress={openRegistration}
                    disabled={faceStatus === 'loading' || faceStatus === 'error'}
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
