import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

import Root from '@containers/root';
import ApplicantView from '@containers/applicant';
import NotFound from '@containers/404';
import Login from '@containers/login';
import Signup from '@containers/signup';
import RequireAuth from './auth/RequireAuth';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
    errorElement: <NotFound />,
  },
  {
    path: '/signup',
    element: <Signup />,
    errorElement: <NotFound />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <Root />,
        errorElement: <NotFound />,
      },
      {
        path: '/applications/:appId',
        element: <ApplicantView />,
        errorElement: <NotFound />,
      },
    ],
  },
]);

export const App: React.FC = () => {
  return (
    <ChakraProvider value={defaultSystem}>
      <RouterProvider router={router} />
    </ChakraProvider>
  );
};

export default App;
