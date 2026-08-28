import React, {useEffect} from 'react';
import {Image, SafeAreaView, StyleSheet, View} from 'react-native';

import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';

const SPLASH_DURATION_MS = 1500;

const SplashScreen = ({navigation}) => {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      navigation.replace(ROUTES.LOGIN);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.logoContainer}>
        <Image
          accessibilityLabel="The Cloud Tree HCM logo"
          resizeMode="contain"
          source={require('../../assets/images/cloudtree-logo.jpg')}
          style={styles.logo}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '72%',
    maxWidth: 320,
    aspectRatio: 1,
  },
});

export default SplashScreen;
