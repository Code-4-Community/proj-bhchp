import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AdminLanding from './containers/AdminLanding';
import AdminViewApplication from './containers/AdminViewApplication';
import CandidateViewApplication from './containers/CandidateViewApplication';
import NotFound from './containers/404';
import RequireAuth from './auth/RequireAuth';
import RequireRole from './auth/RequireRole';
import RoleHomeRedirect from './auth/RoleHomeRedirect';
import { UserType } from './api/types';
import Login from './containers/login';
import PasswordReset from './containers/PasswordReset';
import FormsPage from '@containers/FormsPage';
import CreateNewAdmin from '@containers/CreateNewAdmin';

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
          <Route path="/password-reset" element={<PasswordReset />} />

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
                <Route path="create" element={<CreateNewAdmin />} />
              </Route>
            </Route>

            <Route
              element={<RequireRole allowedUserTypes={[UserType.STANDARD]} />}
            >
              <Route path="candidate" element={<Outlet />}>
                <Route
                  path="view-application"
                  element={<CandidateViewApplication />}
                />
                <Route path="upload-forms" element={<FormsPage />} />
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
