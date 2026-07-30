import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CameraProvider } from './context/CameraProvider'
import './styles/global.css'
import './styles/kim.css'
import './styles/ministry.css'
import './styles/sandbox3d.css'
import './styles/world.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CameraProvider>
      <App />
    </CameraProvider>
  </StrictMode>,
)
