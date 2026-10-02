import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

// `cargando` es true hasta que supabase-js lee la sesión guardada o la que trae el enlace del correo.
export type EstadoSesion = { sesion: Session | null; cargando: boolean }

export const SesionContext = createContext<EstadoSesion>({ sesion: null, cargando: true })

export function useSesion() {
  return useContext(SesionContext)
}
