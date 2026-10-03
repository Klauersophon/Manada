import { especie } from './especies'
import type { MascotaActiva } from './useMascotas'

const chip = (elegida: boolean) =>
  `flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition ${
    elegida ? 'border-ink bg-ink font-semibold text-card' : 'border-line font-medium text-ink-soft'
  }`
const avatar = (elegida: boolean) =>
  `grid size-[25px] place-items-center rounded-full text-sm ${elegida ? 'bg-white/20' : 'bg-sage-deep'}`

// Chips para elegir mascota, como en la maqueta. `pendientes` marca con un punto las que
// todavía tienen tareas por hacer hoy.
function SelectorMascotas({
  mascotas,
  elegida,
  conTodas = false,
  pendientes,
  onElegir,
}: {
  mascotas: MascotaActiva[]
  elegida: string
  conTodas?: boolean
  pendientes?: Set<string>
  onElegir: (valor: string) => void
}) {
  if (mascotas.length === 0) return null
  return (
    <div
      role="group"
      aria-label="Elegir mascota"
      className="-mx-4 flex gap-[7px] overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]"
    >
      {conTodas && (
        <button aria-pressed={elegida === 'todas'} onClick={() => onElegir('todas')} className={chip(elegida === 'todas')}>
          <span className={avatar(elegida === 'todas')} aria-hidden>🏠</span>
          Todas
        </button>
      )}
      {mascotas.map(m => (
        <button key={m.id} aria-pressed={elegida === m.id} onClick={() => onElegir(m.id)} className={chip(elegida === m.id)}>
          <span className={avatar(elegida === m.id)} aria-hidden>{especie(m.species).emoji}</span>
          {m.name}
          {pendientes?.has(m.id) && (
            <span className="size-1.5 rounded-full bg-sun" aria-label="con tareas pendientes" />
          )}
        </button>
      ))}
    </div>
  )
}

export default SelectorMascotas
