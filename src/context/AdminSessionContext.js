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
  companyId: null,
  employeeId: null,
  operatorId: null,
  geofences: [],
  setGeofences: () => {},
  nearestLocation: null,
  saveNearestLocation: async () => {},
  clearNearestLocation: async () => {},
});

export const AdminSessionProvider = ({children}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [operatorId, setOperatorId] = useState(null);
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
        if (!Array.isArray(session.geofences) || !session.companyId) { return; }
        const locationText = await AsyncStorage.getItem(NEAREST_LOCATION_KEY);
        let savedLocation = null;
        try {
          savedLocation = locationText ? JSON.parse(locationText) : null;
        } catch (error) {
          console.warn('Could not restore saved location:', error);
        }
        if (active) {
          setCompanyId(session.companyId);
          setEmployeeId(session.employeeId || null);
          setOperatorId(session.operatorId || null);
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

  const signIn = async ({companyId: nextCompanyId, geofences: locations, employeeId: nextEmployeeId = null, operatorId: nextOperatorId = null}) => {
    if (!nextCompanyId) { throw new Error('Company ID is missing from the login response.'); }
    const safeLocations = Array.isArray(locations) ? locations : [];
    await AsyncStorage.removeItem(NEAREST_LOCATION_KEY);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({companyId: nextCompanyId, geofences: safeLocations, employeeId: nextEmployeeId, operatorId: nextOperatorId}));
    setNearestLocation(null);
    setCompanyId(nextCompanyId);
    setEmployeeId(nextEmployeeId);
    setOperatorId(nextOperatorId);
    setGeofences(safeLocations);
    setIsAdminLoggedIn(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setIsAdminLoggedIn(false);
    setCompanyId(null);
    setEmployeeId(null);
    setOperatorId(null);
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
    <AdminSessionContext.Provider value={{isAdminLoggedIn, isSessionLoading, signIn, signOut, setIsAdminLoggedIn, companyId, employeeId, operatorId, geofences, setGeofences, nearestLocation, saveNearestLocation, clearNearestLocation}}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => useContext(AdminSessionContext);
