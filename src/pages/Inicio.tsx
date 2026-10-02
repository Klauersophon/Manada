import Pantalla from '../components/Pantalla'
import { alerta } from '../components/estilos'
import Bienvenida from '../hogar/Bienvenida'
import MiHogar from '../hogar/MiHogar'
import { useMiHogar } from '../hogar/useMiHogar'

function Inicio() {
  const { hogar, cargando, error, recargar } = useMiHogar()

  if (cargando) return <Pantalla><p>Cargando...</p></Pantalla>
  if (error) return <Pantalla><p role="alert" className={alerta}>{error}</p></Pantalla>
  return hogar ? <MiHogar hogar={hogar} /> : <Bienvenida onListo={recargar} />
}

export default Inicio
