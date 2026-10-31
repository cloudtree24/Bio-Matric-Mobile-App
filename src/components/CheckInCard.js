import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CheckInCard = ({onPress, accessibilityLabel = 'Check In', faceOnly = false}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint="Open the face check-in camera"
    onPress={onPress}
    style={({pressed}) => [styles.card, faceOnly && styles.faceCard, pressed && styles.pressed]}>
    {faceOnly ? (
      <Image
        source={require('../assets/FaceID.png')}
        resizeMode="contain"
        style={styles.faceImage}
      />
    ) : (
      <MaterialCommunityIcons name="face-recognition" size={52} color="#F0FFF6" />
    )}
    <View style={styles.copy}>
      <Text style={[styles.title, faceOnly && styles.faceTitle]}>{faceOnly ? 'Face Check In' : 'Check In'}</Text>
      <Text style={[styles.subtitle, faceOnly && styles.faceSubtitle]}>Scan your face to mark attendance</Text>
    </View>
    <View style={[styles.arrow, faceOnly && styles.faceArrow]}>
      <Icon name="arrow-forward" size={26} color={faceOnly ? '#FFFFFF' : '#006B49'} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {width: '100%', backgroundColor: '#008D5B', borderRadius: 18, minHeight: 104, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12},
  copy: {flex: 1, minWidth: 0},
  title: {color: '#FFFFFF', fontSize: 23, fontWeight: '800'},
  subtitle: {color: '#E6FFF0', fontSize: 11, lineHeight: 17, marginTop: 4},
  arrow: {width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFAE8', alignItems: 'center', justifyContent: 'center'},
  faceCard: {backgroundColor: '#F0FFF1', borderWidth: 1, borderColor: '#06C168', minHeight: 130, padding: 14, gap: 10},
  faceImage: {width: 78, height: 90},
  faceTitle: {color: '#07583C', fontSize: 20},
  faceSubtitle: {color: '#527361', fontSize: 12, lineHeight: 18},
  faceArrow: {width: 38, height: 38, borderRadius: 19, backgroundColor: '#008D5B'},
  pressed: {opacity: 0.8},
});

export default CheckInCard;
