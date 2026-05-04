import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppRoot } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();      
  tg.expand();
}


const meta = document.createElement('meta');
meta.name = 'color-scheme';
meta.content = 'light only';
document.head.appendChild(meta);

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/IT-digest_tg">
    <StrictMode>
      <AppRoot platform="base">
        <App />
      </AppRoot>
    </StrictMode>
  </BrowserRouter>
);