import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for offline app shell precaching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[CivicTrack PWA] New app version available.');
  },
  onOfflineReady() {
    console.log('[CivicTrack PWA] CivicTrack app shell cached and ready to work offline.');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
