import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { enLista, useEnVivo } from '../lib/enVivo'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'
import Avatar from '../components/Avatar'
import Aviso, { type DatosAviso } from '../components/Aviso'
import { alerta, etiquetaSeccion } from '../components/estilos'
import { useMiembros } from '../hogar/useMiembros'
import type { Hogar } from '../hogar/useMiHogar'
import { cambioDelDia } from '../hoy/asignacion'
import { DIAS, fechaLocal, hora } from '../hoy/calendario'
import HojaResponsable from '../hoy/HojaResponsable'
import { celdaDe, type Celda } from './reglas'

async function buscarSemana(petId: string, desde: string, hasta: string) {
  const t = await supabase
    .from('care_tasks')
    .select('id, name, icon, time_of_day, weekdays, default_assignee, active, created_at')
    .eq('pet_id', petId)
    .order('time_of_day', { nullsFirst: false })
    .order('name')
  if (t.error) throw t.error
  const ids = t.data.map(x => x.id)
  if (ids.length === 0) return { tareas: t.data, registros: [], asignaciones: [] }

  const [r, a] = await Promise.all([
    supabase
      .from('care_logs')
      .select('task_id, date, done_by, done_by_name')
      .gte('date', desde)
      .lte('date', hasta)
      .in('task_id', ids),
    supabase
      .from('task_assignments')
      .select('task_id, date, assignee')
      .gte('date', desde)
      .lte('date', hasta)
      .in('task_id', ids),
  ])
  if (r.error) throw r.error
  if (a.error) throw a.error
  return { tareas: t.data, registros: r.data, asignaciones: a.data }
}

type DatosSemana = Awaited<ReturnType<typeof buscarSemana>>
type Tarea = DatosSemana['tareas'][number]

const circulo = 'inline-grid size-[26px] place-items-center rounded-full text-[10.5px] font-bold tracking-[-.02em]'

