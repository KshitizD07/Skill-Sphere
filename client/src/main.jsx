// client/src/main.jsx


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/App.css';
// import './index.css'
import App from './app/App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)





