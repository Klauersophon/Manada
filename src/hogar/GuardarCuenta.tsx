import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { alerta, boton, campo, etiquetaCampo, tarjeta } from '../components/estilos'

// Quien entró como invitado solo tiene acceso en este dispositivo. Al agregar un correo la misma
// cuenta se conserva (con su hogar y su historial) y se puede abrir desde cualquier lugar.
function GuardarCuenta() {
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pedirCodigo(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ email: correo.trim() })
    setOcupado(false)
    if (error) setError('No pudimos enviar el correo: ' + error.message)
    else setEnviado(true)
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      email: correo.trim(),
      token: codigo.trim(),
      type: 'email_change',
    })
    setOcupado(false)
    // Si sale bien, la sesión deja de ser anónima y este bloque desaparece solo.
    if (error) setError('El código no es válido o ya venció. Pide uno nuevo.')
  }

  return (
    <section className={tarjeta}>
      <h2 className="text-[17px] font-bold">Guarda tu cuenta</h2>
      <p className="text-[13.5px] leading-normal text-ink-soft">
        Entraste como invitado: tu acceso vive solo en este dispositivo. Agrega un correo para no
        perder tu lugar en la manada si cambias de celular.
      </p>
      {!enviado ? (
        <form onSubmit={pedirCodigo} className="space-y-3">
          <label htmlFor="correo-cuenta" className={etiquetaCampo}>Tu correo</label>
          <input
            id="correo-cuenta"
            type="email"
            required
            autoComplete="email"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            className={campo}
          />
          <button type="submit" disabled={ocupado} className={boton}>
            {ocupado ? 'Enviando...' : 'Enviarme un código'}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmar} className="space-y-3">
          <p>Te enviamos un correo a <strong>{correo.trim()}</strong>. Escribe aquí el código:</p>
          <input
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
            {ocupado ? 'Verificando...' : 'Guardar cuenta'}
          </button>
        </form>
      )}
      {error && <p role="alert" className={alerta}>{error}</p>}
    </section>
  )
}

export default GuardarCuenta
