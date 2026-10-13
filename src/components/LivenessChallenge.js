import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {getLivenessInstruction} from '../services/livenessService';

const LivenessChallenge = ({captureCountdown, challenge, currentIndex, hasManualCaptureOption = false}) => {
  const currentStep = challenge[currentIndex];
  const completedCount = Math.min(currentIndex, challenge.length);
  const isAutoCaptureCountdown = typeof captureCountdown === 'number';
  const isComplete = completedCount >= challenge.length;

  return (
    <View accessibilityLiveRegion="polite" style={[styles.card, hasManualCaptureOption && styles.cardAboveCaptureOptions]}>
      <Text style={styles.label}>{isAutoCaptureCountdown || isComplete ? 'Security check complete' : `Security check ${completedCount + 1} of ${challenge.length}`}</Text>
      <Text style={styles.instruction}>{isAutoCaptureCountdown ? `Capturing in ${captureCountdown}s` : currentStep ? getLivenessInstruction(currentStep) : 'Face check complete'}</Text>
      <View style={styles.progressRow}>
        {challenge.map((step, index) => (
          <View key={step} style={[styles.dot, (isAutoCaptureCountdown || index < completedCount) && styles.dotComplete, !isAutoCaptureCountdown && index === currentIndex && styles.dotCurrent]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardAboveCaptureOptions: {bottom: 210},
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    bottom: 140,
    left: 24,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: 'absolute',
    right: 24,
  },
  dot: {backgroundColor: '#C9D5CB', borderRadius: 4, height: 8, marginHorizontal: 4, width: 24},
  dotComplete: {backgroundColor: '#258543'},
  dotCurrent: {backgroundColor: '#8FCB9E'},
  instruction: {color: '#075C43', fontSize: 19, fontWeight: '800', marginTop: 3, textAlign: 'center'},
  label: {color: '#527568', fontSize: 12, fontWeight: '700'},
  progressRow: {flexDirection: 'row', marginTop: 10},
});

export default LivenessChallenge;
