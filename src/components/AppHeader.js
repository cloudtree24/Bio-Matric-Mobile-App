import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../constants/colors';

const AppHeader = ({showNavigation = false}) => (
  <View style={styles.header}>
    {showNavigation ? (
      <Icon name="menu-outline" size={34} color={COLORS.darkGreen} style={styles.leftIcon} />
    ) : (
      <View style={styles.sideSpace} />
    )}
    <Image
      accessibilityLabel="The Cloud Tree AI"
      resizeMode="contain"
      source={require('../assets/verticallogo.png')}
      style={styles.logo}
    />
    <Icon
      name="ellipsis-vertical"
      size={20}
      color="#000000"
      style={styles.menuIcon}
    />
  </View>
);

const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    height: 68,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.primary,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  sideSpace: {
    width: 26,
  },
  leftIcon: {
    width: 26,
  },
  logo: {
    height: 18,
    width: 170,
  },
  menuIcon: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    
    lineHeight: 32,
    textAlign: 'center',
    width: 26,
  },
});

export default AppHeader;
