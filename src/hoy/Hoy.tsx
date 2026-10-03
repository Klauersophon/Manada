import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'
import Aviso, { type DatosAviso } from '../components/Aviso'
import Pantalla from '../components/Pantalla'
import { alerta, boton, botonOscuro, etiquetaSeccion, glifo } from '../components/estilos'
import { useMiembros } from '../hogar/useMiembros'
import type { Hogar } from '../hogar/useMiHogar'
import { especie } from '../mascotas/especies'
import { guardarMascotaElegida, leerMascotaElegida } from '../mascotas/seleccion'
import SelectorMascotas from '../mascotas/SelectorMascotas'
import { cambioDelDia } from './asignacion'
import { fechaLocal, hora, ordenarDelDia, responsable, tocaEl } from './calendario'
import HojaResponsable from './HojaResponsable'

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
      'id, pet_id, name, icon, time_of_day, weekdays, default_assignee, active, pets!inner(name, species, circle_id, archived_at)',
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

// Mensaje cuando hoy no hay nada que mostrar, según qué le falta al hogar o a la mascota elegida.
function Vacio({ dia, esAdmin, mascota }: { dia: Dia; esAdmin: boolean; mascota: string | null }) {
  if (dia.mascotas.length === 0)
    return (
      <p>
        Todavía no hay mascotas en el hogar.{' '}
        {esAdmin ? (
          <Link to="/manada" className="font-semibold underline">Agrega la primera.</Link>
        ) : (
          'Un admin puede agregarlas.'
        )}
      </p>
    )
  const visibles = mascota ? dia.mascotas.filter(m => m.id === mascota) : dia.mascotas
  const sinTareas = visibles.filter(m => !dia.tareas.some(t => t.pet_id === m.id))
  if (sinTareas.length === visibles.length)
    return esAdmin ? (
      <div className="space-y-3">
        <p>Todavía no hay tareas. Define qué hay que hacer con cada mascota:</p>
        <ul className="space-y-2" aria-label="Definir tareas">
          {sinTareas.map(m => (
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

function tituloDelDia(pendientes: number, total: number) {
  if (total === 0) return 'Hoy'
  if (pendientes === 0) return 'Todo listo por hoy'
  return pendientes === 1 ? 'Queda 1 cosa por hacer' : `Quedan ${pendientes} cosas por hacer`
}

function Hoy({ hogar }: { hogar: Hogar }) {
  const { sesion } = useSesion()
  const yo = sesion?.user.id
  const miembros = useMiembros(hogar.id)
  const [ahora, setAhora] = useState(() => new Date())
  const [dia, setDia] = useState<Dia | null>(null)
  const [elegida, setElegida] = useState(() => leerMascotaElegida('hoy') ?? 'todas')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Tarea con la hoja "Quién se encarga" abierta, y aviso con Deshacer tras marcar.
  const [hojaDe, setHojaDe] = useState<string | null>(null)
  const [aviso, setAviso] = useState<DatosAviso | null>(null)
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const cerrarHoja = useCallback(() => setHojaDe(null), [])
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

  const fechaTexto = ahora.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  const antetitulo = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1).replace(',', '')

  if (!dia)
    return (
      <Pantalla titulo="Hoy" antetitulo={antetitulo} navegacion>
        {error ? <p role="alert" className={alerta}>{error}</p> : <p>Cargando...</p>}
      </Pantalla>
    )

  // Si la mascota recordada ya no está (se archivó), se vuelve a "Todas".
  const mascota = dia.mascotas.some(m => m.id === elegida) ? elegida : null
  const elegir = (valor: string) => {
    guardarMascotaElegida('hoy', valor)
    setElegida(valor)
  }

  const nombreDe = (uid: string | null) =>
    uid === yo ? 'ti' : (miembros.find(m => m.user_id === uid)?.display_name ?? 'alguien')
  const registroDe = (id: string) => dia.registros.find(r => r.task_id === id)
  const asignacionDe = (id: string) => dia.asignaciones.find(a => a.task_id === id)

  const delDiaTodas = ordenarDelDia(
    dia.tareas.filter(t => tocaEl(t, ahora)).map(t => ({ ...t, mascota: t.pets.name })),
  )
  const conPendientes = new Set(delDiaTodas.filter(t => !registroDe(t.id)).map(t => t.pet_id))
  const delDia = mascota ? delDiaTodas.filter(t => t.pet_id === mascota) : delDiaTodas
  const pendientes = delDia.filter(t => !registroDe(t.id))
  const hechas = delDia.filter(t => registroDe(t.id))

  type Resultado = { error: { code?: string; message: string } | null }
  async function ejecutar(id: string, hacer: () => PromiseLike<Resultado>) {
    setOcupado(id)
    setError(null)
    const { error } = await hacer()
    setOcupado(null)
    if (error?.code === '23505') setError('Alguien la marcó justo antes que tú.')
    else if (error) setError('No pudimos guardar el cambio: ' + error.message)
    recargar()
    return !error
  }

  const registrar = (id: string) =>
    ejecutar(id, () => supabase.from('care_logs').insert({ task_id: id, date: fecha, done_by: yo }))
  const quitarRegistro = (id: string) =>
    ejecutar(id, () =>
      supabase.from('care_logs').delete().eq('task_id', id).eq('date', fecha).eq('done_by', yo!),
    )

  async function marcarHecha(t: { id: string; name: string }) {
    if (await registrar(t.id)) setAviso({ texto: `Hecho · ${t.name}`, deshacer: () => quitarRegistro(t.id) })
  }
  async function desmarcar(t: { id: string; name: string }) {
    if (await quitarRegistro(t.id)) setAviso({ texto: `Sin hacer · ${t.name}`, deshacer: () => registrar(t.id) })
  }

  async function elegirResponsable(t: { id: string; default_assignee: string | null }, quien: string | null) {
    setHojaDe(null)
    const cambio = cambioDelDia(t.default_assignee, quien)
    const ok = await ejecutar(t.id, () =>
      cambio.tipo === 'borrar'
        ? supabase.from('task_assignments').delete().eq('task_id', t.id).eq('date', fecha)
        : supabase.from('task_assignments').upsert({ task_id: t.id, date: fecha, assignee: cambio.assignee }),
    )
    if (ok)
      setAviso({
        texto: !quien ? 'Hoy sin asignar' : quien === yo ? 'Hoy te toca a ti' : `Hoy le toca a ${nombreDe(quien)}`,
      })
  }

  const enHoja = delDia.find(t => t.id === hojaDe)
  const eventos = hechas
    .map(t => ({ t, r: registroDe(t.id)! }))
    .sort((a, b) => (b.r.done_at ?? '').localeCompare(a.r.done_at ?? ''))
  const horaDe = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <Pantalla
      antetitulo={antetitulo}
      titulo={tituloDelDia(pendientes.length, delDia.length)}
      navegacion
      cabecera={
        <SelectorMascotas
          mascotas={dia.mascotas}
          elegida={mascota ?? 'todas'}
          conTodas
          pendientes={conPendientes}
          onElegir={elegir}
        />
      }
    >
      {delDia.length === 0 ? (
        <section className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 py-5 text-ink-soft">
          <Vacio dia={dia} esAdmin={hogar.esAdmin} mascota={mascota} />
        </section>
      ) : (
        <>
          <div className="-mt-2 space-y-1.5">
            <div className="h-[7px] overflow-hidden rounded-full bg-sage-deep">
              <div
                className="h-full rounded-full bg-moss transition-all duration-500"
                style={{ width: `${(hechas.length / delDia.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-ink-faint">
              {hechas.length} de {delDia.length} hechas
            </p>
          </div>

          <ul className="space-y-[9px]" aria-label="Tareas de hoy">
            {delDia.map(t => {
              const r = registroDe(t.id)
              const deMascota = !mascota && `${especie(t.pets.species).emoji} ${t.pets.name} · `
              if (r) {
                const mia = r.done_by === yo
                return (
                  <li
                    key={t.id}
                    data-estado="hecha"
                    className="flex items-center gap-3 rounded-[14px] border border-l-4 border-moss border-l-moss-deep bg-moss py-3 pr-3 pl-3.5 text-moss-ink"
                  >
                    <span className={`${glifo} bg-white/15`} aria-hidden>{t.icon ?? '🐾'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15.5px] font-semibold">{t.name}</p>
                      <p className="mt-0.5 text-[12.5px] opacity-80">
                        {deMascota}
                        {mia ? 'Tú' : r.done_by_name} · {horaDe(r.done_at)}
                      </p>
                    </div>
                    {mia ? (
                      <button
                        onClick={() => desmarcar(t)}
                        disabled={ocupado === t.id}
                        className="shrink-0 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium"
                      >
                        Deshacer
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        className="grid size-[30px] shrink-0 place-items-center rounded-full border-2 border-white/50 text-sm font-bold"
                      >
                        {r.done_by_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </li>
                )
              }
              const asignacion = asignacionDe(t.id)
              const quien = responsable(t, asignacion)
              const etiqueta = quien ? (quien === yo ? 'te toca a ti' : `le toca a ${nombreDe(quien)}`) : 'sin asignar'
              return (
                <li
                  key={t.id}
                  data-estado="pendiente"
                  className="flex items-center gap-3 rounded-[14px] border border-l-4 border-line border-l-sun bg-card py-3 pr-3 pl-3.5"
                >
                  <span className={glifo} aria-hidden>{t.icon ?? '🐾'}</span>
                  <button
                    onClick={() => setHojaDe(t.id)}
                    aria-label={`Cambiar quién se encarga de ${t.name}`}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-[15.5px] font-semibold tracking-[-.01em]">{t.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">
                      {deMascota}
                      {hora(t.time_of_day)} ·{' '}
                      <b className="border-b border-dashed border-current font-semibold text-sun-deep">
                        {asignacion ? `hoy ${etiqueta}` : etiqueta}
                      </b>
                    </p>
                  </button>
                  <button onClick={() => marcarHecha(t)} disabled={ocupado === t.id} className={botonOscuro}>
                    Hecho
                  </button>
                </li>
              )
            })}
          </ul>

          <section className="space-y-2.5">
            <h2 className={etiquetaSeccion}>Hoy en la manada</h2>
            {eventos.length === 0 ? (
              <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">
                Nadie ha registrado nada todavía. Toca «Hecho» en la primera tarea y aparecerá aquí para todos.
              </p>
            ) : (
              <ul aria-label="Hoy en la manada" className="ml-1.5 border-l-[1.5px] border-line pl-4">
                {eventos.map(({ t, r }) => (
                  <li key={t.id} className="relative py-2 text-sm">
                    <span
                      aria-hidden
                      className="absolute top-3.5 -left-[21px] size-2 rounded-full border-2 border-sage bg-moss"
                    />
                    <b className="font-semibold">{r.done_by === yo ? 'Tú' : r.done_by_name}</b> ·{' '}
                    {t.name.toLowerCase()}
                    {!mascota && ` de ${t.pets.name}`}
                    <span className="ml-1 text-[12.5px] text-ink-faint">{horaDe(r.done_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {error && <p role="alert" className={alerta}>{error}</p>}

      {enHoja && yo && (
        <HojaResponsable
          tarea={{ name: enHoja.name, hora: hora(enHoja.time_of_day) }}
          miembros={miembros}
          yo={yo}
          esAdmin={hogar.esAdmin}
          habitual={enHoja.default_assignee}
          asignacion={asignacionDe(enHoja.id)}
          onElegir={quien => elegirResponsable(enHoja, quien)}
          onCerrar={cerrarHoja}
        />
      )}
      {aviso && <Aviso aviso={aviso} onCerrar={cerrarAviso} />}
    </Pantalla>
  )
}

export default Hoy
