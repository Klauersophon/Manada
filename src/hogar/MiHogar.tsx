import { useCallback, useEffect, useState } from 'react'
import { useEnVivo } from '../lib/enVivo'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { useSesion } from '../auth/sesion'
import Avatar from '../components/Avatar'
import { alerta, etiquetaSeccion, fila } from '../components/estilos'
import { fechaLocal } from '../hoy/calendario'
import Mascotas from '../mascotas/Mascotas'
import { lunesDe } from '../semana/reglas'
import GuardarCuenta from './GuardarCuenta'
import HojaRol from './HojaRol'
import type { Hogar } from './useMiHogar'

type Miembro = { user_id: string; display_name: string; role: string }
type Invitacion = { code: string; expires_at: string }

const linkDe = (code: string) => `${window.location.origin}/unirse/${code}`
const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' })

async function buscarDatos(circleId: string, esAdmin: boolean) {
  const m = await supabase
    .from('memberships')
    .select('user_id, display_name, role')
    .eq('circle_id', circleId)
    .order('joined_at')
  if (m.error) throw m.error

  // RLS solo deja ver las invitaciones a los admins. El conteo de la semana también es solo para
  // admins, como el reparto en Semana.
  if (!esAdmin) return { miembros: m.data, invitaciones: [], hechasPor: new Map<string, number>() }
  const [i, r] = await Promise.all([
    supabase
      .from('invites')
      .select('code, expires_at')
      .eq('circle_id', circleId)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('care_logs')
      .select('done_by, care_tasks!inner(pets!inner(circle_id))')
      .eq('care_tasks.pets.circle_id', circleId)
      .gte('date', fechaLocal(lunesDe(new Date()))),
  ])
  if (i.error) throw i.error
  if (r.error) throw r.error
  const hechasPor = new Map<string, number>()
  for (const { done_by } of r.data) if (done_by) hechasPor.set(done_by, (hechasPor.get(done_by) ?? 0) + 1)
  return { miembros: m.data, invitaciones: i.data, hechasPor }
}

