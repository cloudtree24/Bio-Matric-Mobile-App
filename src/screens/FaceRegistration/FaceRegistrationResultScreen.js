import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import FaceStatusModal from '../../components/FaceStatusModal';
import {ROUTES} from '../../constants/routes';

const FaceRegistrationResultScreen = ({navigation, route}) => {
  const {companyId, employeeId, employeeName, status, message} = route.params || {};
  const success = status === 'success';
  return <SafeAreaView style={styles.root}>
    <FaceStatusModal visible title={success ? 'Face registered' : 'Registration failed'} message={message || (success ? 'Your face registration was saved to the server.' : 'Face registration was not completed. Please try again.')} onRetry={success ? undefined : () => navigation.replace(ROUTES.FACE_CAMERA, {companyId, employeeId, employeeName})} onClose={() => navigation.navigate(ROUTES.REGISTER)} />
  </SafeAreaView>;
};
const styles = StyleSheet.create({root: {flex: 1, backgroundColor: '#F6FBF8'}});
export default FaceRegistrationResultScreen;
