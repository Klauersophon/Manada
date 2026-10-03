import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { alerta, boton, botonSecundario, campo, tarjeta } from '../components/estilos'
import { useMiembros, type Miembro } from '../hogar/useMiembros'
import { DIAS, hora, resumenDias } from '../hoy/calendario'

type Tarea = {
  id: string
  name: string
  icon: string | null
  time_of_day: string | null
  weekdays: number[]
  default_assignee: string | null
  active: boolean
}
type DatosTarea = Omit<Tarea, 'id' | 'active'>

// Atajos para las tareas más comunes: eligen el ícono y, si el nombre está vacío, lo completan.
const SUGERENCIAS = [
  { icono: '🚶', nombre: 'Paseo' },
  { icono: '🍽️', nombre: 'Comida' },
  { icono: '💧', nombre: 'Agua' },
  { icono: '💊', nombre: 'Remedio' },
  { icono: '🧹', nombre: 'Limpieza' },
  { icono: '🛁', nombre: 'Baño' },
  { icono: '🎾', nombre: 'Juego' },
]

async function buscarTareas(petId: string) {
  const { data, error } = await supabase
    .from('care_tasks')
    .select('id, name, icon, time_of_day, weekdays, default_assignee, active')
    .eq('pet_id', petId)
    .order('time_of_day', { nullsFirst: false })
    .order('name')
  if (error) throw error
  return data
}

