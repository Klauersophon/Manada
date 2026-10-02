import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) throw new Error('Faltan las variables de Supabase')

// Los tipos se regeneran con `npm run db:types` después de cada migración.
export const supabase = createClient<Database>(url, key)
