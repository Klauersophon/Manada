import { createBrowserRouter, Navigate } from 'react-router'
import RequiereSesion from './auth/RequiereSesion'
import HogarPagina from './pages/HogarPagina'
import Ingresar from './pages/Ingresar'
import Inicio from './pages/Inicio'
import MascotaPagina from './pages/MascotaPagina'
import NoEncontrado from './pages/NoEncontrado'
import SemanaPagina from './pages/SemanaPagina'
import Unirse from './pages/Unirse'

export const router = createBrowserRouter([
  { path: '/ingresar', element: <Ingresar /> },
  // Pública: quien no tiene sesión puede entrar como invitado desde aquí.
  { path: '/unirse/:codigo', element: <Unirse /> },
  {
    element: <RequiereSesion />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/semana', element: <SemanaPagina /> },
      { path: '/manada', element: <HogarPagina /> },
      // Ruta anterior de la pantalla del hogar, por si alguien la tiene guardada.
      { path: '/hogar', element: <Navigate to="/manada" replace /> },
      { path: '/mascotas', element: <MascotaPagina /> },
      { path: '/mascotas/:id', element: <MascotaPagina /> },
    ],
  },
  { path: '*', element: <NoEncontrado /> },
])
