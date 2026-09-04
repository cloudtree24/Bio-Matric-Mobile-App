import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const FaceGuideOverlay = ({faceState, message}) => (
  <View pointerEvents="none" style={styles.root}>
    <View style={[styles.guide, faceState === 'ready' ? styles.guideReady : styles.guideWarning]} />
    <View style={[styles.status, faceState === 'ready' ? styles.statusReady : styles.statusWarning]}>
      <Text style={styles.statusText}>{message}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    justifyContent: 'center'
  },
  guide: {
    borderRadius: 160,
    marginBottom: 90,
    borderWidth: 3,
    height: 310,
    marginBottom: 82,
    width: 240,
  },
  guideReady: {borderColor: '#8FE3A1'},
  guideWarning: {borderColor: '#FFFFFF'},
  status: {
    borderRadius: 18,
    bottom: 38,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'absolute',
    right: 24,
  },
  statusReady: {backgroundColor: 'rgba(20, 92, 42, 0.88)'},
  statusWarning: {backgroundColor: 'rgba(0, 0, 0, 0.58)'},
  statusText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center'},
});

export default FaceGuideOverlay;
