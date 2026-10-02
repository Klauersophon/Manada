import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { alerta, boton, campo, tarjeta } from '../components/estilos'
import { useMiHogar } from '../hogar/useMiHogar'

// Destino del link de invitación. Si la persona no tenía sesión, llega aquí después de ingresar.
function Unirse() {
  const { codigo = '' } = useParams()
  const navigate = useNavigate()
  const { hogar: hogarActual, cargando } = useMiHogar()
  // undefined mientras carga, null si el código no sirve.
  const [invitado, setInvitado] = useState<{ id: string; nombre: string } | null | undefined>(
    undefined,
  )
  const [miNombre, setMiNombre] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    supabase.rpc('preview_invite', { invite_code: codigo }).then(({ data, error }) => {
      if (!vigente) return
      const fila = error ? undefined : data?.[0]
      setInvitado(fila ? { id: fila.circle_id, nombre: fila.circle_name } : null)
    })
    return () => {
      vigente = false
    }
  }, [codigo])

  async function unirme(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.rpc('accept_invite', {
      invite_code: codigo,
      member_name: miNombre,
    })
    setOcupado(false)
    if (error) setError('No pudimos unirte: ' + error.message)
    else navigate('/', { replace: true })
  }

  if (cargando || invitado === undefined) return <Pantalla><p>Cargando...</p></Pantalla>

  if (invitado === null)
    return (
      <Pantalla titulo="Invitación no válida">
        <p>Este link no existe, venció o fue revocado. Pide uno nuevo a quien te invitó.</p>
        <Link to="/" className="underline">Ir al inicio</Link>
      </Pantalla>
    )

  // Abrir el link del propio hogar no es un error: basta con ir al inicio.
  if (hogarActual?.id === invitado.id) return <Navigate to="/" replace />

  // Mientras la app muestre un solo hogar, unirse a un segundo dejaría a la persona sin verlo.
  if (hogarActual)
    return (
      <Pantalla titulo="Ya tienes un hogar">
        <p>
          Ya perteneces a <strong>{hogarActual.nombre}</strong>. Por ahora Manada maneja un hogar
          por persona, así que no puedes unirte a <strong>{invitado.nombre}</strong>.
        </p>
        <Link to="/" className="underline">Ir a mi hogar</Link>
      </Pantalla>
    )

  return (
    <Pantalla titulo={`Te invitaron a ${invitado.nombre}`}>
      <form onSubmit={unirme} className={tarjeta}>
        <label htmlFor="mi-nombre" className="block">Tu nombre, como te verán los demás</label>
        <input
          id="mi-nombre"
          required
          value={miNombre}
          onChange={e => setMiNombre(e.target.value)}
          className={campo}
        />
        <button type="submit" disabled={ocupado} className={boton}>
          {ocupado ? 'Uniéndote...' : 'Unirme'}
        </button>
      </form>
      {error && <p role="alert" className={alerta}>{error}</p>}
    </Pantalla>
  )
}

export default Unirse
