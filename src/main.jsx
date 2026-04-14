import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppRoot } from '@telegram-apps/telegram-ui'
import '@telegram-apps/telegram-ui/dist/styles.css';


createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/IT-digest_tg">
    <StrictMode>
      <AppRoot appearance="light" platform="base">
        <App />
      </AppRoot>
    </StrictMode>
  </BrowserRouter>
  ,
)
