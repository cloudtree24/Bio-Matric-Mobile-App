import React, {createContext, useContext, useState} from 'react';

const AdminSessionContext = createContext({
  isAdminLoggedIn: false,
  setIsAdminLoggedIn: () => {},
});

export const AdminSessionProvider = ({children}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  return (
    <AdminSessionContext.Provider value={{isAdminLoggedIn, setIsAdminLoggedIn}}>
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => useContext(AdminSessionContext);
