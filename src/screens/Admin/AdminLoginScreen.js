import React, {useState} from 'react';
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

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import AppHeader from '../../components/AppHeader';
import {useAdminSession} from '../../context/AdminSessionContext';
const ADMIN_PIN = '1234';

const AdminLoginScreen = ({navigation}) => {
  const {setIsAdminLoggedIn} = useAdminSession();
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = () => {
    if (!userId.trim()) {
      Alert.alert('User ID required', 'Please enter your user ID.');
      return;
    }

    if (pin !== ADMIN_PIN) {
      Alert.alert('Invalid PIN', 'Enter the correct 4-digit PIN.');
      return;
    }

    setIsAdminLoggedIn(true);
    navigation.replace(ROUTES.ADMIN_DASHBOARD);
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
            Enter your user ID and PIN to continue.
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUserId}
            placeholder="User ID"
            placeholderTextColor="#6B7280"
            style={styles.input}
            value={userId}
          />
          <TextInput
            keyboardType="number-pad"
            maxLength={4}
            onChangeText={setPin}
            placeholder="4-digit PIN"
            placeholderTextColor="#6B7280"
            secureTextEntry
            style={styles.input}
            value={pin}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleLogin}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.lightGreen, flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 , marginTop: 24},
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
