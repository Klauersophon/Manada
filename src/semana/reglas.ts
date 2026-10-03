// Reglas de la vista Semana: qué semana se muestra y qué dice cada casilla de la cuadrícula.
import { diaIso, fechaLocal } from '../hoy/calendario'

// Lunes de la semana de `fecha`, desplazado `semanas` hacia adelante o atrás. Las semanas van de
// lunes a domingo, igual que weekdays.
export function lunesDe(fecha: Date, semanas = 0) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - (diaIso(fecha) - 1) + semanas * 7)
}

export function diasDeLaSemana(lunes: Date) {
  return Array.from({ length: 7 }, (_, i) => new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i))
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function rangoDeSemana(lunes: Date) {
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6)
  return `${lunes.getDate()} ${MESES[lunes.getMonth()]} – ${domingo.getDate()} ${MESES[domingo.getMonth()]}`
}

export type Celda =
  | { tipo: 'no-toca' }
  | { tipo: 'hecha'; por: string }
  | { tipo: 'sin-registro' }
  | { tipo: 'plan'; quien: string | null }

type TareaSemana = { weekdays: number[]; default_assignee: string | null; created_at: string | null }

// Qué mostrar para una tarea en un día:
// - Hasta hoy: quién la hizo, o "sin registro" si tocaba y nadie la marcó.
// - Después de hoy: quién la hará (la asignación del día manda sobre el responsable habitual).
// - "No toca" si ese día no está en weekdays o si la tarea todavía no existía.
export function celdaDe(
  tarea: TareaSemana,
  dia: Date,
  hoy: Date,
  registro?: { done_by_name: string },
  asignacion?: { assignee: string | null },
): Celda {
  const fecha = fechaLocal(dia)
  const futuro = fecha > fechaLocal(hoy)
  // Un registro existente se muestra siempre, aunque después se hayan cambiado los días.
  if (!futuro && registro) return { tipo: 'hecha', por: registro.done_by_name }
  const creada = tarea.created_at ? fechaLocal(new Date(tarea.created_at)) : null
  if (!tarea.weekdays.includes(diaIso(dia)) || (creada !== null && fecha < creada)) return { tipo: 'no-toca' }
  if (futuro) return { tipo: 'plan', quien: asignacion ? asignacion.assignee : tarea.default_assignee }
  return { tipo: 'sin-registro' }
}
