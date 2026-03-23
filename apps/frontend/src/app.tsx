import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

import apiClient from '@api/apiClient';
import AdminLanding from '@containers/AdminLanding';
import AdminViewApplication from '@containers/AdminViewApplication';

export const App: React.FC = () => {
  useEffect(() => {
    apiClient.getHello().then((res) => console.log(res));
  }, []);

  // Note: the / to /admin/landing redirect is temporary convenience for development
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/landing" replace />} />
          <Route path="/admin">
            <Route path="/admin/landing" element={<AdminLanding />} />
            <Route
              path="/admin/view-application/:appId"
              element={<AdminViewApplication />}
            />
            <Route path="/admin/settings" />
          </Route>
          <Route path="/candidate">
            <Route path="/candidate/view-application" />
            <Route path="/candidate/upload-forms" />
            <Route path="/candidate/settings" />
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
};

export default App;
