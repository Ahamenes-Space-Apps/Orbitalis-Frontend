import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import { App } from './App';

const storedTheme = window.localStorage.getItem('orbitalis-theme');
document.documentElement.classList.toggle('dark', storedTheme !== 'light');

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