function FormTarea({
  inicial,
  miembros,
  onGuardar,
  onCancelar,
}: {
  inicial?: DatosTarea
  miembros: Miembro[]
  onGuardar: (datos: DatosTarea) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(inicial?.name ?? '')
  const [icono, setIcono] = useState(inicial?.icon ?? '')
  const [horaTarea, setHoraTarea] = useState(inicial?.time_of_day?.slice(0, 5) ?? '')
  const [dias, setDias] = useState<number[]>(inicial?.weekdays ?? [1, 2, 3, 4, 5, 6, 7])
  const [responsable, setResponsable] = useState(inicial?.default_assignee ?? '')
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function alternarDia(valor: number) {
    setDias(d => (d.includes(valor) ? d.filter(x => x !== valor) : [...d, valor].sort()))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (dias.length === 0) return setError('Elige al menos un día.')
    setError(null)
    setOcupado(true)
    await onGuardar({
      name: nombre.trim(),
      icon: icono || null,
      time_of_day: horaTarea || null,
      weekdays: dias,
      default_assignee: responsable || null,
    })
    setOcupado(false)
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-lg bg-green-950/40 p-3">
      <div className="flex flex-wrap gap-2" aria-label="Sugerencias">
        {SUGERENCIAS.map(s => (
          <button
            key={s.nombre}
            type="button"
            aria-pressed={icono === s.icono}
            onClick={() => {
              setIcono(s.icono)
              if (!nombre.trim()) setNombre(s.nombre)
            }}
            className={`rounded-full px-3 py-1 text-sm ${icono === s.icono ? 'bg-amber-400 text-green-950' : 'bg-green-800'}`}
          >
            {s.icono} {s.nombre}
          </button>
        ))}
      </div>

      <label htmlFor="tarea-nombre" className="block">Tarea</label>
      <input
        id="tarea-nombre"
        required
        pattern=".*\S.*"
        placeholder="Paseo de la mañana"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className={campo}
      />

      <label htmlFor="tarea-hora" className="block">Hora (opcional)</label>
      <input
        id="tarea-hora"
        type="time"
        value={horaTarea}
        onChange={e => setHoraTarea(e.target.value)}
        className={campo}
      />

      <fieldset className="space-y-2">
        <legend>Días</legend>
        <div className="flex gap-1">
          {DIAS.map(d => (
            <button
              key={d.valor}
              type="button"
              aria-pressed={dias.includes(d.valor)}
              aria-label={d.largo}
              onClick={() => alternarDia(d.valor)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${dias.includes(d.valor) ? 'bg-amber-400 text-green-950' : 'bg-green-800'}`}
            >
              {d.corto}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="tarea-responsable" className="block">¿A quién le toca normalmente?</label>
      <select
        id="tarea-responsable"
        value={responsable}
        onChange={e => setResponsable(e.target.value)}
        className={campo}
      >
        <option value="">A cualquiera</option>
        {miembros.map(m => (
          <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
        ))}
      </select>

      {error && <p role="alert" className={alerta}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={ocupado} className={boton}>
          {ocupado ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// Tareas que se repiten para una mascota. Solo los admins las crean, editan y pausan; pausar en
// vez de borrar conserva los registros de cuidado.
function TareasDeMascota({
  petId,
  nombreMascota,
  circleId,
  esAdmin,
}: {
  petId: string
  nombreMascota: string
  circleId: string
  esAdmin: boolean
}) {
  const miembros = useMiembros(circleId)
  const [tareas, setTareas] = useState<Tarea[]>([])
  // id de la tarea en edición, 'nueva' al agregar, o null.
  const [editando, setEditando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const recargar = () => setVersion(v => v + 1)

  useEffect(() => {
    let vigente = true
    buscarTareas(petId).then(
      d => vigente && setTareas(d),
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [petId, version])

  const nombreDe = (uid: string | null) =>
    uid ? (miembros.find(m => m.user_id === uid)?.display_name ?? 'Alguien') : 'A cualquiera'

  async function guardar(datos: DatosTarea, id?: string) {
    setError(null)
    const { error } = id
      ? await supabase.from('care_tasks').update(datos).eq('id', id)
      : await supabase.from('care_tasks').insert({ ...datos, pet_id: petId })
    if (error) return setError('No pudimos guardar la tarea: ' + error.message)
    setEditando(null)
    recargar()
  }

  async function cambiarActiva(t: Tarea, active: boolean) {
    setError(null)
    const { error } = await supabase.from('care_tasks').update({ active }).eq('id', t.id)
    if (error) setError('No pudimos actualizar la tarea: ' + error.message)
    else recargar()
  }

  const ordenadas = [...tareas].sort((a, b) => Number(b.active) - Number(a.active))

  return (
    <section className={tarjeta}>
      <h2 className="text-lg font-semibold">Tareas</h2>

      {tareas.length === 0 && editando !== 'nueva' && (
        <p className="text-sm text-white/80">
          {esAdmin
            ? `Todavía no hay tareas para ${nombreMascota}. Agrega la primera: paseo, comida, remedio...`
            : `Todavía no hay tareas para ${nombreMascota}. Un admin del hogar puede definirlas.`}
        </p>
      )}

      <ul className="space-y-3" aria-label="Tareas">
        {ordenadas.map(t =>
          editando === t.id ? (
            <li key={t.id}>
              <FormTarea
                inicial={t}
                miembros={miembros}
                onGuardar={datos => guardar(datos, t.id)}
                onCancelar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li
              key={t.id}
              className={`flex gap-3 rounded-lg bg-green-950/40 p-3 ${t.active ? '' : 'opacity-60'}`}
            >
              <span className="text-2xl" aria-hidden>{t.icon ?? '🐾'}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">
                  {t.name}
                  {!t.active && <span className="ml-2 text-xs font-normal">(pausada)</span>}
                </p>
                <p className="text-sm text-white/70">
                  {hora(t.time_of_day)} · {resumenDias(t.weekdays)} · {nombreDe(t.default_assignee)}
                </p>
                {esAdmin && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditando(t.id)} className={botonSecundario}>
                      Editar
                    </button>
                    <button onClick={() => cambiarActiva(t, !t.active)} className={botonSecundario}>
                      {t.active ? 'Pausar' : 'Reactivar'}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ul>

      {esAdmin &&
        (editando === 'nueva' ? (
          <FormTarea
            miembros={miembros}
            onGuardar={datos => guardar(datos)}
            onCancelar={() => setEditando(null)}
          />
        ) : (
          <button onClick={() => setEditando('nueva')} className={boton}>
            Agregar tarea
          </button>
        ))}

      {error && <p role="alert" className={alerta}>{error}</p>}
    </section>
  )
}

export default TareasDeMascota
