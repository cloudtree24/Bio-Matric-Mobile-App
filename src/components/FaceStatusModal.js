import React from 'react';
import {ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View} from 'react-native';

const FaceStatusModal = ({visible, title, message, employee, busy = false, onRetry, retryLabel = 'Try again', onClose, showSettings = false}) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={() => { if (!busy) onClose?.(); }}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={styles.card}>
        {employee && <View style={styles.success}><Text style={styles.check}>✓</Text><View style={styles.initialsCircle}><Text style={styles.initials}>{(employee.employeeName || '').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</Text></View><Text style={styles.title}>{employee.employeeName}</Text></View>}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        {busy && <ActivityIndicator color="#07583C" size="large" />}
        {showSettings && <Pressable accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => {})} style={styles.button}><Text style={styles.buttonText}>Open Settings</Text></Pressable>}
        {!busy && onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}><Text style={styles.buttonText}>{retryLabel}</Text></Pressable>}
        {!busy && !employee && onClose && <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>}
      </View>
    </View>
  </Modal>
);
const styles = StyleSheet.create({
  success: {alignItems: 'center', gap: 16},
  check: {backgroundColor: '#07583C', color: '#FFFFFF', width: 64, height: 64, borderRadius: 32, textAlign: 'center', lineHeight: 64, fontSize: 36},
  initialsCircle: {width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F1E7', alignItems: 'center', justifyContent: 'center'},
  initials: {fontSize: 28, color: '#07583C', fontWeight: '700'},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', alignItems: 'center', padding: 24},
  card: {backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, width: '100%', maxWidth: 440, gap: 18},
  title: {color: '#153C2D', fontSize: 24, fontWeight: '800', textAlign: 'center'},
  message: {color: '#476452', fontSize: 15, lineHeight: 22, textAlign: 'center'},
  button: {backgroundColor: '#07583C', borderRadius: 12, padding: 14, minHeight: 48, alignItems: 'center'},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  close: {alignItems: 'center', padding: 12}, closeText: {color: '#07583C', fontWeight: '700'},
});
export default FaceStatusModal;
