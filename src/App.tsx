import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [estado, setEstado] = useState('probando...')

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ error }) => setEstado(error ? 'error: ' + error.message : 'conectado ✓'))
      .catch(e => setEstado('error: ' + e.message))
  }, [])

  return (
    <div className="min-h-screen bg-green-900 text-white grid place-items-center">
      <h1 className="text-3xl font-bold">Manada 🐾 — {estado}</h1>
    </div>
  )
}

export default App