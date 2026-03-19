import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { meet } from '@googleworkspace/meet-addons';
import App from './App';
import './index.css';

async function initialize() {
  console.log('Iniciando handshake com Google Meet SDK...');
  try {
    await meet.addon.createAddonSession({
      cloudProjectNumber: "792576089745"
    });
    console.log('✅ Google Meet Add-on: Handshake concluído com sucesso!');
  } catch (e) {
    console.error('❌ Google Meet Add-on: Falha no handshake.', e);
  }
}

initialize();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
