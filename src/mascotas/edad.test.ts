import { describe, expect, it } from 'vitest'
import { edad } from './edad'

const hoy = new Date(2026, 9, 3)
const conFecha = (birth_date: string) => edad({ birth_date, birth_year: Number(birth_date.slice(0, 4)) }, hoy)
const conAnio = (birth_year: number) => edad({ birth_date: null, birth_year }, hoy)

describe('edad con fecha exacta', () => {
  it('cuenta años cumplidos', () => {
    expect(conFecha('2023-10-03')).toBe('3 años')
    expect(conFecha('2023-10-04')).toBe('2 años')
    expect(conFecha('2025-09-01')).toBe('1 año')
  })

  it('para menores de un año cuenta meses', () => {
    expect(conFecha('2026-05-03')).toBe('5 meses')
    expect(conFecha('2026-09-03')).toBe('1 mes')
    expect(conFecha('2026-09-20')).toBe('menos de 1 mes')
  })

  it('no inventa una edad si el nacimiento está en el futuro', () => {
    expect(conFecha('2026-12-01')).toBe(null)
  })
})

describe('edad con solo el año', () => {
  it('es aproximada', () => {
    expect(conAnio(2021)).toBe('unos 5 años')
    expect(conAnio(2025)).toBe('cerca de 1 año')
    expect(conAnio(2026)).toBe('menos de 1 año')
  })

  it('sin datos no hay edad', () => {
    expect(edad({ birth_date: null, birth_year: null }, hoy)).toBe(null)
  })
})
