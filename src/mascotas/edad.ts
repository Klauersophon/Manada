import { especie } from './especies'

// Edad de una mascota a partir de su nacimiento: fecha exacta (birth_date) o solo el año
// (birth_year). Devuelve null si no hay datos o si el nacimiento quedó en el futuro.
export function edad(nacimiento: { birth_date: string | null; birth_year: number | null }, hoy: Date) {
  if (nacimiento.birth_date) {
    const [anio, mes, dia] = nacimiento.birth_date.split('-').map(Number)
    const meses =
      (hoy.getFullYear() - anio) * 12 + (hoy.getMonth() + 1 - mes) - (hoy.getDate() < dia ? 1 : 0)
    if (meses < 0) return null
    if (meses < 1) return 'menos de 1 mes'
    if (meses < 12) return meses === 1 ? '1 mes' : `${meses} meses`
    const anios = Math.floor(meses / 12)
    return anios === 1 ? '1 año' : `${anios} años`
  }
  if (nacimiento.birth_year) {
    const anios = hoy.getFullYear() - nacimiento.birth_year
    if (anios < 0) return null
    if (anios === 0) return 'menos de 1 año'
    return anios === 1 ? 'cerca de 1 año' : `unos ${anios} años`
  }
  return null
}

// Especie, raza y edad en una línea: "Perro · Mestizo · 3 años".
export function resumenMascota(m: {
  species: string
  breed: string | null
  birth_date: string | null
  birth_year: number | null
}) {
  return [especie(m.species).nombre, m.breed, edad(m, new Date())].filter(Boolean).join(' · ')
}
