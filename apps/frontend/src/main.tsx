import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

import App from './app';
import { configureAmplify } from './auth/amplify';

configureAmplify();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <ChakraProvider value={defaultSystem}>
    <StrictMode>
      <App />
    </StrictMode>
  </ChakraProvider>,
);