// Cuadrícula de una mascota para una semana: lo hecho hasta hoy y el plan de los días que vienen.
function Semana({
  hogar,
  mascota,
  dias,
}: {
  hogar: Hogar
  mascota: { id: string; name: string }
  dias: Date[]
}) {
  const yo = useSesion().sesion?.user.id
  const miembros = useMiembros(hogar.id)
  const [datos, setDatos] = useState<DatosSemana | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [hoja, setHoja] = useState<{ tarea: Tarea; dia: Date } | null>(null)
  const [aviso, setAviso] = useState<DatosAviso | null>(null)
  const cerrarHoja = useCallback(() => setHoja(null), [])
  const cerrarAviso = useCallback(() => setAviso(null), [])
  const desde = fechaLocal(dias[0])
  const hasta = fechaLocal(dias[6])
  const hoy = new Date()
  const hoyStr = fechaLocal(hoy)

  useEffect(() => {
    let vigente = true
    buscarSemana(mascota.id, desde, hasta).then(
      d => vigente && setDatos(d),
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [mascota.id, desde, hasta, version])

  const idsTareas = datos?.tareas.map(t => t.id) ?? []
  useEnVivo(
    'semana',
    [
      ...(idsTareas.length
        ? [
            { tabla: 'care_logs' as const, filtro: enLista('task_id', idsTareas) },
            { tabla: 'task_assignments' as const, filtro: enLista('task_id', idsTareas) },
          ]
        : []),
      { tabla: 'care_tasks', filtro: `pet_id=eq.${mascota.id}` },
    ],
    () => setVersion(v => v + 1),
  )

  if (!datos) return error ? <p role="alert" className={alerta}>{error}</p> : <p>Cargando...</p>

  const nombreDe = (uid: string | null) => miembros.find(m => m.user_id === uid)?.display_name ?? 'alguien'
  const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase()
  // Las tareas pausadas solo aparecen si tienen algo registrado esa semana.
  const filas = datos.tareas.filter(t => t.active || datos.registros.some(r => r.task_id === t.id))
  const registroDe = (t: Tarea, fecha: string) => datos.registros.find(r => r.task_id === t.id && r.date === fecha)
  const asignacionDe = (t: Tarea, fecha: string) =>
    datos.asignaciones.find(a => a.task_id === t.id && a.date === fecha)
  const primerFuturo = dias.findIndex(d => fechaLocal(d) > hoyStr)
  const diaTexto = (d: Date) => `${DIAS[d.getDay() === 0 ? 6 : d.getDay() - 1].largo} ${d.getDate()}`

  if (filas.length === 0)
    return (
      <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">
        Todavía no hay tareas para {mascota.name}.{' '}
        {hogar.esAdmin && (
          <Link to={`/mascotas/${mascota.id}`} className="font-semibold underline">Defínelas en su ficha.</Link>
        )}
      </p>
    )

  async function planificar(t: Tarea, dia: Date, quien: string | null) {
    setHoja(null)
    setError(null)
    const fecha = fechaLocal(dia)
    const cambio = cambioDelDia(t.default_assignee, quien)
    const { error } =
      cambio.tipo === 'borrar'
        ? await supabase.from('task_assignments').delete().eq('task_id', t.id).eq('date', fecha)
        : await supabase.from('task_assignments').upsert({ task_id: t.id, date: fecha, assignee: cambio.assignee })
    setVersion(v => v + 1)
    if (error) return setError('No pudimos guardar el plan: ' + error.message)
    const dicho = !quien ? 'sin asignar' : quien === yo ? 'te apuntaste' : `queda ${nombreDe(quien)}`
    setAviso({ texto: `${diaTexto(dia)} · ${dicho}` })
  }

  function vistaCelda(t: Tarea, d: Date, celda: Celda) {
    if (celda.tipo === 'no-toca') return <span className="text-sm text-ink-faint">·</span>
    if (celda.tipo === 'hecha')
      return <span title={celda.por} className={`${circulo} bg-moss text-moss-ink`}>{inicial(celda.por)}</span>
    if (celda.tipo === 'sin-registro')
      return <span title="Sin registrar" className={`${circulo} border-[1.5px] border-dashed border-line-strong`} />
    const nombre = celda.quien ? nombreDe(celda.quien) : null
    return (
      <button
        onClick={() => setHoja({ tarea: t, dia: d })}
        aria-label={`Planificar ${t.name} el ${diaTexto(d)}`}
        title={nombre ?? 'Sin asignar'}
        className={`${circulo} border-[1.5px] border-sun text-sun-deep active:scale-90 ${
          nombre ? 'bg-sun/35' : 'border-dashed font-medium opacity-65'
        }`}
      >
        {nombre ? inicial(nombre) : '+'}
      </button>
    )
  }

  // Reparto de lo hecho hasta hoy en esta semana, por persona.
  const hechos = datos.registros.filter(r => r.date <= hoyStr)
  const conteo = (uid: string) => hechos.filter(r => r.done_by === uid).length

  return (
    <>
      <div className="overflow-x-auto rounded-[14px] border border-line bg-card px-2.5 pt-3 pb-2">
        <table className="w-full border-collapse text-[13px]" aria-label={`Semana de ${mascota.name}`}>
          <thead>
            <tr>
              <th className="w-[38%] pb-2 pl-0.5 text-left text-[11.5px] font-semibold text-ink-faint">Tarea</th>
              {dias.map((d, i) => {
                const f = fechaLocal(d)
                return (
                  <th
                    key={f}
                    className={`pb-2 text-center text-[11.5px] leading-tight font-semibold ${
                      f === hoyStr ? 'text-ink' : f > hoyStr ? 'bg-sun/7 text-sun-deep' : 'text-ink-faint'
                    } ${i === primerFuturo && i > 0 ? 'border-l-[1.5px] border-dashed border-line-strong' : ''}`}
                  >
                    {DIAS[i].corto}
                    <span className="block text-[10px] font-medium opacity-70">{d.getDate()}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map(t => (
              <tr key={t.id}>
                <td className="py-1.5 pr-1.5 pl-0.5 text-left text-[13px] leading-tight text-ink-soft">
                  {t.icon ?? '🐾'} {t.name}
                </td>
                {dias.map((d, i) => {
                  const f = fechaLocal(d)
                  const celda = celdaDe(t, d, hoy, registroDe(t, f), asignacionDe(t, f))
                  return (
                    <td
                      key={f}
                      data-tarea={t.name}
                      data-fecha={f}
                      data-tipo={celda.tipo}
                      className={`py-1 text-center ${f > hoyStr ? 'bg-sun/7' : ''} ${
                        i === primerFuturo && i > 0 ? 'border-l-[1.5px] border-dashed border-line-strong' : ''
                      }`}
                    >
                      {vistaCelda(t, d, celda)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3.5 flex flex-wrap gap-3.5 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><i className="size-[11px] rounded-full bg-moss" />Hecho</span>
          <span className="flex items-center gap-1.5">
            <i className="size-[11px] rounded-full border-[1.5px] border-sun bg-sun/35" />Previsto
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-[11px] rounded-full border-[1.5px] border-dashed border-line-strong" />Sin registrar
          </span>
        </div>
      </div>
      {primerFuturo !== -1 && (
        <p className="text-center text-[12.5px] text-ink-faint">
          Toca una casilla de los próximos días para repartir la semana por adelantado.
        </p>
      )}

      {hogar.esAdmin && primerFuturo !== 0 && miembros.length > 0 && (
        <section className="space-y-2.5">
          <h2 className={etiquetaSeccion}>
            Cómo se repartió{' '}
            <span className="ml-1 rounded-full border border-line px-2 py-px text-[11px] font-medium text-ink-faint">
              Solo admins lo ven
            </span>
          </h2>
          <ul className="space-y-2" aria-label="Reparto de la semana">
            {miembros.map(m => {
              const n = conteo(m.user_id)
              const pc = hechos.length ? Math.round((n / hechos.length) * 100) : 0
              return (
                <li key={m.user_id} className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-3.5 py-3">
                  <Avatar id={m.user_id} nombre={m.display_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.user_id === yo ? 'Tú' : m.display_name}</span>
                    <span className="text-[12.5px] text-ink-soft">{pc}% de lo que va de semana</span>
                  </span>
                  <span className="text-right">
                    <b className="block font-display text-[21px] leading-none font-bold">{n}</b>
                    <span className="text-[11px] text-ink-faint">{n === 1 ? 'tarea' : 'tareas'}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {error && <p role="alert" className={alerta}>{error}</p>}

      {hoja && yo && (
        <HojaResponsable
          titulo={hoja.tarea.name}
          cuando={`${diaTexto(hoja.dia).replace(/^./, c => c.toUpperCase())} · ${hora(hoja.tarea.time_of_day)}`}
          futura
          miembros={miembros}
          yo={yo}
          esAdmin={hogar.esAdmin}
          habitual={hoja.tarea.default_assignee}
          asignacion={asignacionDe(hoja.tarea, fechaLocal(hoja.dia))}
          onElegir={quien => planificar(hoja.tarea, hoja.dia, quien)}
          onCerrar={cerrarHoja}
        />
      )}
      {aviso && <Aviso aviso={aviso} onCerrar={cerrarAviso} />}
    </>
  )
}

export default Semana
