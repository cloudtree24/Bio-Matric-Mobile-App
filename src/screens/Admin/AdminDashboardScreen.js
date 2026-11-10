import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import CheckInCard from '../../components/CheckInCard';
import AppHeader from '../../components/AppHeader';
import {ROUTES} from '../../constants/routes';
import {useAdminSession} from '../../context/AdminSessionContext';
import {findNearestGeofence} from '../../utils/nearestGeofence';
import {getCurrentDeviceLocation} from '../../services/deviceLocation';

const DashboardContent = ({navigation, location, onFetchLocation, isFetchingLocation}) => (
  <SafeAreaView style={styles.safeArea}>
    <AppHeader showNavigation />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
     
        <View style={styles.welcomeCopy}>
          <Text style={styles.eyebrow}>ADMIN DASHBOARD</Text>
          <Text accessibilityRole="header" style={styles.title}>Hello, Admin</Text>
          <Text style={styles.intro}>Your workplace and employee tools, all in one place.</Text>
        </View>
        
    
      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Your workplace</Text>
      </View>
      <View style={styles.locationCard}>
        <View style={styles.locationTop}>
          <View style={styles.locationIcon}><Icon name="location-outline" size={22} color="#c93b1f" /></View>
          <View style={styles.rowCopy}>
           
            <Text style={styles.locationTitle}>{location.title}</Text>
            <Text style={styles.locationHint}>{location.hint}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fetch nearest location" accessibilityState={{disabled: isFetchingLocation}} disabled={isFetchingLocation} onPress={onFetchLocation} style={({pressed}) => [styles.locationButton, (pressed || isFetchingLocation) && styles.pressed]}>
          <Icon name="refresh-outline" size={16} color="#07583C" />
          <Text style={styles.locationButtonText}>{isFetchingLocation ? 'Fetching location...' : 'Refresh location'}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Quick actions</Text>
        <Text style={styles.sectionHint}>Get started</Text>
      </View>
      <CheckInCard faceOnly accessibilityLabel="Face Check In" onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)} />
      <Pressable accessibilityRole="button" accessibilityLabel="Register" onPress={() => navigation.navigate(ROUTES.REGISTER)} style={({pressed}) => [styles.employeeCard, pressed && styles.pressed]}>
        <View style={styles.employeeIcon}><Icon name="people-outline" size={23} color="#07583C" /></View>
        <View style={styles.rowCopy}>
          <Text style={styles.actionTitle}>Employees</Text>
          <Text style={styles.actionHint}>View and register employee faces</Text>
        </View>
        <Icon name="chevron-forward" size={20} color="#638273" />
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Notice board</Text>
      </View>
      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          <View style={styles.noticeIcon}><Icon name="megaphone-outline" size={20} color="#07583C" /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.noticeTitle}>Face registration</Text>
            <Text style={styles.noticeMeta}>Admin announcement · All employees</Text>
          </View>
        </View>
        <Text style={styles.noticeCopy}>Only admins can register employee faces.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>
);

