import React from 'react';

import AppNavigator from './src/navigation/AppNavigator';
import {AdminSessionProvider} from './src/context/AdminSessionContext';

const App = () => (
  <AdminSessionProvider>
    <AppNavigator />
  </AdminSessionProvider>
);

export default App;
