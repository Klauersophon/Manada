import { createBrowserRouter } from 'react-router'
import RequiereSesion from './auth/RequiereSesion'
import HogarPagina from './pages/HogarPagina'
import Ingresar from './pages/Ingresar'
import Inicio from './pages/Inicio'
import MascotaPagina from './pages/MascotaPagina'
import NoEncontrado from './pages/NoEncontrado'
import Unirse from './pages/Unirse'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Ingresar /> },
  {
    element: <RequiereSesion />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/hogar', element: <HogarPagina /> },
      { path: '/mascotas/:id', element: <MascotaPagina /> },
      { path: '/unirse/:codigo', element: <Unirse /> },
    ],
  },
  { path: '*', element: <NoEncontrado /> },
])
