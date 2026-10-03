import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { alerta, boton, campo, etiquetaCampo, tarjeta } from '../components/estilos'

// Acepta el link completo o solo el código, porque lo más probable es que peguen el link.
function extraerCodigo(valor: string) {
  return valor.trim().split('/unirse/').pop()!.split(/[?#]/)[0]
}

// Primera pantalla de quien todavía no pertenece a un hogar: crearlo o unirse con un código.
function Bienvenida({ onListo }: { onListo: () => void }) {
  const navigate = useNavigate()
  const [nombreHogar, setNombreHogar] = useState('')
  const [miNombre, setMiNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.rpc('create_circle', {
      circle_name: nombreHogar,
      member_name: miNombre,
    })
    setOcupado(false)
    if (error) setError('No pudimos crear el hogar: ' + error.message)
    else onListo()
  }

  function unirse(e: FormEvent) {
    e.preventDefault()
    navigate(`/unirse/${encodeURIComponent(extraerCodigo(codigo))}`)
  }

  return (
    <Pantalla titulo="Te damos la bienvenida a Manada">
      <p>Para empezar, crea el hogar de tus mascotas o únete al de tu familia.</p>

      <form onSubmit={crear} className={tarjeta}>
        <h2 className="text-[17px] font-bold">Crear mi hogar</h2>
        <label htmlFor="nombre-hogar" className={etiquetaCampo}>Nombre del hogar</label>
        <input
          id="nombre-hogar"
          required
          placeholder="Casa Pérez"
          value={nombreHogar}
          onChange={e => setNombreHogar(e.target.value)}
          className={campo}
        />
        <label htmlFor="mi-nombre" className={etiquetaCampo}>Tu nombre, como te verán los demás</label>
        <input
          id="mi-nombre"
          required
          value={miNombre}
          onChange={e => setMiNombre(e.target.value)}
          className={campo}
        />
        <button type="submit" disabled={ocupado} className={boton}>
          {ocupado ? 'Creando...' : 'Crear hogar'}
        </button>
      </form>

      <form onSubmit={unirse} className={tarjeta}>
        <h2 className="text-[17px] font-bold">Tengo una invitación</h2>
        <label htmlFor="codigo-invitacion" className={etiquetaCampo}>Pega el link o el código</label>
        <input
          id="codigo-invitacion"
          required
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          className={campo}
        />
        <button type="submit" className={boton}>Continuar</button>
      </form>

      {error && <p role="alert" className={alerta}>{error}</p>}
    </Pantalla>
  )
}

export default Bienvenida
