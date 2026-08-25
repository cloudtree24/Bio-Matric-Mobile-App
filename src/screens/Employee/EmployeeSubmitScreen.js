import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';

import {COLORS} from '../../constants/colors';

const EmployeeSubmitScreen = () => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.content}>
      <Text style={styles.title}>Employee Submit</Text>
    </View>
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
    justifyContent: 'center',
  },
  title: {
    color: COLORS.darkGreen,
    fontSize: 24,
    fontWeight: '600',
  },
});

export default EmployeeSubmitScreen;
