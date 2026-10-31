import React from 'react';
import {Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import AppHeader from '../../components/AppHeader';
import CheckInCard from '../../components/CheckInCard';
import {ROUTES} from '../../constants/routes';

const RegisterOption = ({image, label, accessibilityLabel, onPress}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={({pressed}) => [styles.optionWrapper, pressed && styles.pressed]}>
    <View style={styles.optionCard}>
      <Image resizeMode="contain" source={image} style={styles.optionImage} />
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </Pressable>
);

const RegisterScreen = ({navigation}) => (
  <SafeAreaView style={styles.safeArea}>
    <AppHeader />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => navigation.goBack()}
        style={styles.backButton}>
        <Icon name="arrow-back" size={20} color="#07583C" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>Choose a biometric method to get started.</Text>

      <View style={styles.registrationPanel}>
        <Image
          accessibilityLabel="Face registration"
          resizeMode="contain"
          source={require('../../assets/FaceID.png')}
          style={styles.heroImage}
        />
        <Text style={styles.panelTitle}>Biometric Registration</Text>
        <Text style={styles.panelSubtitle}>A simple, secure way to mark attendance.</Text>
        <View style={styles.options}>
          <RegisterOption
            image={require('../../assets/face.png')}
            label="Facial Recognition"
            accessibilityLabel="Face Register"
            onPress={() => navigation.navigate(ROUTES.ENROLLMENT_IDENTITY)}
          />
          <RegisterOption
            image={require('../../assets/finger.png')}
            label="Fingerprint"
            accessibilityLabel="Fingerprint Register"
            onPress={() => Alert.alert('Fingerprint registration', 'Fingerprint registration is not available yet.')}
          />
        </View>
        <View style={styles.adminNotice}>
          <Icon name="shield-checkmark-outline" size={15} color="#47715A" />
          <Text style={styles.adminNoticeText}>Only admins can register employee faces.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Already registered?</Text>
      <CheckInCard
        accessibilityLabel="Face Check-In Test"
        onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)}
      />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6FBF8'},
  content: {flexGrow: 1, padding: 18, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center'},
  backButton: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 16},
  backText: {color: '#07583C', fontSize: 13, fontWeight: '500'},
  title: {color: '#0A3425', fontSize: 28, fontWeight: '800'},
  subtitle: {color: '#718078', fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 22},
  registrationPanel: {backgroundColor: '#F0FFF1', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center'},
  heroImage: {height: 118, width: 140, marginBottom: 16},
  panelTitle: {color: '#0A3425', fontSize: 19, fontWeight: '700', textAlign: 'center'},
  panelSubtitle: {color: '#718078', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6},
  options: {flexDirection: 'row', gap: 20, justifyContent: 'center', marginTop: 26, width: '100%'},
  optionWrapper: {alignItems: 'center', flex: 1, maxWidth: 150},
  optionCard: {alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#06C168', borderRadius: 16, borderWidth: 1, height: 100, justifyContent: 'center', width: '100%'},
  optionImage: {height: 78, width: '90%'},
  optionLabel: {color: '#00A854', fontSize: 12, fontWeight: '500', lineHeight: 18, marginTop: 9, textAlign: 'center'},
  adminNotice: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24},
  adminNoticeText: {color: '#47715A', fontSize: 10, lineHeight: 16, flexShrink: 1},
  sectionTitle: {color: '#426050', fontSize: 13, fontWeight: '600', marginTop: 26, marginBottom: 12},
  pressed: {opacity: 0.75},
});

export default RegisterScreen;
