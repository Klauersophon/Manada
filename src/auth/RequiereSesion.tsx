import { Navigate, Outlet, useLocation } from 'react-router'
import { useSesion } from './sesion'

// Envuelve las rutas privadas: sin sesión, manda a /ingresar y recuerda a dónde volver.
function RequiereSesion() {
  const { sesion, cargando } = useSesion()
  const { pathname } = useLocation()

  if (cargando) return null
  if (!sesion) {
    const volver = pathname === '/' ? '' : `?volver=${encodeURIComponent(pathname)}`
    return <Navigate to={`/ingresar${volver}`} replace />
  }
  return <Outlet />
}

export default RequiereSesion
