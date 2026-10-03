import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type DatosAviso = { texto: string; deshacer?: () => void }

// Mensaje breve sobre la barra de pestañas, con un "Deshacer" opcional. Se oculta solo.
function Aviso({ aviso, onCerrar }: { aviso: DatosAviso; onCerrar: () => void }) {
  useEffect(() => {
    const t = setTimeout(onCerrar, 4500)
    return () => clearTimeout(t)
  }, [aviso, onCerrar])

  return createPortal(
    <div
      role="status"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-medium whitespace-nowrap text-card shadow-lg"
    >
      {aviso.texto}
      {aviso.deshacer && (
        <button
          onClick={() => {
            aviso.deshacer!()
            onCerrar()
          }}
          className="font-semibold text-sun"
        >
          Deshacer
        </button>
      )}
    </div>,
    document.body,
  )
}

export default Aviso
