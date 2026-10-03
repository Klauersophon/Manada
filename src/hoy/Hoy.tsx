import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'
import Pantalla from '../components/Pantalla'
import { alerta, boton, botonSecundario, tarjeta } from '../components/estilos'
import { useMiembros } from '../hogar/useMiembros'
import type { Hogar } from '../hogar/useMiHogar'
import { especie } from '../mascotas/especies'
import { fechaLocal, hora, ordenarDelDia, responsable, tocaEl } from './calendario'

// Tareas activas de mascotas no archivadas, con lo registrado y asignado para la fecha.
async function buscarDia(circleId: string, fecha: string) {
  const mascotas = await supabase
    .from('pets')
    .select('id, name, species')
    .eq('circle_id', circleId)
    .is('archived_at', null)
    .order('name')
  if (mascotas.error) throw mascotas.error

  const t = await supabase
    .from('care_tasks')
    .select(
      'id, name, icon, time_of_day, weekdays, default_assignee, active, pets!inner(name, species, circle_id, archived_at)',
    )
    .eq('pets.circle_id', circleId)
    .is('pets.archived_at', null)
    .eq('active', true)
  if (t.error) throw t.error

  const ids = t.data.map(x => x.id)
  if (ids.length === 0)
    return { mascotas: mascotas.data, tareas: t.data, registros: [], asignaciones: [] }

  const [r, a] = await Promise.all([
    supabase
      .from('care_logs')
      .select('task_id, done_by, done_by_name, done_at')
      .eq('date', fecha)
      .in('task_id', ids),
    supabase.from('task_assignments').select('task_id, assignee').eq('date', fecha).in('task_id', ids),
  ])
  if (r.error) throw r.error
  if (a.error) throw a.error
  return { mascotas: mascotas.data, tareas: t.data, registros: r.data, asignaciones: a.data }
}

type Dia = Awaited<ReturnType<typeof buscarDia>>

