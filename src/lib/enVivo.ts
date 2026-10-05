import { useEffect, useEffectEvent } from 'react'
import { supabase } from './supabase'

export type Escucha = { tabla: 'care_logs' | 'task_assignments' | 'care_tasks' | 'memberships'; filtro?: string }

// Llama a `onCambio` cuando alguien cambia una de las tablas escuchadas, para que la pantalla
// vuelva a pedir sus datos. Agrupa ráfagas (marcar varias tareas seguidas) en una sola recarga.
//
// Los INSERT y UPDATE llegan filtrados por `filtro` y por RLS. Los DELETE no se pueden filtrar
// (solo traen la clave primaria), así que se escuchan aparte y sin filtro: alcanza con saber que
// algo se borró, porque la recarga sí pasa por RLS.
export function useEnVivo(nombre: string, escuchas: Escucha[], onCambio: () => void) {
  const alCambiar = useEffectEvent(onCambio)
  // Las escuchas cambian de identidad en cada render; el canal solo se rehace si cambia el contenido.
  const clave = JSON.stringify(escuchas)

  useEffect(() => {
    const lista: Escucha[] = JSON.parse(clave)
    if (lista.length === 0) return
    let espera: ReturnType<typeof setTimeout> | undefined
    const avisar = () => {
      clearTimeout(espera)
      espera = setTimeout(alCambiar, 300)
    }
    const canal = supabase.channel(`${nombre}:${crypto.randomUUID()}`)
    for (const { tabla, filtro } of lista) {
      canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabla, filter: filtro }, avisar)
      canal.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: tabla, filter: filtro }, avisar)
      canal.on('postgres_changes', { event: 'DELETE', schema: 'public', table: tabla }, avisar)
    }
    canal.subscribe()
    return () => {
      clearTimeout(espera)
      supabase.removeChannel(canal)
    }
  }, [nombre, clave])
}

// Filtro de Realtime para "columna está en esta lista". Realtime acepta hasta 100 valores.
export function enLista(columna: string, valores: string[]) {
  return valores.length ? `${columna}=in.(${valores.slice(0, 100).join(',')})` : undefined
}
