import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/sesion'

export type Hogar = { id: string; nombre: string; esAdmin: boolean }

// Por ahora la app muestra un solo hogar por persona: el primero al que se unió. La base ya
// permite varios, y un selector queda para más adelante.
async function buscarHogar(userId: string): Promise<Hogar | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('role, circles(id, name)')
    .eq('user_id', userId)
    .order('joined_at')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data?.circles) return null
  return { id: data.circles.id, nombre: data.circles.name, esAdmin: data.role === 'admin' }
}

export function useMiHogar() {
  const { sesion } = useSesion()
  const userId = sesion?.user.id
  const [hogar, setHogar] = useState<Hogar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return
    let vigente = true
    buscarHogar(userId).then(
      h => {
        if (!vigente) return
        setHogar(h)
        setError(null)
        setCargando(false)
      },
      e => {
        if (!vigente) return
        setError(e.message)
        setCargando(false)
      },
    )
    return () => {
      vigente = false
    }
  }, [userId, version])

  const recargar = useCallback(() => setVersion(v => v + 1), [])

  return { hogar, cargando, error, recargar }
}
