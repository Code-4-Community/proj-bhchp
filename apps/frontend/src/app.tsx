import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

import apiClient from '@api/apiClient';
import Root from '@containers/root';
import NotFound from '@containers/404';
import Test from '@containers/test';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
  },
  {
    path: '/test',
    element: <Test />,
  },
]);

export const App: React.FC = () => {
  useEffect(() => {
    apiClient.getHello().then((res) => console.log(res));
  }, []);

  return (
    <ChakraProvider value={defaultSystem}>
      <RouterProvider router={router} />
    </ChakraProvider>
  );
};

export default App;
