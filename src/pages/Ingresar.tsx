import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'

function traducirError(error: AuthError) {
  switch (error.code) {
    case 'otp_expired':
      return 'El código no es válido o ya venció. Pide uno nuevo.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Se pidieron demasiados correos. Espera unos minutos y vuelve a intentar.'
    default:
      return 'No pudimos completar el ingreso: ' + error.message
  }
}

// El correo trae un enlace y un código. El código existe para la app instalada en iPhone, donde el
// enlace abre Safari y la sesión no llega a la app.
function Ingresar() {
  const { sesion } = useSesion()
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al verificar el código, onAuthStateChange actualiza la sesión y esta línea redirige.
  if (sesion) return <Navigate to="/" replace />

  async function pedirAcceso(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setOcupado(false)
    if (error) setError(traducirError(error))
    else setEnviado(true)
  }

  async function verificarCodigo(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: correo.trim(),
      token: codigo.trim(),
      type: 'email',
    })
    setOcupado(false)
    if (error) setError(traducirError(error))
  }

  function usarOtroCorreo() {
    setEnviado(false)
    setCodigo('')
    setError(null)
  }

  const campo = 'w-full rounded-lg px-3 py-2 text-gray-900 bg-white'
  const boton = 'w-full rounded-lg bg-amber-400 px-3 py-2 font-semibold text-green-950 disabled:opacity-60'

  return (
    <div className="min-h-screen bg-green-900 text-white grid place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-bold text-center">Manada 🐾</h1>

        {!enviado ? (
          <form onSubmit={pedirAcceso} className="space-y-3">
            <label htmlFor="correo" className="block">Tu correo</label>
            <input
              id="correo"
              type="email"
              required
              autoComplete="email"
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              className={campo}
            />
            <button type="submit" disabled={ocupado} className={boton}>
              {ocupado ? 'Enviando...' : 'Enviarme el acceso'}
            </button>
          </form>
        ) : (
          <form onSubmit={verificarCodigo} className="space-y-3">
            <p>
              Te enviamos un correo a <strong>{correo.trim()}</strong>. Toca el enlace, o escribe aquí
              el código:
            </p>
            <input
              id="codigo"
              aria-label="Código del correo"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              className={campo + ' text-center text-2xl tracking-widest'}
            />
            <button type="submit" disabled={ocupado} className={boton}>
              {ocupado ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={usarOtroCorreo} className="w-full underline">
              Usar otro correo
            </button>
          </form>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-900/60 px-3 py-2">{error}</p>}
      </div>
    </div>
  )
}

export default Ingresar
