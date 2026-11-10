import React, {useEffect, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/AppHeader';
import AssignmentField from '../../components/AssignmentField';
import {ROUTES} from '../../constants/routes';
import {useAdminSession} from '../../context/AdminSessionContext';
import {getFilteredEmployees} from '../../services/employeeRegistrationApi';

const RegisterScreen = ({navigation}) => {
  const {companyId, isSessionLoading} = useAdminSession();
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setEmployees([]);
    setSelectedId(null);
    if (!companyId) return;
    let active = true;
    setLoading(true);
    setError('');
    getFilteredEmployees(companyId, 0, 0, 0, 0)
      .then(data => { if (active) setEmployees(data); })
      .catch(requestError => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [companyId, retry]);

  const employee = employees.find(item => String(item.id) === selectedId);
  const items = employees.filter(item => item.id != null && item.employeeId).map(item => ({
    value: String(item.id),
    label: item.employeeName ? `${item.employeeId} - ${item.employeeName}` : String(item.employeeId),
  }));
  const needsRegistration = employee && (
    !String(employee.employeeBiomatricDetail?.faceImage || '').trim() ||
    !String(employee.employeeBiomatricDetail?.faceEmbeding || '').trim()
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={20} color="#07583C" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Register Biomatric</Text>
        {!isSessionLoading && !companyId && <Text style={styles.error}>Company ID is unavailable. Please log in again.</Text>}
        <View style={styles.card}>
          <AssignmentField label="Employee ID" required items={items} value={selectedId} loading={loading} disabled={!companyId} onValueChange={setSelectedId} />
          {!!error && <>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.retry}>Retry</Text></Pressable>
          </>}
          {!loading && !error && !!companyId && items.length === 0 && <Text style={styles.value}>No employees found.</Text>}
          {employee && <View style={styles.employee}>
            <Text style={styles.employeeName}>{employee.employeeName || '—'}</Text>
            <Text style={styles.value}>ID: {employee.id ?? '—'}</Text>
            <Text style={styles.value}>Employee ID: {employee.employeeId || '—'}</Text>
            {needsRegistration ? <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Register face for ${employee.employeeName || employee.employeeId}`}
              onPress={() => navigation.navigate(ROUTES.ENROLLMENT_IDENTITY, {
                employeeId: String(employee.employeeId),
                employeeName: employee.employeeName || '',
                companyId: String(companyId),
              })}
              style={styles.button}>
              <Text style={styles.buttonText}>Register</Text>
            </Pressable> : <Text style={styles.value}>Face data available</Text>}
          </View>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6FBF8'},
  content: {flexGrow: 1, padding: 18, paddingBottom: 40, width: '100%', maxWidth: 600, alignSelf: 'center'},
  backButton: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 16},
  backText: {color: '#07583C', fontSize: 13},
  title: {color: '#0A3425', fontSize: 25, fontWeight: '800', marginBottom: 5},
  card: {backgroundColor: '#FFFFFF', borderColor: '#DFEEE5', borderRadius: 18, borderWidth: 1, padding: 18, marginTop: 10},
  employee: {borderTopWidth: 1, borderColor: '#DFEEE5', paddingTop: 12},
  employeeName: {color: '#153C2D', fontWeight: '700', marginBottom: 4},
  value: {color: '#344D40', marginVertical: 2},
  button: {alignSelf: 'flex-start', backgroundColor: '#07583C', borderRadius: 9, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  error: {color: '#B42318', marginTop: 8},
  retry: {color: '#07583C', fontWeight: '700', marginTop: 8},
});
export default RegisterScreen;
