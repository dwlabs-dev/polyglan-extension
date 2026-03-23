import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function initialize() {
  const params = new URLSearchParams(window.location.search);
  const meetSdk = params.get('meet_sdk');

  if (meetSdk) {
    console.log('[Polyglan] meet_sdk parameter detected, starting handshake...');
    try {
      const { meet } = await import('@googleworkspace/meet-addons');
      await meet.addon.createAddonSession({
        cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER
      });
      console.log('[Polyglan] ✅ Handshake completed!');
    } catch (e) {
      console.error('[Polyglan] ❌ Handshake failed:', e);
    }
  } else {
    console.log('[Polyglan] No meet_sdk — running outside Google Meet.');
  }
}

// Start initialization
initialize();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
