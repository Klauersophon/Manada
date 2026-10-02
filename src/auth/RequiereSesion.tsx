import { Navigate, Outlet } from 'react-router'
import { useSesion } from './sesion'

// Envuelve las rutas privadas: sin sesión, manda a /ingresar.
function RequiereSesion() {
  const { sesion, cargando } = useSesion()

  if (cargando) return null
  if (!sesion) return <Navigate to="/ingresar" replace />
  return <Outlet />
}

export default RequiereSesion
