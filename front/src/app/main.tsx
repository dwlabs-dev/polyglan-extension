import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import '../assets/index.css';
import '../features/addon/assets/addon.css';

async function initialize() {
  const params = new URLSearchParams(window.location.search);
  const meetSdk = params.get('meet_sdk');

  if (meetSdk) {
    console.log('[Polyglan] meet_sdk parameter detected, starting handshake...');
    try {
      const { getMeetSession } = await import('../lib/meet');
      await getMeetSession();
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
