import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) throw new Error('Faltan las variables de Supabase')

// Los tipos se regeneran con `npm run db:types` después de cada migración.
export const supabase = createClient<Database>(url, key)

// getSession() solo lee localStorage, así que no sirve para saber si el proyecto responde.
// El endpoint de health de auth sí pasa por el gateway y valida la publishable key.
export async function verificarConexion(): Promise<void> {
  const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}`)
}
