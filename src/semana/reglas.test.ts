import { describe, expect, it } from 'vitest'
import { fechaLocal } from '../hoy/calendario'
import { celdaDe, diasDeLaSemana, lunesDe, rangoDeSemana } from './reglas'

const dia = (d: number, mes = 9) => new Date(2026, mes, d, 10, 0)
// Semana del lunes 28 de septiembre al domingo 4 de octubre de 2026. "Hoy" es el jueves 1.
const hoy = dia(1)

describe('lunesDe', () => {
  it('devuelve el lunes de la semana, aunque cruce de mes', () => {
    expect(fechaLocal(lunesDe(hoy))).toBe('2026-09-28')
  })

  it('trata el domingo como el último día de la semana', () => {
    expect(fechaLocal(lunesDe(dia(4)))).toBe('2026-09-28')
    expect(fechaLocal(lunesDe(dia(5)))).toBe('2026-10-05')
  })

  it('se mueve de a semanas', () => {
    expect(fechaLocal(lunesDe(hoy, 1))).toBe('2026-10-05')
    expect(fechaLocal(lunesDe(hoy, -1))).toBe('2026-09-21')
  })
})

describe('diasDeLaSemana y rangoDeSemana', () => {
  it('lista de lunes a domingo y resume el rango', () => {
    const lunes = lunesDe(hoy)
    expect(diasDeLaSemana(lunes).map(fechaLocal)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
    ])
    expect(rangoDeSemana(lunes)).toBe('28 sep – 4 oct')
  })
})

describe('celdaDe', () => {
  const diaria = { weekdays: [1, 2, 3, 4, 5, 6, 7], default_assignee: 'ana', created_at: '2026-09-01T12:00:00Z' }

  it('hasta hoy muestra quién la hizo o que quedó sin registro', () => {
    expect(celdaDe(diaria, dia(30, 8), hoy, { done_by_name: 'Beto' })).toEqual({ tipo: 'hecha', por: 'Beto' })
    expect(celdaDe(diaria, dia(30, 8), hoy)).toEqual({ tipo: 'sin-registro' })
    expect(celdaDe(diaria, hoy, hoy)).toEqual({ tipo: 'sin-registro' })
  })

  it('después de hoy muestra el plan: la asignación del día o el responsable habitual', () => {
    expect(celdaDe(diaria, dia(2), hoy)).toEqual({ tipo: 'plan', quien: 'ana' })
    expect(celdaDe(diaria, dia(2), hoy, undefined, { assignee: 'beto' })).toEqual({ tipo: 'plan', quien: 'beto' })
    expect(celdaDe(diaria, dia(2), hoy, undefined, { assignee: null })).toEqual({ tipo: 'plan', quien: null })
  })

  it('no toca los días fuera de weekdays', () => {
    const domingos = { ...diaria, weekdays: [7] }
    expect(celdaDe(domingos, dia(2), hoy)).toEqual({ tipo: 'no-toca' })
    expect(celdaDe(domingos, dia(4), hoy)).toEqual({ tipo: 'plan', quien: 'ana' })
  })

  it('no toca los días anteriores a que se creara la tarea', () => {
    const nueva = { ...diaria, created_at: new Date(2026, 8, 30, 15, 0).toISOString() }
    expect(celdaDe(nueva, dia(29, 8), hoy)).toEqual({ tipo: 'no-toca' })
    expect(celdaDe(nueva, dia(30, 8), hoy)).toEqual({ tipo: 'sin-registro' })
  })

  it('un registro existente se muestra aunque ese día ya no toque', () => {
    const cambiada = { ...diaria, weekdays: [6] }
    expect(celdaDe(cambiada, dia(30, 8), hoy, { done_by_name: 'Ana' })).toEqual({ tipo: 'hecha', por: 'Ana' })
  })
})
