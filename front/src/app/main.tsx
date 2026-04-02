import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import '../assets/index.css';
import { AuthProvider } from '../context/AuthContext';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
