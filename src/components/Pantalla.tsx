import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { supabase } from '../lib/supabase'

const pestana = ({ isActive }: { isActive: boolean }) =>
  `flex-1 rounded-lg py-2 text-center font-semibold ${isActive ? 'bg-amber-400 text-green-950' : 'bg-green-800/60'}`

// Marco común de las pantallas con sesión: encabezado con salida y contenido centrado. Las
// pestañas Hoy/Hogar solo aparecen cuando la persona ya tiene hogar.
function Pantalla({
  titulo,
  navegacion = false,
  children,
}: {
  titulo?: ReactNode
  navegacion?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-green-900 text-white">
      <header className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <span className="text-xl font-bold">Manada 🐾</span>
        <button onClick={() => supabase.auth.signOut()} className="text-sm underline">
          Cerrar sesión
        </button>
      </header>
      {navegacion && (
        <nav className="mx-auto mb-4 flex max-w-lg gap-2 px-4" aria-label="Secciones">
          <NavLink to="/" end className={pestana}>Hoy</NavLink>
          <NavLink to="/hogar" className={pestana}>Hogar</NavLink>
        </nav>
      )}
      <main className="mx-auto max-w-lg space-y-6 px-4 pb-8">
        {titulo && <h1 className="text-2xl font-bold">{titulo}</h1>}
        {children}
      </main>
    </div>
  )
}

export default Pantalla
