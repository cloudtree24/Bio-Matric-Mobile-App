import React from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';

const RegisterOption = ({image, label, onPress}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={styles.optionWrapper}>
    <View style={styles.optionCard}>
      <Image resizeMode="contain" source={image} style={styles.optionImage} />
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </Pressable>
);

const RegisterScreen = ({navigation}) => (
  <SafeAreaView style={styles.safeArea}>
    <AppHeader showNavigation />
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Image
        accessibilityLabel="Registration illustration"
        resizeMode="contain"
        source={require('../../assets/Register.png')}
        style={styles.heroImage}
      />
      <Text style={styles.adminNotice}>Only admin can register face.</Text>
      <View style={styles.options}>
        <RegisterOption
          image={require('../../assets/face.png')}
          label="Face Register"
          onPress={() => navigation.navigate(ROUTES.ENROLLMENT_IDENTITY)}
        />
        <RegisterOption
          image={require('../../assets/finger.png')}
          label="Fingerprint Register"
          onPress={() => console.log('Fingerprint Register ')}
        />
        <RegisterOption
          image={require('../../assets/face.png')}
          label="Face Check-In Test"
          onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)}
        />
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 28,
    paddingTop: 50,
  },
  heroImage: {
    height: 180,
    maxWidth: 440,
    width: '100%',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    marginTop: 35,
    width: '100%',
  },
  adminNotice: {
    color: COLORS.darkGreen,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 20,
    textAlign: 'center',
  },
  optionWrapper: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 205,
  },
  optionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderRadius: 24,
    borderWidth: 1,
    height: 132,
    justifyContent: 'center',
    width: '100%',
  },
  optionImage: {
    height: 94,
    width: '84%',
  },
  optionLabel: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default RegisterScreen;
