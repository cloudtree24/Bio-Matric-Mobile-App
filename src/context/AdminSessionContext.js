import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NEAREST_LOCATION_KEY = '@admin_nearest_location';
const SESSION_KEY = '@admin_session';

const AdminSessionContext = createContext({
  isAdminLoggedIn: false,
  isSessionLoading: false,
  signIn: async () => {},
  signOut: async () => {},
  setIsAdminLoggedIn: () => {},
  geofences: [],
  setGeofences: () => {},
  nearestLocation: null,
  saveNearestLocation: async () => {},
  clearNearestLocation: async () => {},
});

export const AdminSessionProvider = ({children}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [geofences, setGeofences] = useState([]);
  const [nearestLocation, setNearestLocation] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const sessionText = await AsyncStorage.getItem(SESSION_KEY);
        if (!sessionText) { return; }
        const session = JSON.parse(sessionText);
        if (!Array.isArray(session.geofences)) { return; }
        const locationText = await AsyncStorage.getItem(NEAREST_LOCATION_KEY);
        let savedLocation = null;
        try {
          savedLocation = locationText ? JSON.parse(locationText) : null;
        } catch (error) {
          console.warn('Could not restore saved location:', error);
        }
        if (active) {
          setGeofences(session.geofences);
          setNearestLocation(savedLocation);
          setIsAdminLoggedIn(true);
        }
      } catch (error) {
        console.warn('Could not restore admin session:', error);
      } finally {
        if (active) { setIsSessionLoading(false); }
      }
    };
    restoreSession();
    return () => { active = false; };
  }, []);

  const signIn = async locations => {
    const safeLocations = Array.isArray(locations) ? locations : [];
    await AsyncStorage.removeItem(NEAREST_LOCATION_KEY);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({geofences: safeLocations}));
    setNearestLocation(null);
    setGeofences(safeLocations);
    setIsAdminLoggedIn(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setIsAdminLoggedIn(false);
    setGeofences([]);
    setNearestLocation(null);
    try {
      await AsyncStorage.removeItem(NEAREST_LOCATION_KEY);
    } catch (error) {
      console.warn('Could not clear saved location:', error);
    }
  };

  const saveNearestLocation = useCallback(async location => {
    await AsyncStorage.setItem(NEAREST_LOCATION_KEY, JSON.stringify(location));
    setNearestLocation(location);
  }, []);

  const clearNearestLocation = async () => {
    setNearestLocation(null);
    await AsyncStorage.removeItem(NEAREST_LOCATION_KEY);
  };

  return (
    <AdminSessionContext.Provider value={{isAdminLoggedIn, isSessionLoading, signIn, signOut, setIsAdminLoggedIn, geofences, setGeofences, nearestLocation, saveNearestLocation, clearNearestLocation}}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => useContext(AdminSessionContext);
