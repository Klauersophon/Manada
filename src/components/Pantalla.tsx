import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

// Marco común de las pantallas con sesión: encabezado con salida y contenido centrado.
function Pantalla({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-green-900 text-white">
      <header className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <span className="text-xl font-bold">Manada 🐾</span>
        <button onClick={() => supabase.auth.signOut()} className="text-sm underline">
          Cerrar sesión
        </button>
      </header>
      <main className="mx-auto max-w-lg space-y-6 px-4 pb-8">
        {titulo && <h1 className="text-2xl font-bold">{titulo}</h1>}
        {children}
      </main>
    </div>
  )
}

export default Pantalla
