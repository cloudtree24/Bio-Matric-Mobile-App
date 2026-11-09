// @refresh reset
// Remount this screen during Fast Refresh when its dashboard hooks change.
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
import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';
import {useAdminSession} from '../../context/AdminSessionContext';
import {findNearestGeofence} from '../../utils/nearestGeofence';
import {getCurrentDeviceLocation} from '../../services/deviceLocation';

const NoticeBoard = () => (
  <View style={styles.noticeSection}>
    <Text accessibilityRole="header" style={styles.noticeBoardTitle}>
      Notice Board
    </Text>
    <View style={styles.noticeBoard}>
      <View style={styles.noticeBoardHeading}>
        <View style={styles.noticeIconWrap}>
          <Icon name="megaphone-outline" size={21} color="#00633F" />
        </View>
        <View style={styles.noticeSubjectRow}>
          <Text style={styles.noticeSubject}>Face registration</Text>
          <Text style={styles.newNoticeText}>NEW</Text>
        </View>
      </View>
      <Text style={styles.noticeCopy}>
        Only admins can register employee faces.
      </Text>
      <View style={styles.noticeFooter}>
        <View style={styles.noticeMetaItem}>
          <Icon name="shield-checkmark-outline" size={14} color="#52665A" />
          <Text style={styles.noticeAuthor}>Admin announcement</Text>
        </View>
        <View style={styles.noticeMetaItem}>
          <Icon name="people-outline" size={14} color="#52665A" />
          <Text style={styles.noticeAudience}>All employees</Text>
        </View>
      </View>
    </View>
  </View>
);

class DashboardContent extends React.Component {
  state = {
    now: new Date(),
    newsVisible: false,
  };

  componentDidMount() {
    this.clockTimer = setInterval(() => this.setState({now: new Date()}), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.clockTimer);
  }

  toggleNews = () => {
    this.setState(({newsVisible}) => ({newsVisible: !newsVisible}));
  };

  render() {
    const {navigation, location, onFetchLocation, isFetchingLocation} = this.props;
    const {now, newsVisible} = this.state;

    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showNavigation />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingRow}>
            <View style={styles.rowCopy}>
              <Text style={styles.title}>Hello, Admin</Text>
            </View>
          </View>
          <Text style={styles.intro}>Everything you need for today.</Text>

          

          <View style={styles.infoCards}>
            
            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Icon name="location" size={25} color="#07583C" />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{location.title}</Text>
                <Text style={styles.infoHint}>{location.hint}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fetch nearest location"
                  disabled={isFetchingLocation}
                  onPress={onFetchLocation}
                >
                  <Text style={styles.fetchLocationText}>
                    {isFetchingLocation ? 'Fetching...' : 'Fetch location'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.checkInSpacing}>
            <CheckInCard
              faceOnly
              accessibilityLabel="Face Check In"
              onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Register"
            onPress={() => navigation.navigate(ROUTES.REGISTER)}
            style={({ pressed }) => [
              styles.compactRegister,
              pressed && styles.registerUserButtonPressed,
            ]}
          >
           
            <View style={styles.rowCopy}>
              <Text style={styles.expandTitle}>Employees</Text>
              <Text style={styles.rowSubtitle}>View and manage employees</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#07583C" />
          </Pressable>

          <NoticeBoard />

     
        </ScrollView>
      </SafeAreaView>
    );
  }
}