const AdminDashboardRoute = props => {
  const {geofences, nearestLocation, saveNearestLocation} = useAdminSession();
  const savedLocationRef = useRef(nearestLocation);
  savedLocationRef.current = nearestLocation;
  const [location, setLocation] = useState(() => nearestLocation
    ? {title: nearestLocation.geoLocationName || 'Nearest workplace', hint: nearestLocation.address || 'Address unavailable'}
    : {title: 'Finding location...', hint: 'Please wait'});
  const [fetchCount, setFetchCount] = useState(0);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);

  useEffect(() => {
    let active = true;
    const update = value => { if (active) { setLocation(value); setIsFetchingLocation(false); } };
    const showLocationError = message => {
      const saved = savedLocationRef.current;
      update(saved
        ? {title: `${saved.geoLocationName || 'Nearest workplace'} (saved)`, hint: `${saved.address || 'Address unavailable'}\n${message}`}
        : {title: 'Location unavailable', hint: message});
    };
    const loadLocation = async () => {
      setIsFetchingLocation(true);
      if (!savedLocationRef.current) { setLocation({title: 'Finding location...', hint: 'Please wait'}); }
      if (!geofences.length) {
        update({title: 'Location unavailable', hint: 'No workplaces available.'});
        return;
      }
      try {
        if (Platform.OS === 'android') {
          const permissions = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          if (permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED &&
              permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] !== PermissionsAndroid.RESULTS.GRANTED) {
            showLocationError('Location permission is needed.');
            return;
          }
        }
        if (!active) { return; }
        const {coords} = await getCurrentDeviceLocation();
        if (active) {
            const nearest = findNearestGeofence(coords, geofences);
            if (!nearest) {
              update({title: 'Location unavailable', hint: 'No valid workplace locations.'});
              return;
            }
            if (!active) { return; }
            try {
              await saveNearestLocation(nearest);
              update({title: nearest.geoLocationName || 'Nearest workplace', hint: nearest.address || 'Address unavailable'});
            } catch (error) {
              update({title: nearest.geoLocationName || 'Nearest workplace', hint: 'Could not save location. Try again.'});
            }
        }
      } catch (error) {
        showLocationError(error.code === 1 ? 'Location permission is needed.' : 'Turn on device location and try again.');
      }
    };
    loadLocation();
    return () => { active = false; };
  }, [geofences, fetchCount, saveNearestLocation]);

  return <DashboardContent {...props} location={location} isFetchingLocation={isFetchingLocation} onFetchLocation={() => setFetchCount(count => count + 1)} />;
};





const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5FAF7'},
  content: {width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40},
  welcome: {backgroundColor: '#07583C', borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  welcomeCopy: {flex: 1, minWidth: 0}, welcomeIcon: {width: 45, height: 45, borderRadius: 14, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center'},
  eyebrow: {color: '#042a15', fontSize: 10, fontWeight: '800', letterSpacing: 1.3},
  title: {color: '#2d8923', fontSize: 27, fontWeight: '800', marginTop: 8},
  intro: {color: '#185534', fontSize: 13, lineHeight: 20, marginTop: 6},
  sectionHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12, gap: 8},
  sectionTitle: {color: '#153C2D', fontSize: 17, fontWeight: '800'}, sectionHint: {color: '#788A80', fontSize: 12},
  locationCard: {backgroundColor: '#FFFFFF', borderColor: '#E0EEE6', borderWidth: 1, borderRadius: 18, padding: 16},
  locationTop: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  locationIcon: {width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8f4f3', alignItems: 'center', justifyContent: 'center' , borderWidth:1, borderColor: '#ba8181'},
  rowCopy: {flex: 1, minWidth: 0}, locationLabel: {color: '#788A80', fontSize: 10, fontWeight: '800', letterSpacing: 0.7},
  locationTitle: {color: '#153C2D', fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 4},
  locationHint: {color: '#545856', fontSize: 12, lineHeight: 18, marginTop: 4 , fontWeight: '600'},
  locationButton: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 6, paddingHorizontal: 4},
  locationButtonText: {color: '#07583C', fontSize: 13, fontWeight: '700'},
  employeeCard: {backgroundColor: '#FFFFFF', borderColor: '#E0EEE6', borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12},
  employeeIcon: {width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF7EF', alignItems: 'center', justifyContent: 'center'},
  actionTitle: {color: '#153C2D', fontSize: 16, fontWeight: '700'}, actionHint: {color: '#718078', fontSize: 12, lineHeight: 18, marginTop: 3},
  pressed: {opacity: 0.65}, noticeCard: {backgroundColor: '#FFFFFF', borderColor: '#E0EEE6', borderWidth: 1, borderRadius: 18, padding: 16},
  noticeHeader: {flexDirection: 'row', alignItems: 'center', gap: 12}, noticeIcon: {width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF7EF', alignItems: 'center', justifyContent: 'center'},
  noticeTitle: {color: '#153C2D', fontSize: 15, fontWeight: '700'}, noticeMeta: {color: '#788A80', fontSize: 11, lineHeight: 16, marginTop: 3},
  noticeCopy: {color: '#52665A', fontSize: 13, lineHeight: 20, marginTop: 14},
});

export default AdminDashboardRoute;
