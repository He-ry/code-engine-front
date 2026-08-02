import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
);

