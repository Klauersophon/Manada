import { useEffect, useState } from 'react'
import { useEnVivo } from '../lib/enVivo'
import { supabase } from '../lib/supabase'

export type Miembro = { user_id: string; display_name: string; role: string }

// Miembros del hogar, para mostrar nombres y elegir responsables de tareas.
export function useMiembros(circleId: string) {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [version, setVersion] = useState(0)

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
  }, [circleId, version])

  // Alguien nuevo en el hogar aparece al tiro en la hoja "Quién se encarga".
  useEnVivo('miembros', [{ tabla: 'memberships', filtro: `circle_id=eq.${circleId}` }], () =>
    setVersion(v => v + 1),
  )

  return miembros
}
