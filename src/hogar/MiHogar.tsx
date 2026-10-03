import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { useSesion } from '../auth/sesion'
import Avatar from '../components/Avatar'
import { alerta, etiquetaSeccion, fila } from '../components/estilos'
import Mascotas from '../mascotas/Mascotas'
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

  // RLS solo deja ver las invitaciones a los admins.
  if (!esAdmin) return { miembros: m.data, invitaciones: [] }
  const i = await supabase
    .from('invites')
    .select('code, expires_at')
    .eq('circle_id', circleId)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (i.error) throw i.error
  return { miembros: m.data, invitaciones: i.data }
}

function MiHogar({ hogar }: { hogar: Hogar }) {
  const { id, esAdmin } = hogar
  const yo = useSesion().sesion?.user.id
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
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
      },
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [id, esAdmin, version])

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
          {miembros.map(m => (
            <li key={m.user_id} className={fila}>
              <Avatar id={m.user_id} nombre={m.display_name} />
              <span className="min-w-0 flex-1 font-semibold">
                {m.user_id === yo ? `${m.display_name} (tú)` : m.display_name}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  m.role === 'admin' ? 'border-moss font-semibold text-moss' : 'border-line-strong font-medium text-ink-soft'
                }`}
              >
                {m.role === 'admin' ? 'Admin' : 'Miembro'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {hogar.esAdmin && (
        <section className="space-y-3 rounded-[14px] bg-ink p-[17px] text-card">
          <h2 className="text-[17px] font-bold">Invitar a tu familia</h2>
          <p className="text-[13.5px] opacity-80">
            El link sirve para varias personas durante 7 días. Puedes revocarlo cuando quieras.
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
                <p className="font-mono text-sm break-all" data-link>{linkDe(inv.code)}</p>
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

      {error && <p role="alert" className={alerta}>{error}</p>}
    </Pantalla>
  )
}

export default MiHogar
