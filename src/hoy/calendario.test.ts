import { describe, expect, it } from 'vitest'
import { diaIso, fechaLocal, hora, ordenarDelDia, responsable, resumenDias, tocaEl } from './calendario'

// new Date(año, mes, día, ...) crea la fecha en la zona horaria local, como en el celular.
const jueves = new Date(2026, 9, 1, 10, 0)
const domingo = new Date(2026, 9, 4, 10, 0)
const lunes = new Date(2026, 9, 5, 10, 0)

describe('diaIso', () => {
  it('usa 1 para el lunes y 7 para el domingo', () => {
    expect(diaIso(lunes)).toBe(1)
    expect(diaIso(jueves)).toBe(4)
    expect(diaIso(domingo)).toBe(7)
  })
})

describe('fechaLocal', () => {
  it('formatea como YYYY-MM-DD con ceros', () => {
    expect(fechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('usa el día local aunque en UTC ya sea el día siguiente', () => {
    // 23:30 local: en cualquier zona al oeste de UTC (Perú es UTC-5) ya es mañana en UTC.
    const noche = new Date(2026, 9, 1, 23, 30)
    expect(fechaLocal(noche)).toBe('2026-10-01')
  })
})

describe('tocaEl', () => {
  it('incluye la tarea si el día está en weekdays', () => {
    expect(tocaEl({ active: true, weekdays: [1, 3, 5] }, lunes)).toBe(true)
    expect(tocaEl({ active: true, weekdays: [1, 3, 5] }, jueves)).toBe(false)
  })

  it('reconoce el domingo como 7', () => {
    expect(tocaEl({ active: true, weekdays: [6, 7] }, domingo)).toBe(true)
  })

  it('excluye las tareas pausadas', () => {
    expect(tocaEl({ active: false, weekdays: [1, 2, 3, 4, 5, 6, 7] }, lunes)).toBe(false)
  })
})

describe('ordenarDelDia', () => {
  it('ordena por hora, deja al final las que no tienen y desempata por mascota y nombre', () => {
    const tareas = [
      { name: 'Agua', time_of_day: null, mascota: 'Luna' },
      { name: 'Paseo', time_of_day: '19:00:00', mascota: 'Luna' },
      { name: 'Comida', time_of_day: '08:00:00', mascota: 'Michi' },
      { name: 'Comida', time_of_day: '08:00:00', mascota: 'Luna' },
      { name: 'Arenero', time_of_day: null, mascota: 'Michi' },
    ]
    expect(ordenarDelDia(tareas).map(t => `${t.mascota} ${t.name}`)).toEqual([
      'Luna Comida',
      'Michi Comida',
      'Luna Paseo',
      'Luna Agua',
      'Michi Arenero',
    ])
  })
})

describe('responsable', () => {
  it('usa la asignación del día si existe', () => {
    expect(responsable({ default_assignee: 'ana' }, { assignee: 'beto' })).toBe('beto')
  })

  it('si no hay asignación, usa el responsable por defecto', () => {
    expect(responsable({ default_assignee: 'ana' })).toBe('ana')
    expect(responsable({ default_assignee: null })).toBe(null)
  })
})

describe('textos', () => {
  it('muestra la hora sin segundos o "Durante el día"', () => {
    expect(hora('08:30:00')).toBe('08:30')
    expect(hora(null)).toBe('Durante el día')
  })

  it('resume los días de la semana', () => {
    expect(resumenDias([1, 2, 3, 4, 5, 6, 7])).toBe('Todos los días')
    expect(resumenDias([5, 4, 3, 2, 1])).toBe('Lunes a viernes')
    expect(resumenDias([7, 6])).toBe('Fines de semana')
    expect(resumenDias([1, 3, 5])).toBe('Lu, Mi, Vi')
  })
})
