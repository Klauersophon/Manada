import { describe, expect, it } from 'vitest'
import { cambioDelDia, permisosDelDia } from './asignacion'

describe('cambioDelDia', () => {
  it('borra la excepción si se elige a quien le toca normalmente', () => {
    expect(cambioDelDia('ana', 'ana')).toEqual({ tipo: 'borrar' })
    expect(cambioDelDia(null, null)).toEqual({ tipo: 'borrar' })
  })

  it('guarda una excepción si se elige a otra persona o a nadie', () => {
    expect(cambioDelDia('ana', 'beto')).toEqual({ tipo: 'guardar', assignee: 'beto' })
    expect(cambioDelDia('ana', null)).toEqual({ tipo: 'guardar', assignee: null })
  })
})

describe('permisosDelDia', () => {
  it('el admin puede elegir a cualquiera y dejarla sin asignar', () => {
    const p = permisosDelDia(true, 'ana', { assignee: 'beto' })
    expect(p.puedeElegir('beto')).toBe(true)
    expect(p.puedeElegir('dani')).toBe(true)
    expect(p.liberar).toBe('sin-asignar')
  })

  it('un miembro solo puede elegirse a sí mismo', () => {
    const p = permisosDelDia(false, 'beto')
    expect(p.puedeElegir('beto')).toBe(true)
    expect(p.puedeElegir('ana')).toBe(false)
    expect(p.liberar).toBe(null)
  })

  it('un miembro no puede quitarle la tarea a quien ya la tomó hoy', () => {
    expect(permisosDelDia(false, 'beto', { assignee: 'dani' }).puedeElegir('beto')).toBe(false)
    // El admin la dejó "sin asignar" por hoy: tampoco se puede pisar esa decisión.
    expect(permisosDelDia(false, 'beto', { assignee: null }).puedeElegir('beto')).toBe(false)
  })

  it('un miembro puede soltar la tarea que tomó', () => {
    const p = permisosDelDia(false, 'beto', { assignee: 'beto' })
    expect(p.puedeElegir('beto')).toBe(true)
    expect(p.liberar).toBe('devolver')
  })
})
