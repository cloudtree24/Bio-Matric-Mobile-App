import React, { useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';

// Employee users
const SearchUserIdName = [
  { id: 'TCT10', name: 'Abhishek' },
  { id: 'TCT11', name: 'Rahul' },
  { id: 'TCT12', name: 'Amit' },
  { id: 'TCT13', name: 'Suresh' },
  { id: 'TCT14', name: 'Rakesh' },
  { id: 'TCT15', name: 'Priya' },
  { id: 'TCT16', name: 'Neha' },
  { id: 'TCT17', name: 'Ankit' },
  { id: 'TCT18', name: 'Pooja' },
  { id: 'TCT19', name: 'Vikash' },
];

// Admin users
const SearchAdminIdName = [
  { id: 'TCT20', name: 'Ramesh' },
  { id: 'TCT21', name: 'Sanjay' },
  { id: 'TCT22', name: 'Kiran' },
  { id: 'TCT23', name: 'Anjali' },
];

const UserSubmitScreen = ({ navigation }) => {
  const scrollViewRef = useRef(null);
  const formOffsetY = useRef(0);
  const inputOffsetY = useRef(0);
  const [userId, setUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Get users according to selected role
  const getUsers = role => {
    return role === 'Employee' ? SearchUserIdName : SearchAdminIdName;
  };

  // Keep the input and its normal-flow dropdown above the keyboard. The
  // KeyboardAvoidingView supplies the keyboard-safe viewport; ScrollView moves
  // this section into that viewport without blurring the TextInput.
  const scrollToSearchResults = () => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, formOffsetY.current + inputOffsetY.current - 24),
      });
    });
  };

  // Search users
  const updateUserId = value => {
    setUserId(value);
    setError('');

    const searchText = value.trim().toLowerCase();

    // If input is empty, hide results
    if (!searchText) {
      setSearchResults([]);
      return;
    }

    const users = getUsers(selectedRole);

    const results = users
      .filter(user => {
        const id = user.id.toLowerCase();
        const name = user.name.toLowerCase();

        return id.includes(searchText) || name.includes(searchText);
      })
      .map(user => ({
        ...user,
        role: selectedRole,
      }));

    setSearchResults(results);
    scrollToSearchResults();
  };

  // Select user from search result
  const selectUser = user => {
    setUserId(user.id);
    setSearchResults([]);
    setError('');

    Keyboard.dismiss();

    navigation.navigate(
      selectedRole === 'Employee' ? ROUTES.REGISTER : ROUTES.ADMIN_DASHBOARD,
      {
        userId: user.id,
        userName: user.name,
      },
    );
  };

  // Submit manually
  const submitUserId = () => {
    const searchText = userId.trim().toLowerCase();

    if (!searchText) {
      setError('Please enter User ID or Name');
      return;
    }

    const users = getUsers(selectedRole);

    const user = users.find(item => {
      return (
        item.id.toLowerCase() === searchText ||
        item.name.toLowerCase() === searchText
      );
    });

    if (!user) {
      setError('Invalid User ID or Name');
      setSearchResults([]);
      return;
    }

    selectUser(user);
  };

  // Change Admin / Employee
  const selectRole = role => {
    Keyboard.dismiss();

    setSelectedRole(role);
    setUserId('');
    setSearchResults([]);
    setError('');
  };







  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          {/* IMAGE */}
          <Image
            accessibilityLabel="Employee login illustration"
            resizeMode="contain"
            source={require('../../assets/login.png')}
            style={styles.heroImage}
          />

          <View
            onLayout={event => {
              formOffsetY.current = event.nativeEvent.layout.y;
            }}
            style={styles.form}
          >
            {/* ADMIN / EMPLOYEE TOGGLE */}
            <View style={styles.roleToggle}>
              {['Admin', 'Employee'].map(role => {
                const isSelected = selectedRole === role;

                return (
                  <Pressable
                    key={role}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: isSelected,
                    }}
                    onPress={() => selectRole(role)}
                    style={[
                      styles.roleButton,
                      isSelected && styles.roleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        isSelected && styles.roleTextSelected,
                      ]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* LABEL */}
            <Text style={styles.label}>User Id / Name</Text>

            {/* INPUT + SEARCH RESULTS */}
            <View
              onLayout={event => {
                inputOffsetY.current = event.nativeEvent.layout.y;
              }}
              style={styles.inputContainer}
            >
              <TextInput
                accessibilityLabel="User ID / Name"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={updateUserId}
                onFocus={scrollToSearchResults}
                onSubmitEditing={submitUserId}
                placeholder="Enter Your User ID"
                placeholderTextColor="#D5D5D5"
                returnKeyType="done"
                style={styles.input}
                value={userId}
              />

              {/* SEARCH RESULTS */}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((user, index) => (
                    <Pressable
                      key={user.id}
                      onPress={() => selectUser(user)}
                      style={[
                        styles.userItem,
                        index === searchResults.length - 1 &&
                          styles.lastUserItem,
                      ]}
                    >
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>

                        <Text style={styles.userId}>{user.id}</Text>
                      </View>

                      <Text style={styles.userRole}>{user.role}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* ERROR */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* SUBMIT BUTTON */}
            <Pressable
              accessibilityRole="button"
              onPress={submitUserId}
              style={styles.submitButton}
            >
              <Text style={styles.submitText}>SUBMIT</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 60,
  },

  heroImage: {
    alignSelf: 'center',
    height: 240,
    marginTop: 50,
    maxWidth: 330,
    width: '82%',
  },

  form: {
    marginTop: 35,
    paddingHorizontal: 30,
  },

  /* ROLE TOGGLE */

  roleToggle: {
    backgroundColor: COLORS.darkGreen,
    borderColor: COLORS.darkGreen,
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: 'row',
    height: 56,
    overflow: 'hidden',
  },

  roleButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  roleSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },

  roleText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },

  roleTextSelected: {
    color: COLORS.white,
  },

  /* LABEL */

  label: {
    color: COLORS.darkGreen,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 40,
  },

  /* INPUT CONTAINER */

  inputContainer: {
    position: 'relative',
    zIndex: 100,
  },

  /* INPUT */

  input: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.darkGreen,
    borderRadius: 20,
    borderWidth: 2,
    color: COLORS.darkGreen,
    fontSize: 20,
    height: 60,
    marginTop: 17,
    paddingHorizontal: 25,
  },

  /* SEARCH DROPDOWN */

  searchResults: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.darkGreen,
    borderRadius: 15,
    borderWidth: 1,
    elevation: 8,
    marginTop: 6,
    // The parent ScrollView owns scrolling, so every result stays reachable.
  },

  /* USER ROW */

  userItem: {
    alignItems: 'center',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 65,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  lastUserItem: {
    borderBottomWidth: 0,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    color: COLORS.darkGreen,
    fontSize: 17,
    fontWeight: '700',
  },

  userId: {
    color: '#777',
    fontSize: 14,
    marginTop: 3,
  },

  userRole: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },

  /* ERROR */

  error: {
    color: '#C62828',
    fontSize: 14,
    marginTop: 8,
  },

  /* SUBMIT */

  submitButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderColor: COLORS.darkGreen,
    borderRadius: 20,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginTop: 24,
  },

  submitText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
});

export default UserSubmitScreen;