// `onRolPropio` recarga el hogar cuando la persona cambia su propio rol, porque cambia lo que
// puede ver y hacer en toda la app.
function MiHogar({ hogar, onRolPropio }: { hogar: Hogar; onRolPropio: () => void }) {
  const { id, esAdmin } = hogar
  const { sesion } = useSesion()
  const yo = sesion?.user.id
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [hechasPor, setHechasPor] = useState(new Map<string, number>())
  const [hojaDe, setHojaDe] = useState<Miembro | null>(null)
  const cerrarHoja = useCallback(() => setHojaDe(null), [])
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [version, setVersion] = useState(0)
  const cargar = () => setVersion(v => v + 1)

  useEffect(() => {
    let vigente = true
    buscarDatos(id, esAdmin).then(
      d => {
        if (!vigente) return
        setMiembros(d.miembros)
        setInvitaciones(d.invitaciones)
        setHechasPor(d.hechasPor)
      },
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [id, esAdmin, version])

  // Quien se une o cambia de rol aparece sin recargar.
  useEnVivo('manada', [{ tabla: 'memberships', filtro: `circle_id=eq.${id}` }], cargar)

  async function cambiarRol(m: Miembro, rol: 'admin' | 'caregiver') {
    setHojaDe(null)
    if (m.role === rol) return
    setError(null)
    const { error } = await supabase
      .from('memberships')
      .update({ role: rol })
      .eq('circle_id', id)
      .eq('user_id', m.user_id)
    if (error) return setError(error.message)
    if (m.user_id === yo) onRolPropio()
    else cargar()
  }

  async function crearInvitacion() {
    setOcupado(true)
    setError(null)
    // El código y la vigencia de 7 días los pone la base.
    const { error } = await supabase.from('invites').insert({ circle_id: hogar.id })
    setOcupado(false)
    if (error) setError('No pudimos crear la invitación: ' + error.message)
    else cargar()
  }

  async function compartir(code: string) {
    const url = linkDe(code)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Manada', text: `Únete a ${hogar.nombre} en Manada`, url })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setAviso('Link copiado. Pégalo en el chat de tu familia.')
    } catch {
      setAviso('Copia el link de la lista para compartirlo.')
    }
  }

  async function revocar(code: string) {
    const { error } = await supabase.from('invites').update({ revoked: true }).eq('code', code)
    if (error) setError('No pudimos revocar la invitación: ' + error.message)
    else cargar()
  }

  const personas = miembros.length === 1 ? '1 persona' : `${miembros.length} personas`

  return (
    <Pantalla titulo={hogar.nombre} antetitulo={miembros.length ? personas : undefined} navegacion>
      <Mascotas circleId={id} esAdmin={esAdmin} />

      <section className="space-y-2.5">
        <h2 className={etiquetaSeccion}>Miembros</h2>
        <ul className="space-y-2" aria-label="Miembros">
          {miembros.map(m => {
            const contenido = (
              <>
                <Avatar id={m.user_id} nombre={m.display_name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {m.user_id === yo ? `${m.display_name} (tú)` : m.display_name}{' '}
                    <span
                      className={`ml-1 rounded-full border px-2 py-0.5 align-[1px] text-[11px] ${
                        m.role === 'admin' ? 'border-moss font-semibold text-moss' : 'border-line-strong font-medium text-ink-soft'
                      }`}
                    >
                      {m.role === 'admin' ? 'Admin' : 'Miembro'}
                    </span>
                  </span>
                </span>
                {esAdmin && (
                  <span className="text-right">
                    <b className="block font-display text-[21px] leading-none font-bold">{hechasPor.get(m.user_id) ?? 0}</b>
                    <span className="text-[11px] text-ink-faint">esta semana</span>
                  </span>
                )}
              </>
            )
            return (
              <li key={m.user_id}>
                {esAdmin ? (
                  <button
                    onClick={() => setHojaDe(m)}
                    aria-label={`Cambiar el rol de ${m.display_name}`}
                    className={`${fila} w-full text-left active:bg-sage`}
                  >
                    {contenido}
                  </button>
                ) : (
                  <div className={fila}>{contenido}</div>
                )}
              </li>
            )
          })}
        </ul>
        {esAdmin && (
          <p className="text-[12.5px] text-ink-faint">Toca a alguien para darle o quitarle la administración.</p>
        )}
      </section>

      {hogar.esAdmin && (
        <section className="space-y-3 rounded-[14px] bg-ink p-[17px] text-card">
          <h2 className="text-[17px] font-bold">Invitar a tu familia</h2>
          <p className="text-[13.5px] opacity-80">
            El link o el código sirven para varias personas durante 7 días. Puedes revocarlos cuando quieras.
          </p>
          <button
            onClick={crearInvitacion}
            disabled={ocupado}
            className="w-full rounded-xl bg-card px-4 py-3 font-semibold text-ink disabled:opacity-40"
          >
            {ocupado ? 'Creando...' : 'Crear link de invitación'}
          </button>
          <ul className="space-y-2.5" aria-label="Invitaciones activas">
            {invitaciones.map(inv => (
              <li key={inv.code} className="space-y-2 rounded-[10px] bg-card/15 p-3">
                <p className="font-display text-[26px] font-bold tracking-[.18em]" data-codigo>{inv.code}</p>
                <p className="font-mono text-[12px] break-all opacity-75" data-link>{linkDe(inv.code)}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs opacity-75">Vence el {fecha(inv.expires_at)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => compartir(inv.code)}
                      className="rounded-lg bg-card px-3 py-1.5 text-[13px] font-semibold text-ink"
                    >
                      Compartir
                    </button>
                    <button
                      onClick={() => revocar(inv.code)}
                      className="rounded-lg border border-card/40 px-3 py-1.5 text-[13px] font-medium"
                    >
                      Revocar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {aviso && <p className="text-sm">{aviso}</p>}
        </section>
      )}

      {sesion?.user.is_anonymous && <GuardarCuenta />}

      {error && <p role="alert" className={alerta}>{error}</p>}

      {hojaDe && (
        <HojaRol
          miembro={hojaDe}
          esYo={hojaDe.user_id === yo}
          esUltimoAdmin={hojaDe.role === 'admin' && miembros.filter(m => m.role === 'admin').length === 1}
          onElegir={rol => cambiarRol(hojaDe, rol)}
          onCerrar={cerrarHoja}
        />
      )}
    </Pantalla>
  )
}

export default MiHogar
