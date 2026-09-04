import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ROUTES} from '../constants/routes';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminLoginScreen from '../screens/Admin/AdminLoginScreen';
import RegisterScreen from '../screens/Register/RegisterScreen';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/LoginScreen/LoginScreen';
import EnrollmentIdentityScreen from '../screens/FaceRegistration/EnrollmentIdentityScreen';
import FaceCameraScreen from '../screens/FaceRegistration/FaceCameraScreen';
import FaceRegistrationResultScreen from '../screens/FaceRegistration/FaceRegistrationResultScreen';
import FaceCheckInTestScreen from '../screens/FaceRegistration/FaceCheckInTestScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName={ROUTES.SPLASH}
      screenOptions={{headerShown: false}}>
      <Stack.Screen name={ROUTES.SPLASH} component={SplashScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.ENROLLMENT_IDENTITY} component={EnrollmentIdentityScreen} />
      <Stack.Screen name={ROUTES.FACE_CAMERA} component={FaceCameraScreen} />
      <Stack.Screen name={ROUTES.FACE_REGISTRATION_RESULT} component={FaceRegistrationResultScreen} />
      <Stack.Screen name={ROUTES.FACE_CHECK_IN_TEST} component={FaceCheckInTestScreen} />
      <Stack.Screen name={ROUTES.ADMIN_LOGIN} component={AdminLoginScreen} />
      <Stack.Screen
        name={ROUTES.ADMIN_DASHBOARD}
        component={AdminDashboardScreen}
      />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
