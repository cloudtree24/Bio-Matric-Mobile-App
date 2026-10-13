import React, {useState} from 'react';
import {Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';

import {COLORS} from '../constants/colors';
import {ROUTES} from '../constants/routes';
import {useAdminSession} from '../context/AdminSessionContext';

const AppHeader = () => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const navigation = useNavigation();
  const {isAdminLoggedIn} = useAdminSession();

  const contactSupport = async () => {
    setIsMenuVisible(false);
    try {
      await Linking.openURL('tel:8709138957');
    } catch {
      Alert.alert('Contact Customer Support', 'Please call 8709138957.');
    }
  };

  const goTo = route => {
    setIsMenuVisible(false);
    navigation.navigate(route);
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.sideSpace} />
        <Image
          accessibilityLabel="The Cloud Tree AI"
          resizeMode="contain"
          source={require('../assets/verticallogo.png')}
          style={styles.logo}
        />
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setIsMenuVisible(visible => !visible)}>
          <Icon
            name="ellipsis-vertical"
            size={20}
            color="#000000"
            style={styles.menuIcon}
          />
        </Pressable>
      </View>
      <Modal
        animationType="none"
        onRequestClose={() => setIsMenuVisible(false)}
        statusBarTranslucent
        transparent
        visible={isMenuVisible}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={() => setIsMenuVisible(false)}
            style={styles.backdrop}
          />
          <View accessibilityViewIsModal style={styles.menu}>
            <Pressable
              accessibilityRole="button"
              onPress={isAdminLoggedIn ? contactSupport : () => goTo(ROUTES.ADMIN_LOGIN)}
              style={({pressed}) => [styles.menuButton, pressed && styles.menuButtonPressed]}>
              <View style={styles.menuIconWrap}>
                <Icon color={COLORS.darkGreen} name={isAdminLoggedIn ? 'call-outline' : 'shield-checkmark-outline'} size={21} />
              </View>
              <View style={styles.menuButtonContent}>
                <Text style={styles.menuButtonText}>{isAdminLoggedIn ? 'Contact Customer Support' : 'Admin'}</Text>
                <Text style={styles.menuButtonHint}>{isAdminLoggedIn ? '8709138957' : 'Sign in to the dashboard'}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
  headerContainer: {
    zIndex: 10,
  },
  sideSpace: {
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
  menu: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E9DC',
    elevation: 12,
    padding: 10,
    position: 'absolute',
    right: 16,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.18,
    shadowRadius: 12,
    top: 76,
    width: 245,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    // backgroundColor: 'rgba(16, 44, 23, 0.16)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 10,
  },
  menuButtonPressed: {
    backgroundColor: '#EAF8ED',
  },
  menuButtonText: {
    color: COLORS.darkGreen,
    fontSize: 16,
    fontWeight: '700',
  },
  menuButtonContent: {
    flex: 1,
  },
  menuButtonHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  menuIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EAF8ED',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
});

export default AppHeader;
