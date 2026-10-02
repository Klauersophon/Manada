import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { SesionContext, type EstadoSesion } from './sesion'

function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ sesion: null, cargando: true })

  useEffect(() => {
    // onAuthStateChange emite INITIAL_SESSION al suscribirse, después de procesar el enlace del
    // correo si la URL lo trae, así que no hace falta llamar a getSession() aparte.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setEstado({ sesion, cargando: false })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <SesionContext.Provider value={estado}>{children}</SesionContext.Provider>
}

export default SesionProvider
