import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';

import AppHeader from '../../components/AppHeader';
import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {useFaceRegistration} from '../../hooks/useFaceRegistration';

const EnrollmentIdentityScreen = ({navigation}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const {checkFaceAccess} = useFaceRegistration();

  const continueToCamera = useCallback(async () => {
    const nextEmployeeId = employeeId.trim();
    const nextCompanyId = companyId.trim();
    if (!nextEmployeeId || !nextCompanyId) {
      setError('Enter both Employee ID and Company ID.');
      return;
    }

    setError('');
    setIsChecking(true);
    try {
      await checkFaceAccess({employeeId: nextEmployeeId, companyId: nextCompanyId});
      navigation.navigate(ROUTES.FACE_CAMERA, {companyId: nextCompanyId, employeeId: nextEmployeeId});
    } catch (requestError) {
      setError(requestError?.message || 'Could not verify face-registration access.');
    } finally {
      setIsChecking(false);
    }
  }, [checkFaceAccess, companyId, employeeId, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <View style={styles.content}>
        <Text style={styles.title}>Face registration</Text>
        <Text style={styles.description}>Enter Employee ID and Company ID. This test registration stays on this device.</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} editable={!isChecking} onChangeText={setEmployeeId} placeholder="Employee ID" placeholderTextColor="#6B7280" style={styles.input} value={employeeId} />
        <TextInput autoCapitalize="none" autoCorrect={false} editable={!isChecking} onChangeText={setCompanyId} placeholder="Company ID" placeholderTextColor="#6B7280" style={styles.input} value={companyId} />
        {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={isChecking} onPress={continueToCamera} style={[styles.button, isChecking && styles.buttonDisabled]}>
          {isChecking ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  button: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 10, marginTop: 10, minHeight: 50, justifyContent: 'center'},
  buttonDisabled: {opacity: 0.7},
  buttonText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
  content: {flex: 1, padding: 24, paddingTop: 48},
  description: {color: '#476452', fontSize: 15, lineHeight: 22, marginBottom: 26, marginTop: 8},
  error: {color: '#B42318', fontSize: 14, marginBottom: 14},
  input: {backgroundColor: COLORS.white, borderColor: COLORS.primary, borderRadius: 10, borderWidth: 1, color: COLORS.darkGreen, fontSize: 16, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 13},
  safeArea: {backgroundColor: COLORS.lightGreen, flex: 1},
  title: {color: COLORS.darkGreen, fontSize: 28, fontWeight: '800'},
});

export default EnrollmentIdentityScreen;
