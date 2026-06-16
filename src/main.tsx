import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DiscoveryProvider } from './components/DiscoveryProvider'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DiscoveryProvider>
        <App />
      </DiscoveryProvider>
    </BrowserRouter>
  </StrictMode>,
)
