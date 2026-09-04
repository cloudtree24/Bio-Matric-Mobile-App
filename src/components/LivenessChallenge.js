import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {getLivenessInstruction} from '../services/livenessService';

const LivenessChallenge = ({challenge, currentIndex}) => {
  const currentStep = challenge[currentIndex];
  const completedCount = Math.min(currentIndex, challenge.length);

  return (
    <View accessibilityLiveRegion="polite" style={styles.card}>
      <Text style={styles.label}>Security check {completedCount + 1} of {challenge.length}</Text>
      <Text style={styles.instruction}>{currentStep ? getLivenessInstruction(currentStep) : 'Face check complete'}</Text>
      <View style={styles.progressRow}>
        {challenge.map((step, index) => (
          <View key={step} style={[styles.dot, index < completedCount && styles.dotComplete, index === currentIndex && styles.dotCurrent]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    left: 20,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: 'absolute',
    right: 20,
    top: 28,
  },
  dot: {backgroundColor: '#C9D5CB', borderRadius: 4, height: 8, marginHorizontal: 4, width: 24},
  dotComplete: {backgroundColor: '#258543'},
  dotCurrent: {backgroundColor: '#8FCB9E'},
  instruction: {color: '#173D24', fontSize: 19, fontWeight: '700', marginTop: 3},
  label: {color: '#587061', fontSize: 12, fontWeight: '600'},
  progressRow: {flexDirection: 'row', marginTop: 10},
});

export default LivenessChallenge;
