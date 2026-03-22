import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function initialize() {
  const params = new URLSearchParams(window.location.search);
  const meetSdk = params.get('meet_sdk');

  if (meetSdk) {
    console.log('Parâmetro meet_sdk detectado, iniciando handshake...');
    try {
      const { meet } = await import('@googleworkspace/meet-addons');
      await meet.addon.createAddonSession({
        cloudProjectNumber: "1082613234514"
      });
      console.log('✅ Handshake concluído!');
    } catch (e) {
      console.error('❌ Falha no handshake:', e);
    }
  } else {
    console.log('Sem meet_sdk — rodando fora do Meet.');
  }
}

initialize();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);