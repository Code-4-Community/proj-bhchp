import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AdminLanding from './containers/AdminLanding';
import AdminViewApplication from './containers/AdminViewApplication';
import NotFound from './containers/404';
import RequireAuth from './auth/RequireAuth';
import RequireRole from './auth/RequireRole';
import RoleHomeRedirect from './auth/RoleHomeRedirect';
import { UserType } from './api/types';
import Login from './containers/login';
import Signup from './containers/signup';
import Logout from './containers/logout';

export const App: React.FC = () => {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/logout" element={<Logout />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<RoleHomeRedirect />} />

            <Route
              element={<RequireRole allowedUserTypes={[UserType.ADMIN]} />}
            >
              <Route path="admin" element={<Outlet />}>
                <Route path="landing" element={<AdminLanding />} />
                <Route
                  path="view-application/:appId"
                  element={<AdminViewApplication />}
                />
                <Route path="settings" />
              </Route>
            </Route>

            <Route
              element={<RequireRole allowedUserTypes={[UserType.STANDARD]} />}
            >
              <Route path="candidate" element={<Outlet />}>
                <Route path="view-application" />
                <Route path="upload-forms" />
                <Route path="settings" />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
};

export default App;
