import { createBrowserRouter } from 'react-router'
import RequiereSesion from './auth/RequiereSesion'
import Ingresar from './pages/Ingresar'
import Inicio from './pages/Inicio'
import NoEncontrado from './pages/NoEncontrado'
import Unirse from './pages/Unirse'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Ingresar /> },
  {
    element: <RequiereSesion />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/unirse/:codigo', element: <Unirse /> },
    ],
  },
  { path: '*', element: <NoEncontrado /> },
])
