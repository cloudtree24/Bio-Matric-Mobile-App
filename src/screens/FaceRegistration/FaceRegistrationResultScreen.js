import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';

import AppHeader from '../../components/AppHeader';
import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {useFaceRegistration} from '../../hooks/useFaceRegistration';

const copy = {
  activationPending: {description: 'Your face was saved, but attendance activation is pending. You can safely retry activation.', title: 'Activation pending'},
  failure: {description: 'Face registration was not completed. You can start again.', title: 'Registration failed'},
  success: {description: 'Your face has been saved on this device and is ready for local matching.', title: 'Face registered'},
};

const FaceRegistrationResultScreen = ({navigation, route}) => {
  const {companyId, employeeId, message, status = 'failure'} = route.params || {};
  const [error, setError] = useState(message || '');
  const [isRetrying, setIsRetrying] = useState(false);
  const {activateFaceAttendance} = useFaceRegistration();
  const content = copy[status] || copy.failure;

  const retryActivation = useCallback(async () => {
    setError('');
    setIsRetrying(true);
    try {
      await activateFaceAttendance(employeeId, companyId);
      navigation.replace(ROUTES.FACE_REGISTRATION_RESULT, {companyId, employeeId, status: 'success'});
    } catch (requestError) {
      setError(requestError?.message || 'Activation could not be completed.');
    } finally {
      setIsRetrying(false);
    }
  }, [activateFaceAttendance, companyId, employeeId, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <View style={styles.content}>
        <View style={[styles.icon, status === 'success' ? styles.iconSuccess : styles.iconWarning]}><Text style={styles.iconText}>{status === 'success' ? '✓' : '!'}</Text></View>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>
        {!!error && status !== 'success' && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        {status === 'activationPending' && <Pressable accessibilityRole="button" disabled={isRetrying} onPress={retryActivation} style={[styles.primaryButton, isRetrying && styles.disabled]}>{isRetrying ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Retry activation</Text>}</Pressable>}
        {status === 'failure' && <Pressable accessibilityRole="button" onPress={() => navigation.replace(ROUTES.ENROLLMENT_IDENTITY)} style={styles.primaryButton}><Text style={styles.primaryText}>Try again</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate(ROUTES.REGISTER)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to registration</Text></Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28},
  description: {color: '#476452', fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: 'center'},
  disabled: {opacity: 0.7},
  error: {color: '#B42318', fontSize: 14, lineHeight: 20, marginTop: 18, textAlign: 'center'},
  icon: {alignItems: 'center', borderRadius: 36, height: 72, justifyContent: 'center', width: 72},
  iconSuccess: {backgroundColor: '#DDF6E2'},
  iconText: {color: COLORS.darkGreen, fontSize: 38, fontWeight: '800'},
  iconWarning: {backgroundColor: '#FFF1D6'},
  primaryButton: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 10, justifyContent: 'center', marginTop: 26, minHeight: 50, paddingHorizontal: 28, width: '100%'},
  primaryText: {color: COLORS.white, fontSize: 16, fontWeight: '800'},
  safeArea: {backgroundColor: COLORS.lightGreen, flex: 1},
  secondaryButton: {alignItems: 'center', marginTop: 14, padding: 12},
  secondaryText: {color: COLORS.darkGreen, fontSize: 15, fontWeight: '700'},
  title: {color: COLORS.darkGreen, fontSize: 28, fontWeight: '800', marginTop: 20},
});

export default FaceRegistrationResultScreen;
