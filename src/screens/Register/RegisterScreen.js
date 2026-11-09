import React from 'react';
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
import CheckInCard from '../../components/CheckInCard';
import { ROUTES } from '../../constants/routes';

const AssignmentField = ({ label, placeholder, required, dropdown }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <View style={styles.fieldInput}>
      <Text style={styles.placeholder}>{placeholder}</Text>
      {dropdown && <Icon name="chevron-down" size={18} color="#75827A" />}
    </View>
  </View>
);

const RegisterScreen = ({ navigation }) => (
  <SafeAreaView style={styles.safeArea}>
    <AppHeader />
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={20} color="#07583C" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Register employees</Text>

      <View style={styles.card}>
        <AssignmentField
          label="Select Employees Tyep"
          placeholder="Employees Tyep"
          required
          dropdown
        />
        <AssignmentField
          label="Select Branch"
          placeholder="Select Branch"
          required
          dropdown
        />
        <AssignmentField
          label="Select Department"
          placeholder="Select Department"
          dropdown
        />
        <AssignmentField
          label="Select Designation"
          placeholder="Select Designation"
          dropdown
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={styles.saveButton}
        >
          <Icon name="save-outline" size={17} color="#FFFFFF" />
          <Text style={styles.saveText}>View Employee </Text>
        </Pressable>
        <Text style={styles.formHint}>View All employees</Text>
      </View>

      <Text style={styles.sectionTitle}>Already registered?</Text>
      <CheckInCard
        accessibilityLabel="Face Check-In Test"
        onPress={() => navigation.navigate(ROUTES.FACE_CHECK_IN_TEST)}
      />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBF8' },
  content: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 16,
  },
  backText: { color: '#07583C', fontSize: 13, fontWeight: '500' },
  title: { color: '#0A3425', fontSize: 25, fontWeight: '800' , marginBottom: 5},
  subtitle: {
    color: '#718078',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFEEE5',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingCopy: { flex: 1 },
  cardTitle: { color: '#153C2D', fontSize: 17, fontWeight: '800' },
  cardSubtitle: {
    color: '#788A80',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  field: { marginBottom: 16 },
  fieldLabel: {
    color: '#344D40',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  required: { color: '#DC5959' },
  fieldInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E3DA',
    backgroundColor: '#FAFCFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholder: { color: '#89978F', fontSize: 13 },
  saveButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8EB9A2',
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  formHint: { color: '#788A80', fontSize: 11, marginTop: 10 },
  sectionTitle: {
    color: '#426050',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 25,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DFEEE5',
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: '#153C2D', fontSize: 15, fontWeight: '800' },
  actionSubtitle: {
    color: '#788A80',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  pressed: { opacity: 0.75 },
});

export default RegisterScreen;
