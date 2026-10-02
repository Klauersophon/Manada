import { createBrowserRouter } from 'react-router'
import Inicio from './pages/Inicio'
import NoEncontrado from './pages/NoEncontrado'

export const router = createBrowserRouter([
  { path: '/', element: <Inicio /> },
  { path: '*', element: <NoEncontrado /> },
])
