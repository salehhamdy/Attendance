import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './modules/auth/index.js';
import { I18nProvider } from './shared/i18n/index.js';
import { ToastProvider } from './shared/ui/index.js';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  </BrowserRouter>
);
