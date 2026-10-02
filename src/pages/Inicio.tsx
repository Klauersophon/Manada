import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'

function Inicio() {
  const { sesion } = useSesion()

  return (
    <div className="min-h-screen bg-green-900 text-white grid place-items-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Hola, {sesion?.user.email} 🐾</h1>
        <button onClick={() => supabase.auth.signOut()} className="underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default Inicio
