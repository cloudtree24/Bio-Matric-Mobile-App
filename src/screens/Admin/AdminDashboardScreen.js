import React, {useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import AppHeader from '../../components/AppHeader';
import {COLORS} from '../../constants/colors';
import {ROUTES} from '../../constants/routes';

const TABS = ['OverView', 'Day', 'Biometric'];

const SegmentedTabs = ({activeTab, onSelect}) => (
  <View style={styles.tabs}>
    {TABS.map(tab => (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{selected: activeTab === tab}}
        key={tab}
        onPress={() => onSelect(tab)}
        style={[styles.tab, activeTab === tab && styles.tabActive]}>
        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
          {tab}
        </Text>
      </Pressable>
    ))}
  </View>
);

const DonutChart = () => (
  <View style={styles.donut}>
    <View style={[styles.arc, styles.blueArc]} />
    <View style={[styles.arc, styles.redArc]} />
    <View style={styles.donutCenter} />
    <Text style={styles.bluePercent}>20 %</Text>
    <Text style={styles.redPercent}>30 %</Text>
    <Text style={styles.greenPercent}>50 %</Text>
  </View>
);

const Legend = ({color, label}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, {backgroundColor: color}]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const Overview = () => (
  <>
    <View style={styles.overviewCard}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>All Employee</Text>
        <View style={styles.downloadWrap}>
          <Icon name="document-text-outline" color="#2A5B69" size={34} />
          <Icon name="download" color="#2A5B69" size={19} style={styles.downloadIcon} />
          <Text style={styles.downloadText}>Download</Text>
        </View>
      </View>
      <DonutChart />
      <View style={styles.legend}>
        <Legend color="#85F69C" label="Present" />
        <Legend color="#EB0000" label="Absent" />
        <Legend color="#62B1D8" label="Not yet" />
      </View>
    </View>
    <View style={styles.periodCard}>
      <View style={styles.periodTabs}>
        <PeriodTab icon="calendar-outline" label="Month" active />
        <PeriodTab icon="calendar-outline" label="Week" />
        <PeriodTab icon="calendar-outline" label="Day" />
      </View>
    </View>
  </>
);

const PeriodTab = ({active = false, icon, label}) => (
  <View style={[styles.periodTab, active && styles.periodTabActive]}>
    <Icon color={active ? COLORS.white : COLORS.darkGreen} name={icon} size={25} />
    <Text style={[styles.periodText, active && styles.periodTextActive]}>{label}</Text>
  </View>
);

const Filter = ({icon, label}) => (
  <Pressable accessibilityRole="button" style={styles.filter}>
    <Icon color="#444444" name={icon} size={26} />
    <Text style={styles.filterText}>{label}</Text>
    <Icon color="#444444" name="chevron-down" size={30} />
  </Pressable>
);

const EmployeeCard = ({name, status, statusStyle}) => (
  <View style={styles.employeeCard}>
    <View style={styles.employeeTopRow}>
      <View>
        <Text style={styles.employeeName}>{name} (A2_12M)</Text>
        <Text style={styles.shiftHours}>Shift Hours 10:00 - 19:00</Text>
      </View>
      <View style={styles.employeeActions}>
        <Text style={[styles.statusPill, statusStyle]}>{status}</Text>
        <Icon color="#4D4D4D" name="information-circle" size={34} />
      </View>
    </View>
    <View style={styles.progressTrack}>
      <View style={styles.missedProgress} />
      <View style={styles.workedProgress} />
    </View>
    <View style={styles.progressLabels}>
      <ProgressLabel color="#EB0000" label="Missed" value="20%" />
      <ProgressLabel color="#62B1D8" label="Worked" value="60%" />
      <ProgressLabel color="#CFCFCF" label="Remaining" value="20%" />
    </View>
  </View>
);

const ProgressLabel = ({color, label, value}) => (
  <View style={styles.progressLabel}>
    <Text style={[styles.progressLabelText, {color}]}>{label}</Text>
    <Text style={[styles.progressValue, {color}]}>{value}</Text>
  </View>
);

