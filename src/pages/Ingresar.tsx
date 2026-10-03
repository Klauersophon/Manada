import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'
import { leerCorreo, recordarCorreo } from '../auth/correoRecordado'
import { rutaDeVuelta } from '../auth/volver'
import { alerta, boton, campo, etiquetaCampo } from '../components/estilos'

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

// El correo trae un enlace y un código. El código existe para la app instalada en el celular, donde
// el enlace abre el navegador y la sesión no llega a la app. Cada navegador o app instalada guarda
// su propia sesión, así que el código se pide una vez en cada uno.
function Ingresar() {
  const { sesion } = useSesion()
  const [params] = useSearchParams()
  const volver = rutaDeVuelta(params)
  const [correo, setCorreo] = useState(leerCorreo)
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al verificar el código, onAuthStateChange actualiza la sesión y esta línea redirige.
  if (sesion) return <Navigate to={volver} replace />

  async function pedirAcceso(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { emailRedirectTo: window.location.origin + volver },
    })
    setOcupado(false)
    if (error) return setError(traducirError(error))
    recordarCorreo(correo.trim())
    setEnviado(true)
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

  return (
    <div className="grid min-h-dvh place-items-center bg-sage px-6 py-9 text-ink">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto size-[74px]" />
          <h1 className="text-[29px] leading-tight font-extrabold">Manada</h1>
        </div>
        <p className="text-center text-[14.5px] leading-normal text-ink-soft">
          Te enviaremos un código a tu correo. Solo lo pedimos la primera vez en cada dispositivo;
          después entras directo.
        </p>

        {!enviado ? (
          <form onSubmit={pedirAcceso} className="space-y-3">
            <label htmlFor="correo" className={etiquetaCampo}>Tu correo</label>
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
              Te enviamos un correo a <strong>{correo.trim()}</strong>. Escribe aquí el código:
            </p>
            <p className="text-[12.5px] leading-normal text-ink-faint">
              También puedes tocar el botón del correo, pero si tienes Manada instalada en el celular,
              usa el código: el botón abre el navegador y la sesión quedaría allá.
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
              className={`${campo} text-center font-display text-[26px] font-bold tracking-[.3em]`}
            />
            <button type="submit" disabled={ocupado} className={boton}>
              {ocupado ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={usarOtroCorreo} className="w-full pt-2 text-[13.5px] text-ink-soft underline underline-offset-[3px]">
              Usar otro correo
            </button>
          </form>
        )}

        {error && <p role="alert" className={alerta}>{error}</p>}
      </div>
    </div>
  )
}

export default Ingresar
