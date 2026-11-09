import React, {createContext, useContext, useState} from 'react';

const AdminSessionContext = createContext({
  isAdminLoggedIn: false,
  setIsAdminLoggedIn: () => {},
  geofences: [],
  setGeofences: () => {},
});

export const AdminSessionProvider = ({children}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [geofences, setGeofences] = useState([]);

  return (
    <AdminSessionContext.Provider value={{isAdminLoggedIn, setIsAdminLoggedIn, geofences, setGeofences}}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => useContext(AdminSessionContext);
