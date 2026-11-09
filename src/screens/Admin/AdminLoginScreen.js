import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import AppHeader from '../../components/AppHeader';
import { useAdminSession } from '../../context/AdminSessionContext';
import apiClient from '../../services/apiClient';

const AdminLoginScreen = ({ navigation }) => {
  const { signIn } = useAdminSession();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

// debugger

  const handleLogin = async () => {
    if (!userId.trim() || !password) {
      Alert.alert(
        'Credentials required',
        'Please enter your user name and password.',
      );
      return;
    }

    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await apiClient.post(
        '/EmpRegistration/GeoLocationAdminLogin',
        {
          UserName: userId.trim(),
          Password: password,
        },
      );

      console.log('Admin login response:', data);

      if (data?.response?.isSuccess !== true) {
        Alert.alert(
          'Login failed',
          data?.response?.message || 'Invalid user name or password.',
        );
        return;
      }

      await signIn(data.geofences);
      navigation.replace(ROUTES.ADMIN_DASHBOARD);
    } catch (error) {
      Alert.alert('Login failed', error.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showNavigation />

      <ScrollView
        // contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image
          accessibilityLabel="Registration illustration"
          resizeMode="contain"
          source={require('../../assets/Register.png')}
          style={styles.heroImage}
        />

        <View style={styles.content}>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>
            Enter your user name and password to continue.
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUserId}
            placeholder="User name"
            placeholderTextColor="#6B7280"
            style={styles.input}
            value={userId}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
              accessibilityRole="button"
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={COLORS.darkGreen}
              />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={handleLogin}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.lightGreen, flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, marginTop: 24 },
  title: { color: COLORS.darkGreen, fontSize: 28, fontWeight: '800' },
  subtitle: {
    color: COLORS.darkGreen,
    fontSize: 15,
    marginBottom: 24,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderWidth: 1,
    color: COLORS.darkGreen,
    fontSize: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  passwordContainer: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  passwordInput: {
    color: COLORS.darkGreen,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  eyeButton: { paddingHorizontal: 14, paddingVertical: 12 },
  heroImage: {
    height: 180,
    maxWidth: 440,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.darkGreen,
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 14,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});

export default AdminLoginScreen;
