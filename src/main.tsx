import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SidePanelUri from './SidePanelUri.tsx'

const root = createRoot(document.getElementById('root')!);

const renderApp = () => {
  const path = window.location.pathname;
  
  if (path === '/sidepaineluri') {
    return <SidePanelUri />;
  }
  
  return <App />;
};

root.render(
  <StrictMode>
    {renderApp()}
  </StrictMode>,
)
