import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/AppHeader';
import AssignmentField from '../../components/AssignmentField';
import CheckInCard from '../../components/CheckInCard';
import { ROUTES } from '../../constants/routes';
import { useAdminSession } from '../../context/AdminSessionContext';
import {
  getBranches,
  getDepartments,
  getDesignations,
  getEmployeeTypes,
  getFilteredEmployees,
} from '../../services/employeeRegistrationApi';

// API installations may use different casing for their master-table columns.
const options = (records, ids, labels) =>
  records
    .map(record => {
      const find = keys => {
        const key = Object.keys(record).find(k =>
          keys.some(candidate => candidate.toLowerCase() === k.toLowerCase()),
        );
        return key == null ? null : record[key];
      };
      const value = find(ids);
      const label = find(labels);
      return value != null && label != null
        ? { value: String(value), label: String(label) }
        : null;
    })
    .filter(Boolean);
const labelFor = (items, value) =>
  items.find(item => item.value === value)?.label || 'All';

const RegisterScreen = ({ navigation }) => {
  const { companyId, isSessionLoading } = useAdminSession();
  const [types, setTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [type, setType] = useState(null);
  const [branch, setBranch] = useState(null);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    const load = async (key, fetcher, setter, ids, labels) => {
      setLoading(prev => ({ ...prev, [key]: true }));
      setErrors(prev => ({ ...prev, [key]: null }));
      try {
        const data = await fetcher();
        if (active) {
          const mapped = options(data, ids, labels);
          if (data.length && !mapped.length)
            throw new Error('The server returned unrecognized filter fields.');
          setter(mapped);
        }
      } catch (error) {
        if (active) setErrors(prev => ({ ...prev, [key]: error.message }));
      } finally {
        if (active) setLoading(prev => ({ ...prev, [key]: false }));
      }
    };
    load(
      'types',
      () => getEmployeeTypes(companyId),
      setTypes,
      ['id', 'employeeTypeId', 'empTypeId'],
      ['employeeType', 'employeeTypeName', 'typeName', 'name'],
    );
    load(
      'branches',
      () => getBranches(companyId),
      setBranches,
      ['id', 'branchId'],
      ['branchName', 'name'],
    );
    return () => {
      active = false;
    };
  }, [companyId, retry]);

  useEffect(() => {
    setDepartments([]);
    setErrors(prev => ({ ...prev, departments: null }));
    if (!companyId || !branch) {
      setLoading(prev => ({ ...prev, departments: false }));
      return;
    }
    let active = true;
    setLoading(prev => ({ ...prev, departments: true }));
    setErrors(prev => ({ ...prev, departments: null }));
    getDepartments(companyId, branch)
      .then(data => {
        if (!active) return;
        const mapped = options(
          data,
          ['id', 'departmentId', 'deptId'],
          ['departmentName', 'deptName', 'name'],
        );
        if (data.length && !mapped.length)
          throw new Error(
            'The server returned unrecognized department fields.',
          );
        setDepartments(mapped);
      })
      .catch(error => {
        if (active)
          setErrors(prev => ({ ...prev, departments: error.message }));
      })
      .finally(() => {
        if (active) setLoading(prev => ({ ...prev, departments: false }));
      });
    return () => {
      active = false;
    };
  }, [companyId, branch, retry]);

  useEffect(() => {
    setDesignations([]);
    setErrors(prev => ({ ...prev, designations: null }));
    if (!department) {
      setLoading(prev => ({ ...prev, designations: false }));
      return;
    }
    let active = true;
    setLoading(prev => ({ ...prev, designations: true }));
    setErrors(prev => ({ ...prev, designations: null }));
    getDesignations(department)
      .then(data => {
        if (!active) return;
        const mapped = options(
          data,
          ['id', 'designationId', 'designtionId'],
          ['designationName', 'designtionName', 'name'],
        );
        if (data.length && !mapped.length)
          throw new Error(
            'The server returned unrecognized designation fields.',
          );
        setDesignations(mapped);
      })
      .catch(error => {
        if (active)
          setErrors(prev => ({ ...prev, designations: error.message }));
      })
      .finally(() => {
        if (active) setLoading(prev => ({ ...prev, designations: false }));
      });
    return () => {
      active = false;
    };
  }, [department, retry]);

  useEffect(() => {
    setEmployees([]);
    setErrors(prev => ({ ...prev, employees: null }));
    if (!companyId || !type || !branch) {
      setLoading(prev => ({ ...prev, employees: false }));
      return;
    }
    let active = true;
    setLoading(prev => ({ ...prev, employees: true }));
    setErrors(prev => ({ ...prev, employees: null }));
    getFilteredEmployees(
      companyId,
      type,
      branch,
      department || 0,
      designation || 0,
    )
      .then(data => {
        if (active) setEmployees(data);
      })
      .catch(error => {
        if (active) setErrors(prev => ({ ...prev, employees: error.message }));
      })
      .finally(() => {
        if (active) setLoading(prev => ({ ...prev, employees: false }));
      });
    return () => {
      active = false;
    };
  }, [companyId, type, branch, department, designation, retry]);

  const errorEntries = Object.entries(errors).filter(([, message]) => message);
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={20} color="#07583C" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Register employees</Text>
        {!isSessionLoading && !companyId ? (
          <Text style={styles.error}>
            Company ID is unavailable. Please log in again.
          </Text>
        ) : null}
        <View style={styles.card}>
          <AssignmentField
            label="Employee Type"
            required
            items={types}
            value={type}
            loading={loading.types}
            disabled={!companyId}
            onValueChange={setType}
          />
          <AssignmentField
            label="Branch"
            required
            items={branches}
            value={branch}
            loading={loading.branches}
            disabled={!companyId}
            onValueChange={value => {
              setBranch(value);
              setDepartment(null);
              setDesignation(null);
            }}
          />
          <AssignmentField
            label="Department"
            items={departments}
            value={department}
            loading={loading.departments}
            disabled={!branch}
            onValueChange={value => {
              setDepartment(value);
              setDesignation(null);
            }}
          />
          <AssignmentField
            label="Designation"
            items={designations}
            value={designation}
            loading={loading.designations}
            disabled={!department}
            onValueChange={setDesignation}
          />
          {type && branch ? (
            <View style={styles.summary}>
              {[
                ['Employee Type', labelFor(types, type)],
                ['Branch', labelFor(branches, branch)],
                ['Department', labelFor(departments, department)],
                ['Designation', labelFor(designations, designation)],
              ].map(([name, value]) => (
                <View key={name} style={styles.row}>
                  <Text style={styles.rowLabel}>{name}</Text>
                  <Text style={styles.rowValue}>{value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !type || !branch }}
            disabled={!type || !branch}
            onPress={() => setVisible(true)}
            style={[styles.button, (!type || !branch) && styles.disabled]}
          >
            <Text style={styles.buttonText}>View Employee</Text>
          </Pressable>
          {errorEntries.map(([key, message]) => (
            <Text key={key} style={styles.error}>
              {key}: {message}
            </Text>
          ))}
          {errorEntries.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetry(value => value + 1)}
            >
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          )}
        </View>
        {visible && type && branch ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Employees</Text>
            {loading.employees ? (
              <ActivityIndicator color="#07583C" />
            ) : !errors.employees && employees.length === 0 ? (
              <Text style={styles.value}>No employees found.</Text>
            ) : (
              employees.map(employee => (
                <View key={String(employee.id)} style={styles.employee}>
                  <Text style={styles.employeeName}>
                    {employee.employeeName || '—'}
                  </Text>
                  <Text style={styles.value}>ID: {employee.id ?? '—'}</Text>
                  <Text style={styles.value}>
                    Employee ID: {employee.employeeId || '—'}
                  </Text>
                  <Text style={styles.value}>
                    Face image:{' '}
                    {employee.employeeBiomatricDetail?.faceImage ??
                      'Not available'}
                  </Text>
                  <Text style={styles.value}>
                    Face embedding:{' '}
                    {employee.employeeBiomatricDetail?.faceEmbeding ??
                      'Not available'}
                  </Text>
                  {(!String(employee.employeeBiomatricDetail?.faceImage || '').trim() ||
                    !String(employee.employeeBiomatricDetail?.faceEmbeding || '').trim()) && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Register face for ${employee.employeeName || employee.employeeId}`}
                      onPress={() => navigation.navigate(ROUTES.ENROLLMENT_IDENTITY, {
                        employeeId: String(employee.employeeId || ''),
                        employeeName: employee.employeeName || '',
                        companyId: String(companyId),
                      })}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>Register</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Already registered?</Text>
        <CheckInCard
          accessibilityLabel="Face Check-In Test"
          onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)}
        />
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
  summary: { borderTopWidth: 1, borderColor: '#DFEEE5', marginBottom: 14 },
  row: { flexDirection: 'row', paddingVertical: 6 },
  rowLabel: { color: '#344D40', fontWeight: '700', flex: 1 },
  rowValue: { color: '#344D40', flex: 1 },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#07583C',
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  sectionTitle: {
    color: '#426050',
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 12,
  },
  employee: { borderTopWidth: 1, borderColor: '#DFEEE5', paddingVertical: 12 },
  employeeName: { color: '#153C2D', fontWeight: '700', marginBottom: 4 },
  value: { color: '#344D40', marginVertical: 2 },
  error: { color: '#B42318', marginTop: 8 },
  retry: { color: '#07583C', fontWeight: '700', marginTop: 8 },
});
export default RegisterScreen;
