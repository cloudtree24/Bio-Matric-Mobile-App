import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const FaceGuideOverlay = ({captureCountdown, children, faceState, message}) => (
  <View pointerEvents="none" style={styles.root}>
    <View style={[styles.outerRing, faceState === 'ready' ? styles.outerRingReady : styles.outerRingWarning]}>
      <View style={[styles.guide, faceState === 'ready' ? styles.guideReady : styles.guideWarning]}>
        {children}
      </View>
      {typeof captureCountdown === 'number' && <View style={styles.timerBadge}><Text style={styles.timerText}>{captureCountdown}</Text></View>}
    </View>
    <View style={[styles.status, faceState === 'ready' ? styles.statusReady : styles.statusWarning]}>
      <Text style={styles.statusLabel}>Face instruction</Text>
      <Text style={styles.statusText}>{message}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 82,
  },
  outerRing: {alignItems: 'center', borderRadius: 155, height: 294, justifyContent: 'center', marginBottom: 20, width: 294},
  outerRingReady: {backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(210, 255, 241, 0.9)', borderWidth: 2},
  outerRingWarning: {backgroundColor: 'rgba(0, 76, 54, 0.18)', borderColor: 'rgba(255, 255, 255, 0.68)', borderWidth: 2},
  guide: {
    backgroundColor: '#0F966D',
    borderRadius: 126,
    borderWidth: 3,
    height: 252,
    overflow: 'hidden',
    width: 252,
  },
  guideReady: {borderColor: '#1AD1B5'},
  guideWarning: {borderColor: '#FFFFFF'},
  status: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    bottom: 1,
    elevation: 6,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 13,
    position: 'absolute',
    right: 24,
    shadowColor: '#003D2B',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  statusLabel: {color: '#0F966D', fontSize: 12, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase'},
  statusReady: {borderColor: '#9BE7D4', borderWidth: 1},
  statusWarning: {borderColor: '#D8EFE7', borderWidth: 1},
  statusText: {color: '#183B31', fontSize: 15, fontWeight: '700', marginTop: 4, textAlign: 'center'},
  timerBadge: {alignItems: 'center', backgroundColor: '#14BFA5', borderColor: '#FFFFFF', borderRadius: 28, borderWidth: 3, bottom: -10, height: 56, justifyContent: 'center', position: 'absolute', right: 16, width: 56},
  timerText: {color: '#FFFFFF', fontSize: 25, fontWeight: '800'},
});

export default FaceGuideOverlay;
