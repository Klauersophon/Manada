import { Navigate } from 'react-router'
import Pantalla from '../components/Pantalla'
import { alerta } from '../components/estilos'
import MiHogar from '../hogar/MiHogar'
import { useMiHogar } from '../hogar/useMiHogar'

function HogarPagina() {
  const { hogar, cargando, error, recargar } = useMiHogar()

  if (cargando) return <Pantalla><p>Cargando...</p></Pantalla>
  if (error) return <Pantalla><p role="alert" className={alerta}>{error}</p></Pantalla>
  if (!hogar) return <Navigate to="/" replace />
  return <MiHogar hogar={hogar} onRolPropio={recargar} />
}

export default HogarPagina
