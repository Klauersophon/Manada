import { useEffect, useState } from 'react'
import { verificarConexion } from '../lib/supabase'

function Inicio() {
  const [estado, setEstado] = useState('probando...')

  useEffect(() => {
    verificarConexion()
      .then(() => setEstado('conectado ✓'))
      .catch(e => setEstado('error: ' + e.message))
  }, [])

  return (
    <div className="min-h-screen bg-green-900 text-white grid place-items-center">
      <h1 className="text-3xl font-bold">Manada 🐾 — {estado}</h1>
    </div>
  )
}

export default Inicio
