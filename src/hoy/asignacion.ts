// Reglas de "Quién se encarga" hoy. Reflejan las policies de task_assignments: el admin asigna
// a cualquiera (o a nadie); un miembro solo puede tomar la tarea para sí, mientras nadie más la
// haya tomado hoy, y soltarla si la tomó.

type Asignacion = { assignee: string | null }

// Qué escribir en task_assignments al elegir `quien` para hoy. Si coincide con el responsable
// habitual no hace falta una excepción: se borra la fila del día.
export function cambioDelDia(habitual: string | null, quien: string | null) {
  return quien === habitual ? ({ tipo: 'borrar' } as const) : ({ tipo: 'guardar', assignee: quien } as const)
}

export function permisosDelDia(esAdmin: boolean, yo: string, asignacion?: Asignacion) {
  if (esAdmin) return { puedeElegir: () => true, liberar: 'sin-asignar' as const }
  const tomadaPorOtro = asignacion !== undefined && asignacion.assignee !== yo
  return {
    puedeElegir: (uid: string) => uid === yo && !tomadaPorOtro,
    // Soltar borra la fila del día: la tarea vuelve a quien le toca normalmente.
    liberar: asignacion?.assignee === yo ? ('devolver' as const) : null,
  }
}
