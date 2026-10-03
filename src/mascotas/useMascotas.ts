import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type MascotaActiva = { id: string; name: string; species: string }

// Mascotas no archivadas del hogar, para el selector de arriba.
export function useMascotas(circleId: string, version = 0) {
  const [mascotas, setMascotas] = useState<MascotaActiva[] | null>(null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('pets')
      .select('id, name, species')
      .eq('circle_id', circleId)
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        if (vigente) setMascotas(data ?? [])
      })
    return () => {
      vigente = false
    }
  }, [circleId, version])

  return mascotas
}
