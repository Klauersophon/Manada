import Pantalla from '../components/Pantalla'
import { alerta } from '../components/estilos'
import Bienvenida from '../hogar/Bienvenida'
import { useMiHogar } from '../hogar/useMiHogar'
import Hoy from '../hoy/Hoy'

// El inicio es la vista del día. Quien todavía no tiene hogar ve la bienvenida.
function Inicio() {
  const { hogar, cargando, error, recargar } = useMiHogar()

  if (cargando) return <Pantalla><p>Cargando...</p></Pantalla>
  if (error) return <Pantalla><p role="alert" className={alerta}>{error}</p></Pantalla>
  return hogar ? <Hoy hogar={hogar} /> : <Bienvenida onListo={recargar} />
}

export default Inicio
