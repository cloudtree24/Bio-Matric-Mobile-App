import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {useAdminSession} from '../../context/AdminSessionContext';

const AdminSignOutScreen = ({navigation}) => {
  const {setIsAdminLoggedIn, setGeofences} = useAdminSession();

  const handleSignOut = () => {
    setIsAdminLoggedIn(false);
    setGeofences([]);
    navigation.reset({index: 0, routes: [{name: ROUTES.ADMIN_LOGIN}]});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          accessibilityLabel="The Cloud Tree AI"
          resizeMode="contain"
          source={require('../../assets/verticallogo.png')}
          style={styles.logo}
        />
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name="log-out-outline" size={44} color={COLORS.darkGreen} />
          </View>
          <Text style={styles.eyebrow}>ADMIN ACCOUNT</Text>
          <Text accessibilityRole="header" style={styles.title}>Sign out?</Text>
          <Text style={styles.description}>
            You’re about to leave the admin dashboard. Sign in again whenever you’re ready.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={handleSignOut}
            style={({pressed}) => [styles.button, styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Sign out</Text>
            <Icon name="arrow-forward" size={20} color={COLORS.white} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={() => navigation.goBack()}
            style={({pressed}) => [styles.button, styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6FBF8'},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24},
  logo: {width: 180, height: 28, alignSelf: 'center', marginBottom: 36},
  card: {width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: '#E0EEE7', padding: 24, alignItems: 'center'},
  iconCircle: {width: 88, height: 88, borderRadius: 44, backgroundColor: '#EAF6EF', alignItems: 'center', justifyContent: 'center', marginBottom: 24},
  eyebrow: {color: '#737183', fontSize: 10, fontWeight: '700', letterSpacing: 2},
  title: {color: '#082B22', fontSize: 30, fontWeight: '800', marginTop: 10},
  description: {color: '#718078', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12, marginBottom: 28},
  button: {width: '100%', minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  primaryButton: {backgroundColor: COLORS.darkGreen},
  primaryText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
  cancelButton: {backgroundColor: '#EAF6EF', marginTop: 12},
  cancelText: {color: COLORS.darkGreen, fontSize: 16, fontWeight: '700'},
  pressed: {opacity: 0.75},
});

export default AdminSignOutScreen;