const DayView = () => (
  <>
    <View style={styles.filters}>
      <Filter icon="briefcase-outline" label="Department" />
      <Filter icon="person" label="Designation" />
    </View>
    <View style={styles.dayHeading}>
      <Text style={styles.cardTitle}>All Employee</Text>
      <Pressable accessibilityRole="button" style={styles.viewAll}>
        <Text style={styles.viewAllText}>View All</Text>
        <Icon color={COLORS.darkGreen} name="chevron-forward" size={20} />
      </Pressable>
    </View>
    <EmployeeCard name="Abhishek Kumar" status="In" statusStyle={styles.inStatus} />
    <EmployeeCard name="Sonu Kumar" status="Out" statusStyle={styles.outStatus} />
  </>
);

const RegistrationButton = ({icon, label}) => (
  <Pressable accessibilityRole="button" style={styles.registrationButton}>
    <Icon color={COLORS.white} name={icon} size={18} />
    <Text style={styles.registrationButtonText}>{label}</Text>
  </Pressable>
);

const BiometricEmployeeCard = () => (
  <View style={styles.biometricCard}>
    <View style={styles.biometricEmployeeRow}>
      <Pressable
        accessibilityLabel="Upload employee profile photo"
        accessibilityRole="button"
        style={styles.photoUpload}>
        <Icon color={COLORS.darkGreen} name="person-circle-outline" size={34} />
        {/* <Text style={styles.photoUploadText}>Profile{`\n`}Photo</Text> */}
      </Pressable>
      <View style={styles.biometricEmployeeDetails}>
        <Text style={styles.biometricEmployeeName}>Abhishek Kumar</Text>
        <Text style={styles.employeeId}>Employee ID: A2_12M</Text>
      </View>
    </View>

    <View style={styles.biometricStatusRow}>
      <View style={styles.biometricStatusItem}>
        <View style={[styles.statusIconCircle, styles.faceStatusIcon]}>
          <Icon color="#B7791F" name="scan-outline" size={22} />
        </View>
        <View>
          <Text style={styles.biometricLabel}>Face</Text>
          <Text style={styles.pendingStatus}>Pending</Text>
        </View>
      </View>
      <View style={styles.statusDivider} />
      <View style={styles.biometricStatusItem}>
        <View style={[styles.statusIconCircle, styles.fingerprintStatusIcon]}>
          <Icon color="#7B61A8" name="finger-print-outline" size={22} />
        </View>
        <View>
          <Text style={styles.biometricLabel}>Fingerprint</Text>
          <Text style={styles.pendingStatus}>Pending</Text>
        </View>
      </View>
    </View>

    <View style={styles.registrationActions}>
      <RegistrationButton icon="scan-outline" label="Face Register" />
      <RegistrationButton icon="finger-print-outline" label="Fingerprint Register" />
    </View>
  </View>
);

const BiometricView = () => (
  <>
    <View style={styles.filters}>
      <Filter icon="briefcase-outline" label="Department" />
      <Filter icon="person" label="Designation" />
    </View>
    <View style={styles.biometricHeading}>
      <Pressable accessibilityRole="button" style={styles.viewAll}>
        <Text style={styles.viewAllText}>View All</Text>
        <Icon color={COLORS.darkGreen} name="chevron-forward" size={20} />
      </Pressable>
      <Text style={styles.cardTitle}>All Employee</Text>
    </View>
    <BiometricEmployeeCard />
  </>
);

