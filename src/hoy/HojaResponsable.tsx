import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../components/Avatar'
import type { Miembro } from '../hogar/useMiembros'
import { permisosDelDia } from './asignacion'

const opcion =
  'flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left text-[15px] font-medium aria-pressed:border-ink aria-pressed:bg-sage aria-pressed:font-semibold disabled:opacity-40'

// Hoja de abajo para decidir quién se encarga de una tarea un día puntual: hoy desde "Hoy", o un
// día próximo desde Semana. La rutina habitual se cambia desde la ficha de la mascota.
function HojaResponsable({
  titulo,
  cuando,
  futura = false,
  miembros,
  yo,
  esAdmin,
  habitual,
  asignacion,
  onElegir,
  onCerrar,
}: {
  titulo: string
  // "Solo por hoy · 18:00" o "Domingo 4 · 18:00".
  cuando: string
  futura?: boolean
  miembros: Miembro[]
  yo: string
  esAdmin: boolean
  habitual: string | null
  asignacion?: { assignee: string | null }
  onElegir: (quien: string | null) => void
  onCerrar: () => void
}) {
  const actual = asignacion ? asignacion.assignee : habitual
  const permisos = permisosDelDia(esAdmin, yo, asignacion)
  const nombreDe = (uid: string | null) => miembros.find(m => m.user_id === uid)?.display_name ?? 'alguien'

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  let nota: string
  if (asignacion)
    nota = `Hoy es una excepción. Normalmente ${habitual ? (habitual === yo ? 'te toca a ti' : `le toca a ${nombreDe(habitual)}`) : 'no tiene responsable fijo'}.`
  else if (futura) nota = 'Es un plan, no un compromiso cerrado. Cuando llegue el día se registra igual que cualquier otra tarea.'
  else if (esAdmin) nota = 'Cambia solo el día de hoy. Quién se encarga normalmente se edita en la ficha de la mascota.'
  else nota = 'Puedes encargarte tú. Repartir el trabajo entre otros lo hace quien administra la manada.'

  // Va directo en el body: dentro del contenido, el espaciado entre bloques la levantaría.
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-[rgb(20_28_23/.5)]" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quién se encarga"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card px-4 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom))] text-ink"
      >
        <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-line-strong" aria-hidden />
        <h3 className="text-[19px] font-bold">{titulo}</h3>
        <p className="mb-3.5 text-[13px] text-ink-soft">{cuando}</p>
        <div className="space-y-[7px]">
          {miembros.map(m => (
            <button
              key={m.user_id}
              aria-pressed={actual === m.user_id}
              disabled={!permisos.puedeElegir(m.user_id)}
              onClick={() => onElegir(m.user_id)}
              className={opcion}
            >
              <Avatar id={m.user_id} nombre={m.display_name} tamano="chico" />
              {m.user_id === yo ? (futura ? 'Me apunto yo' : 'Me encargo yo') : m.display_name}
              {actual === m.user_id && <span className="ml-auto text-moss">✓</span>}
            </button>
          ))}
          {permisos.liberar === 'sin-asignar' && (
            <button aria-pressed={actual === null} onClick={() => onElegir(null)} className={opcion}>
              <span className="grid size-[30px] place-items-center rounded-full border-[1.5px] border-dashed border-line-strong text-ink-faint">
                ·
              </span>
              Dejarla sin asignar
              {actual === null && <span className="ml-auto text-moss">✓</span>}
            </button>
          )}
          {permisos.liberar === 'devolver' && (
            <button onClick={() => onElegir(habitual)} className={opcion}>
              <span className="grid size-[30px] place-items-center rounded-full border-[1.5px] border-dashed border-line-strong text-ink-faint">
                ↩
              </span>
              {habitual ? `Devolvérsela a ${nombreDe(habitual)}` : 'Soltarla'}
            </button>
          )}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-ink-faint">{nota}</p>
      </div>
    </>,
    document.body,
  )
}

export default HojaResponsable
