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

const RegisterScreen = () => (
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
      <View style={styles.options}>
        <RegisterOption
          image={require('../../assets/face.png')}
          label="Face Register"
          onPress={() => console.log('Facial Register ')}
        />
        <RegisterOption
          image={require('../../assets/finger.png')}
          label="Fingerprint Register"
          onPress={() => console.log('Fingerprint Register ')}
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
    gap: 24,
    justifyContent: 'center',
    marginTop: 35,
    width: '100%',
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
