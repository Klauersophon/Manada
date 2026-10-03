import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../components/Avatar'

const opcion =
  'flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left aria-pressed:border-ink aria-pressed:bg-sage disabled:opacity-40'

// Hoja para que un admin cambie el rol de un miembro. La base impide dejar el hogar sin admin;
// aquí se avisa antes para no llegar al error.
function HojaRol({
  miembro,
  esYo,
  esUltimoAdmin,
  onElegir,
  onCerrar,
}: {
  miembro: { user_id: string; display_name: string; role: string }
  esYo: boolean
  esUltimoAdmin: boolean
  onElegir: (rol: 'admin' | 'caregiver') => void
  onCerrar: () => void
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  const opciones = [
    { rol: 'admin' as const, titulo: 'Admin', detalle: 'Invita, edita mascotas y tareas, y reparte el trabajo' },
    { rol: 'caregiver' as const, titulo: 'Miembro', detalle: 'Registra lo que hace y se apunta a tareas' },
  ]

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-[rgb(20_28_23/.5)]" onClick={onCerrar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rol en el hogar"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[22px] bg-card px-4 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom))] text-ink"
      >
        <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-line-strong" aria-hidden />
        <div className="mb-3.5 flex items-center gap-3">
          <Avatar id={miembro.user_id} nombre={miembro.display_name} />
          <div>
            <h3 className="text-[19px] font-bold">{esYo ? 'Tú' : miembro.display_name}</h3>
            <p className="text-[13px] text-ink-soft">Qué puede hacer en el hogar</p>
          </div>
        </div>
        <div className="space-y-[7px]">
          {opciones.map(o => (
            <button
              key={o.rol}
              aria-pressed={miembro.role === o.rol}
              disabled={o.rol === 'caregiver' && esUltimoAdmin}
              onClick={() => onElegir(o.rol)}
              className={opcion}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{o.titulo}</span>
                <span className="block text-xs text-ink-faint">{o.detalle}</span>
              </span>
              {miembro.role === o.rol && <span className="text-moss">✓</span>}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-ink-faint">
          {esUltimoAdmin
            ? 'Es la única persona que administra. Nombra a alguien más antes de quitarle el rol, o el hogar se queda sin quien pueda invitar ni editar.'
            : 'Puede haber varias personas administrando a la vez. El hogar nunca puede quedar sin admin.'}
        </p>
      </div>
    </>,
    document.body,
  )
}

export default HojaRol
