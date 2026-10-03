// Reglas de "qué toca hoy". Son funciones puras para poder probarlas sin base de datos.

// care_tasks.weekdays usa la convención ISO: 1 es lunes y 7 es domingo.
export const DIAS = [
  { valor: 1, corto: 'Lu', largo: 'lunes' },
  { valor: 2, corto: 'Ma', largo: 'martes' },
  { valor: 3, corto: 'Mi', largo: 'miércoles' },
  { valor: 4, corto: 'Ju', largo: 'jueves' },
  { valor: 5, corto: 'Vi', largo: 'viernes' },
  { valor: 6, corto: 'Sá', largo: 'sábado' },
  { valor: 7, corto: 'Do', largo: 'domingo' },
]

// getDay() de JavaScript usa 0 para el domingo.
export function diaIso(fecha: Date) {
  return fecha.getDay() === 0 ? 7 : fecha.getDay()
}

// Fecha local en formato YYYY-MM-DD, para care_logs.date y task_assignments.date. No usar
// toISOString(): devuelve la fecha UTC, que en Perú cambia de día a las 7 de la tarde.
export function fechaLocal(fecha: Date) {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

type TareaProgramada = { active: boolean; weekdays: number[] }

export function tocaEl<T extends TareaProgramada>(tarea: T, fecha: Date) {
  return tarea.active && tarea.weekdays.includes(diaIso(fecha))
}

type TareaOrdenable = { time_of_day: string | null; name: string; mascota: string }

// Primero las que tienen hora, de la más temprana a la más tarde. Después las de "durante el día".
export function ordenarDelDia<T extends TareaOrdenable>(tareas: T[]) {
  return [...tareas].sort(
    (a, b) =>
      (a.time_of_day ?? '99').localeCompare(b.time_of_day ?? '99') ||
      a.mascota.localeCompare(b.mascota) ||
      a.name.localeCompare(b.name),
  )
}

// La asignación del día manda sobre el responsable por defecto de la tarea.
export function responsable(
  tarea: { default_assignee: string | null },
  asignacion?: { assignee: string | null },
) {
  return asignacion ? asignacion.assignee : tarea.default_assignee
}

// Postgres devuelve time como "08:30:00".
export function hora(time: string | null) {
  return time ? time.slice(0, 5) : 'Durante el día'
}

export function resumenDias(weekdays: number[]) {
  const dias = [...new Set(weekdays)].sort()
  const clave = dias.join(',')
  if (clave === '1,2,3,4,5,6,7') return 'Todos los días'
  if (clave === '1,2,3,4,5') return 'Lunes a viernes'
  if (clave === '6,7') return 'Fines de semana'
  return dias.map(d => DIAS[d - 1].corto).join(', ')
}
