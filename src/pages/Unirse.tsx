import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { alerta, boton, campo, etiquetaCampo, tarjeta } from '../components/estilos'
import { useMiHogar } from '../hogar/useMiHogar'
import { useSesion } from '../auth/sesion'

// Destino del link de invitación. Sin sesión, ofrece entrar como invitado (ingreso anónimo, sin
// correo) o con correo; el correo se puede agregar después desde Manada.
function Unirse() {
  const { sesion, cargando: cargandoSesion } = useSesion()
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
    if (!sesion) return
    let vigente = true
    supabase.rpc('preview_invite', { invite_code: codigo }).then(({ data, error }) => {
      if (!vigente) return
      const fila = error ? undefined : data?.[0]
      setInvitado(fila ? { id: fila.circle_id, nombre: fila.circle_name } : null)
    })
    return () => {
      vigente = false
    }
  }, [codigo, sesion])

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

  async function entrarComoInvitado() {
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    setOcupado(false)
    if (error) setError('No pudimos entrar como invitado: ' + error.message)
  }

  if (cargandoSesion) return <Pantalla><p>Cargando...</p></Pantalla>

  if (!sesion)
    return (
      <Pantalla titulo="Te invitaron a un hogar en Manada">
        <p>Puedes entrar ahora mismo como invitado, sin correo, o ingresar con tu correo.</p>
        <div className="space-y-3">
          <button onClick={entrarComoInvitado} disabled={ocupado} className={boton}>
            {ocupado ? 'Entrando...' : 'Entrar como invitado'}
          </button>
          <Link
            to={`/ingresar?volver=${encodeURIComponent('/unirse/' + codigo)}`}
            className="block w-full rounded-xl border-[1.5px] border-line-strong px-4 py-3 text-center font-semibold text-ink"
          >
            Ingresar con mi correo
          </Link>
        </div>
        <p className="text-[12.5px] leading-normal text-ink-faint">
          Como invitado, tu acceso vive solo en este dispositivo. Guarda tu cuenta con un correo
          desde Manada para no perderlo.
        </p>
        {error && <p role="alert" className={alerta}>{error}</p>}
      </Pantalla>
    )

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
        <label htmlFor="mi-nombre" className={etiquetaCampo}>Tu nombre, como te verán los demás</label>
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
