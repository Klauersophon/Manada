import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Miembro = { user_id: string; display_name: string; role: string }

// Miembros del hogar, para mostrar nombres y elegir responsables de tareas.
export function useMiembros(circleId: string) {
  const [miembros, setMiembros] = useState<Miembro[]>([])

  useEffect(() => {
    let vigente = true
    supabase
      .from('memberships')
      .select('user_id, display_name, role')
      .eq('circle_id', circleId)
      .order('joined_at')
      .then(({ data }) => {
        if (vigente && data) setMiembros(data)
      })
    return () => {
      vigente = false
    }
  }, [circleId])

  return miembros
}
