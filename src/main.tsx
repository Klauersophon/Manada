import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import SesionProvider from './auth/SesionProvider'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SesionProvider>
      <RouterProvider router={router} />
    </SesionProvider>
  </StrictMode>,
)