// Mensaje cuando hoy no hay nada que mostrar, según qué le falta al hogar.
function Vacio({ dia, esAdmin }: { dia: Dia; esAdmin: boolean }) {
  if (dia.mascotas.length === 0)
    return (
      <p>
        Todavía no hay mascotas en el hogar.{' '}
        {esAdmin ? (
          <Link to="/hogar" className="underline">Agrega la primera.</Link>
        ) : (
          'Un admin puede agregarlas.'
        )}
      </p>
    )
  if (dia.tareas.length === 0)
    return esAdmin ? (
      <div className="space-y-3">
        <p>Todavía no hay tareas. Define qué hay que hacer con cada mascota:</p>
        <ul className="space-y-2" aria-label="Definir tareas">
          {dia.mascotas.map(m => (
            <li key={m.id}>
              <Link to={`/mascotas/${m.id}`} className={`${boton} block text-center`}>
                {especie(m.species).emoji} Definir tareas de {m.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ) : (
      <p>Todavía no hay tareas. Un admin del hogar puede definirlas.</p>
    )
  return <p>Hoy no hay tareas programadas. 🎉</p>
}

function Hoy({ hogar }: { hogar: Hogar }) {
  const { sesion } = useSesion()
  const yo = sesion?.user.id
  const miembros = useMiembros(hogar.id)
  const [ahora, setAhora] = useState(() => new Date())
  const [dia, setDia] = useState<Dia | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const fecha = fechaLocal(ahora)
  const recargar = () => setVersion(v => v + 1)

  // Al volver a la app (por ejemplo, al día siguiente o después de que otro marcó algo),
  // se recalcula la fecha y se vuelve a cargar.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      setAhora(new Date())
      setVersion(v => v + 1)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  useEffect(() => {
    let vigente = true
    buscarDia(hogar.id, fecha).then(
      d => vigente && setDia(d),
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [hogar.id, fecha, version])

  const titulo = ahora.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  if (!dia)
    return (
      <Pantalla titulo="Hoy" navegacion>
        {error ? <p role="alert" className={alerta}>{error}</p> : <p>Cargando...</p>}
      </Pantalla>
    )

  const nombreDe = (uid: string | null) =>
    uid === yo ? 'ti' : (miembros.find(m => m.user_id === uid)?.display_name ?? 'alguien')
  const registroDe = (id: string) => dia.registros.find(r => r.task_id === id)
  const asignacionDe = (id: string) => dia.asignaciones.find(a => a.task_id === id)

  const delDia = ordenarDelDia(
    dia.tareas.filter(t => tocaEl(t, ahora)).map(t => ({ ...t, mascota: t.pets.name })),
  )
  const pendientes = delDia.filter(t => !registroDe(t.id))
  const hechas = delDia.filter(t => registroDe(t.id))

  async function accion(id: string, hacer: () => PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setOcupado(id)
    setError(null)
    const { error } = await hacer()
    setOcupado(null)
    if (error?.code === '23505') setError('Alguien la marcó justo antes que tú.')
    else if (error) setError('No pudimos guardar el cambio: ' + error.message)
    recargar()
  }

  const marcarHecha = (id: string) =>
    accion(id, () => supabase.from('care_logs').insert({ task_id: id, date: fecha, done_by: yo }))
  const deshacer = (id: string) =>
    accion(id, () =>
      supabase.from('care_logs').delete().eq('task_id', id).eq('date', fecha).eq('done_by', yo!),
    )
  const tomar = (id: string) =>
    accion(id, () =>
      supabase.from('task_assignments').upsert({ task_id: id, date: fecha, assignee: yo }),
    )
  const soltar = (id: string) =>
    accion(id, () => supabase.from('task_assignments').delete().eq('task_id', id).eq('date', fecha))

  return (
    <Pantalla titulo={<span className="first-letter:uppercase">{titulo}</span>} navegacion>
      {delDia.length === 0 ? (
        <section className={tarjeta}>
          <Vacio dia={dia} esAdmin={hogar.esAdmin} />
        </section>
      ) : (
        <>
          <div className="space-y-2">
            <p className="font-semibold">
              {hechas.length} de {delDia.length} hechas
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-green-800">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(hechas.length / delDia.length) * 100}%` }}
              />
            </div>
          </div>

          {pendientes.length > 0 && (
            <ul className="space-y-3" aria-label="Pendientes">
              {pendientes.map(t => {
                const asignacion = asignacionDe(t.id)
                const quien = responsable(t, asignacion)
                const puedoTomar = quien !== yo && (!asignacion || hogar.esAdmin)
                return (
                  <li key={t.id} className={tarjeta}>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl" aria-hidden>{t.icon ?? '🐾'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">{t.name}</p>
                        <p className="text-sm text-white/80">
                          {especie(t.pets.species).emoji} {t.pets.name} · {hora(t.time_of_day)}
                        </p>
                        <p className="text-sm text-white/80">
                          {quien ? `Le toca a ${nombreDe(quien)}` : 'Sin asignar'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => marcarHecha(t.id)}
                        disabled={ocupado === t.id}
                        className={boton}
                      >
                        ✓ Hecho
                      </button>
                      {puedoTomar && (
                        <button
                          onClick={() => tomar(t.id)}
                          disabled={ocupado === t.id}
                          className={`${botonSecundario} shrink-0`}
                        >
                          Lo hago yo
                        </button>
                      )}
                      {asignacion?.assignee === yo && (
                        <button
                          onClick={() => soltar(t.id)}
                          disabled={ocupado === t.id}
                          className={`${botonSecundario} shrink-0`}
                        >
                          Soltar
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {hechas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">Hechas</h2>
              <ul className="space-y-2" aria-label="Hechas">
                {hechas.map(t => {
                  const r = registroDe(t.id)!
                  const cuando = r.done_at
                    ? new Date(r.done_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                    : ''
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl bg-green-800/30 px-4 py-3"
                    >
                      <span className="text-2xl" aria-hidden>✅</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {t.icon ?? '🐾'} {t.name} · {t.pets.name}
                        </p>
                        <p className="text-sm text-white/70">
                          {r.done_by === yo ? 'Tú' : r.done_by_name} · {cuando}
                        </p>
                      </div>
                      {r.done_by === yo && (
                        <button
                          onClick={() => deshacer(t.id)}
                          disabled={ocupado === t.id}
                          className={botonSecundario}
                        >
                          Deshacer
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {error && <p role="alert" className={alerta}>{error}</p>}
    </Pantalla>
  )
}

export default Hoy