// Keep the navigation entry a function; React mounts the stateful class as a child.
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
  checkInSpacing: { marginTop: 12 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DCF4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerArt: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    width: 130,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  artCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#087A4E',
    right: -30,
    top: -18,
  },
  artClock: {
    position: 'absolute',
    bottom: 0,
    right: -3,
    backgroundColor: '#00633F',
    borderRadius: 32,
  },
  infoCards: { flexDirection: 'row', gap: 10, marginTop: 12 },
  infoCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#EAF6EF',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  infoIcon: {
    width: 38,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#D2EFDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#737183',
    fontWeight: '600',
    marginBottom: 3,
  },
  infoTime: { fontSize: 18, color: '#102D24', fontWeight: '800' },
  infoValue: {
    fontSize: 11,
    color: '#102D24',
    fontWeight: '700',
    lineHeight: 16,
  },
  infoHint: { fontSize: 10, color: '#817F8D', marginTop: 4, lineHeight: 14 },
  fetchLocationText: {
    color: COLORS.darkGreen,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  checkInHint: { color: '#E0F5E9', fontSize: 12, lineHeight: 18, marginTop: 4 },
  checkInArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D7F5E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSubtitle: { color: '#817F8D', fontSize: 11, lineHeight: 16, marginTop: 3 },
  safeArea: { flex: 1, backgroundColor: '#F6FBF8' },
  content: { padding: 14, paddingBottom: 36 },
  eyebrow: {
    color: '#737183',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  intro: { color: '#777487', fontSize: 14, marginTop: 6, marginBottom: 18 },
  todayCard: {
    backgroundColor: '#00633F',
    borderRadius: 17,
    padding: 20,
    minHeight: 160,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  todayLabel: {
    color: '#E1F6EA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  clock: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: '800',
    marginTop: 16,
    fontVariant: ['tabular-nums'],
    zIndex: 1,
  },
  date: { color: '#E3EFE7', fontSize: 13, marginTop: 4, zIndex: 1 },
  locationRow: {
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF30',
    marginTop: 20,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationCopy: { flex: 1 },
  locationTitle: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  locationHint: { color: '#D3E7DA', fontSize: 12, marginTop: 3 },
  checkInButton: {
    backgroundColor: '#008250',
    borderRadius: 17,
    minHeight: 108,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    overflow: 'hidden',
  },
  checkInInner: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#FFFFFF45',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkInText: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  compactRegister: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    padding: 12,
    borderRadius: 17,
    backgroundColor: '#EDF7F2',
    borderWidth: 1,
    borderColor: '#E0EEE7',
    marginTop: 12,
  },
  registerLabel: { color: COLORS.darkGreen, fontSize: 13, fontWeight: '700' },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    minHeight: 76,
  },
  expandIcon: {
    width: 46,
    height: 46,
    backgroundColor: '#D7F1E3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTitle: { color: '#102D24', fontSize: 16, fontWeight: '700' },
  expandBody: { paddingHorizontal: 16, paddingBottom: 16 },
  noticeSection: { marginTop: 24 },
  noticeBoardTitle: {
    color: '#102D24',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  noticeBoard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEBE2',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#102D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  noticeBoardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noticeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EAF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newNoticeText: {
    color: '#00633F',
    backgroundColor: '#EAF6EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    overflow: 'hidden',
  },
  noticeSubjectRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  noticeSubject: {
    color: '#102D24',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    flexShrink: 1,
  },
  noticeCopy: { color: '#52665A', fontSize: 14, lineHeight: 22, marginTop: 12 },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EDF3EF',
  },
  noticeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noticeAuthor: {
    color: '#52665A',
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },
  noticeAudience: {
    color: '#52665A',
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E3EBE6',
    borderRadius: 18,
    padding: 16,
  },
  actionIcon: {
    backgroundColor: '#EDF6EF',
    borderRadius: 13,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionTitle: { color: COLORS.darkGreen, fontSize: 16, fontWeight: '700' },
  muted: { color: '#718078', fontSize: 12, marginTop: 5, lineHeight: 18 },
  newsCard: {
    backgroundColor: '#14382D',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#244C3C',
    overflow: 'hidden',
    marginTop: 18,
  },
  emptyNews: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: '#52665A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyDescription: {
    color: '#718078',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#102C1766',
    justifyContent: 'center',
    padding: 24,
  },
  noticeCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
  noticeText: { color: '#52665A', fontSize: 13, lineHeight: 21, marginTop: 8 },
  registerUserSection: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  registerUserHeading: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  registerUserDescription: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  registerUserButton: {
    alignItems: 'center',
    backgroundColor: COLORS.darkGreen,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  registerUserButtonPressed: { opacity: 0.8 },
  registerUserButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: '#082B22', fontSize: 27, fontWeight: '800' },
  titleIcons: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  bellCircle: {
    alignItems: 'center',
    borderColor: COLORS.primary,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  tabs: {
    borderColor: COLORS.darkGreen,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    overflow: 'hidden',
  },
  tab: {
    alignItems: 'center',
    borderRightColor: COLORS.darkGreen,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  tabActive: { backgroundColor: COLORS.darkGreen },
  tabText: { color: COLORS.darkGreen, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: COLORS.white },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.darkGreen,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    minHeight: 270,
    padding: 20,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#102C17', fontSize: 17, fontWeight: '800' },
  downloadWrap: { alignItems: 'center' },
  downloadIcon: { bottom: 14, left: 14, position: 'absolute' },
  downloadText: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '700',
    marginTop: -8,
  },
  donut: {
    alignSelf: 'center',
    backgroundColor: '#54F66A',
    borderRadius: 70,
    height: 140,
    marginTop: 8,
    overflow: 'hidden',
    width: 140,
  },
  arc: {
    borderColor: 'transparent',
    borderRadius: 70,
    borderWidth: 20,
    height: 140,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 140,
  },
  blueArc: {
    borderLeftColor: '#62B1D8',
    borderTopColor: '#62B1D8',
    transform: [{ rotate: '-45deg' }],
  },
  redArc: {
    borderBottomColor: '#EB0000',
    borderLeftColor: '#EB0000',
    transform: [{ rotate: '10deg' }],
  },
  donutCenter: {
    backgroundColor: COLORS.white,
    borderRadius: 50,
    height: 100,
    left: 20,
    position: 'absolute',
    top: 20,
    width: 100,
  },
  bluePercent: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
    left: 23,
    position: 'absolute',
    top: 30,
  },
  redPercent: {
    bottom: 29,
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
    left: 22,
    position: 'absolute',
  },
  greenPercent: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '800',
    position: 'absolute',
    right: 4,
    top: 78,
  },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: 5,
  },
  legendDot: { borderRadius: 8, height: 16, marginRight: 5, width: 16 },
  legendText: { color: '#102C17', fontSize: 13 },
  periodCard: {
    backgroundColor: COLORS.white,
    borderColor: '#102C17',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 38,
    padding: 20,
  },
  periodTabs: {
    borderColor: COLORS.darkGreen,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  periodTab: {
    alignItems: 'center',
    backgroundColor: '#D5F3E3',
    borderRightColor: COLORS.darkGreen,
    borderRightWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'center',
  },
  periodTabActive: { backgroundColor: COLORS.darkGreen },
  periodText: {
    color: COLORS.darkGreen,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  periodTextActive: { color: COLORS.white },
  filters: { flexDirection: 'row', gap: 16, marginTop: 32 },
  filter: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: '#D5D5D5',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  filterText: { color: COLORS.darkGreen, fontSize: 12, fontWeight: '700' },
  dayHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  viewAll: { alignItems: 'center', flexDirection: 'row' },
  viewAllText: { color: COLORS.darkGreen, fontSize: 16, fontWeight: '600' },
  employeeCard: {
    backgroundColor: COLORS.white,
    borderColor: '#D5D5D5',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  employeeTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  employeeName: { color: '#102C17', fontSize: 11, fontWeight: '800' },
  shiftHours: { color: '#102C17', fontSize: 10, fontWeight: '700' },
  employeeActions: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  statusPill: {
    borderRadius: 4,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inStatus: { backgroundColor: COLORS.darkGreen },
  outStatus: { backgroundColor: '#EB0000' },
  progressTrack: {
    backgroundColor: '#D5D5D5',
    borderRadius: 10,
    flexDirection: 'row',
    height: 18,
    marginTop: 20,
    overflow: 'hidden',
  },
  missedProgress: { backgroundColor: '#EB0000', width: '30%' },
  workedProgress: { backgroundColor: '#62B1D8', width: '52%' },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5,
  },
  progressLabel: { alignItems: 'center' },
  progressLabelText: { fontSize: 9, fontWeight: '700' },
  progressValue: { fontSize: 9, fontWeight: '700' },
  biometricHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  biometricCard: {
    backgroundColor: COLORS.white,
    borderColor: '#D5D5D5',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  biometricEmployeeRow: { alignItems: 'center', flexDirection: 'row' },
  photoUploadText: {
    color: COLORS.darkGreen,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  biometricEmployeeDetails: { marginLeft: 14 },
  biometricEmployeeName: { color: '#102C17', fontSize: 16, fontWeight: '800' },
  employeeId: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  biometricStatusRow: {
    alignItems: 'center',
    backgroundColor: '#F7FBF7',
    borderRadius: 10,
    flexDirection: 'row',
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  biometricStatusItem: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  statusIconCircle: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 8,
    width: 36,
  },
  faceStatusIcon: { backgroundColor: '#FFF3D8' },
  fingerprintStatusIcon: { backgroundColor: '#F0E9FB' },
  biometricLabel: { color: '#102C17', fontSize: 12, fontWeight: '800' },
  pendingStatus: {
    color: '#B7791F',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  statusDivider: { backgroundColor: '#D8E9DC', height: 34, width: 1 },
  registrationActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  registrationButton: {
    alignItems: 'center',
    backgroundColor: COLORS.darkGreen,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  registrationButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },
});

export default AdminDashboardRoute;