const AdminDashboardScreen = ({navigation}) => {
  const [activeTab, setActiveTab] = useState('OverView');
  const isDayView = activeTab === 'Day';
  const isBiometricView = activeTab === 'Biometric';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showNavigation />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <View style={styles.titleIcons}>
            <View style={styles.bellCircle}>
              <Icon color="#7CB454" name="notifications" size={20} />
            </View>
            <Icon color="#7CB454" name="person-circle" size={38} />
          </View>
        </View>
        <View style={styles.registerUserSection}>
          <View style={styles.registerUserHeading}>
            <Icon color={COLORS.darkGreen} name="person-add-outline" size={28} />
            <Text style={styles.cardTitle}>Register User</Text>
          </View>
          <Text style={styles.registerUserDescription}>
            Open registration to enroll an employee's face.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROUTES.REGISTER)}
            style={({pressed}) => [
              styles.registerUserButton,
              pressed && styles.registerUserButtonPressed,
            ]}>
            <Text style={styles.registerUserButtonText}>Register User</Text>
            <Icon color={COLORS.white} name="arrow-forward" size={20} />
          </Pressable>
        </View>
        <SegmentedTabs activeTab={activeTab} onSelect={setActiveTab} />
        {isDayView ? <DayView /> : isBiometricView ? <BiometricView /> : <Overview />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.lightGreen},
  content: {padding: 18, paddingBottom: 36},
  registerUserSection: {backgroundColor: COLORS.white, borderColor: COLORS.primary, borderRadius: 14, borderWidth: 1, marginTop: 20, padding: 18},
  registerUserHeading: {alignItems: 'center', flexDirection: 'row', gap: 10},
  registerUserDescription: {color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 10},
  registerUserButton: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12},
  registerUserButtonPressed: {opacity: 0.8},
  registerUserButtonText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
  titleRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  title: {color: COLORS.darkGreen, fontSize: 24, fontWeight: '800'},
  titleIcons: {alignItems: 'center', flexDirection: 'row', gap: 12},
  bellCircle: {alignItems: 'center', borderColor: COLORS.primary, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36},
  tabs: {borderColor: COLORS.darkGreen, borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginTop: 14, overflow: 'hidden'},
  tab: {alignItems: 'center', borderRightColor: COLORS.darkGreen, borderRightWidth: 1, flex: 1, justifyContent: 'center', minHeight: 38},
  tabActive: {backgroundColor: COLORS.darkGreen},
  tabText: {color: COLORS.darkGreen, fontSize: 14, fontWeight: '800'},
  tabTextActive: {color: COLORS.white},
  overviewCard: {backgroundColor: COLORS.white, borderColor: COLORS.darkGreen, borderRadius: 14, borderWidth: 1, marginTop: 14, minHeight: 270, padding: 20},
  cardTitleRow: {flexDirection: 'row', justifyContent: 'space-between'},
  cardTitle: {color: '#102C17', fontSize: 17, fontWeight: '800'},
  downloadWrap: {alignItems: 'center'},
  downloadIcon: {bottom: 14, left: 14, position: 'absolute'},
  downloadText: {color: COLORS.primary, fontSize: 8, fontWeight: '700', marginTop: -8},
  donut: {alignSelf: 'center', backgroundColor: '#54F66A', borderRadius: 70, height: 140, marginTop: 8, overflow: 'hidden', width: 140},
  arc: {borderColor: 'transparent', borderRadius: 70, borderWidth: 20, height: 140, left: 0, position: 'absolute', top: 0, width: 140},
  blueArc: {borderLeftColor: '#62B1D8', borderTopColor: '#62B1D8', transform: [{rotate: '-45deg'}]},
  redArc: {borderBottomColor: '#EB0000', borderLeftColor: '#EB0000', transform: [{rotate: '10deg'}]},
  donutCenter: {backgroundColor: COLORS.white, borderRadius: 50, height: 100, left: 20, position: 'absolute', top: 20, width: 100},
  bluePercent: {color: COLORS.white, fontSize: 8, fontWeight: '800', left: 23, position: 'absolute', top: 30},
  redPercent: {bottom: 29, color: COLORS.white, fontSize: 8, fontWeight: '800', left: 22, position: 'absolute'},
  greenPercent: {color: COLORS.white, fontSize: 8, fontWeight: '800', position: 'absolute', right: 4, top: 78},
  legend: {flexDirection: 'row', justifyContent: 'center', marginTop: 12},
  legendItem: {alignItems: 'center', flexDirection: 'row', marginHorizontal: 5},
  legendDot: {borderRadius: 8, height: 16, marginRight: 5, width: 16},
  legendText: {color: '#102C17', fontSize: 13},
  periodCard: {backgroundColor: COLORS.white, borderColor: '#102C17', borderRadius: 14, borderWidth: 1, marginTop: 38, padding: 20},
  periodTabs: {borderColor: COLORS.darkGreen, borderRadius: 12, borderWidth: 1, flexDirection: 'row', overflow: 'hidden'},
  periodTab: {alignItems: 'center', backgroundColor: '#D5F3E3', borderRightColor: COLORS.darkGreen, borderRightWidth: 1, flex: 1, flexDirection: 'row', height: 46, justifyContent: 'center'},
  periodTabActive: {backgroundColor: COLORS.darkGreen},
  periodText: {color: COLORS.darkGreen, fontSize: 14, fontWeight: '800', marginLeft: 4},
  periodTextActive: {color: COLORS.white},
  filters: {flexDirection: 'row', gap: 16, marginTop: 32},
  filter: {alignItems: 'center', backgroundColor: COLORS.white, borderColor: '#D5D5D5', borderRadius: 10, borderWidth: 1, flex: 1, flexDirection: 'row', height: 46, justifyContent: 'space-around', paddingHorizontal: 8},
  filterText: {color: COLORS.darkGreen, fontSize: 12, fontWeight: '700'},
  dayHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28},
  viewAll: {alignItems: 'center', flexDirection: 'row'},
  viewAllText: {color: COLORS.darkGreen, fontSize: 16, fontWeight: '600'},
  employeeCard: {backgroundColor: COLORS.white, borderColor: '#D5D5D5', borderRadius: 12, borderWidth: 1, marginTop: 18, padding: 14},
  employeeTopRow: {flexDirection: 'row', justifyContent: 'space-between'},
  employeeName: {color: '#102C17', fontSize: 11, fontWeight: '800'},
  shiftHours: {color: '#102C17', fontSize: 10, fontWeight: '700'},
  employeeActions: {alignItems: 'center', flexDirection: 'row', gap: 12},
  statusPill: {borderRadius: 4, color: COLORS.white, fontSize: 10, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6},
  inStatus: {backgroundColor: COLORS.darkGreen},
  outStatus: {backgroundColor: '#EB0000'},
  progressTrack: {backgroundColor: '#D5D5D5', borderRadius: 10, flexDirection: 'row', height: 18, marginTop: 20, overflow: 'hidden'},
  missedProgress: {backgroundColor: '#EB0000', width: '30%'},
  workedProgress: {backgroundColor: '#62B1D8', width: '52%'},
  progressLabels: {flexDirection: 'row', justifyContent: 'space-around', marginTop: 5},
  progressLabel: {alignItems: 'center'},
  progressLabelText: {fontSize: 9, fontWeight: '700'},
  progressValue: {fontSize: 9, fontWeight: '700'},
  biometricHeading: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28},
  biometricCard: {backgroundColor: COLORS.white, borderColor: '#D5D5D5', borderRadius: 14, borderWidth: 1, marginTop: 18, padding: 16},
  biometricEmployeeRow: {alignItems: 'center', flexDirection: 'row'},
  photoUploadText: {color: COLORS.darkGreen, fontSize: 10, fontWeight: '700', lineHeight: 13, marginTop: 2, textAlign: 'center'},
  biometricEmployeeDetails: {marginLeft: 14},
  biometricEmployeeName: {color: '#102C17', fontSize: 16, fontWeight: '800'},
  employeeId: {color: '#667085', fontSize: 12, fontWeight: '600', marginTop: 5},
  biometricStatusRow: {alignItems: 'center', backgroundColor: '#F7FBF7', borderRadius: 10, flexDirection: 'row', marginTop: 18, paddingHorizontal: 10, paddingVertical: 12},
  biometricStatusItem: {alignItems: 'center', flex: 1, flexDirection: 'row'},
  statusIconCircle: {alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', marginRight: 8, width: 36},
  faceStatusIcon: {backgroundColor: '#FFF3D8'},
  fingerprintStatusIcon: {backgroundColor: '#F0E9FB'},
  biometricLabel: {color: '#102C17', fontSize: 12, fontWeight: '800'},
  pendingStatus: {color: '#B7791F', fontSize: 11, fontWeight: '700', marginTop: 2},
  statusDivider: {backgroundColor: '#D8E9DC', height: 34, width: 1},
  registrationActions: {flexDirection: 'row', gap: 10, marginTop: 18},
  registrationButton: {alignItems: 'center', backgroundColor: COLORS.darkGreen, borderRadius: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 42, paddingHorizontal: 8},
  registrationButtonText: {color: COLORS.white, fontSize: 11, fontWeight: '800', marginLeft: 5},
});

export default AdminDashboardScreen;
