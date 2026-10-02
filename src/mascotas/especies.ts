// La base guarda un código en inglés, como el resto del esquema, y la app lo muestra en español.
export const ESPECIES = [
  { valor: 'dog', nombre: 'Perro', emoji: '🐶' },
  { valor: 'cat', nombre: 'Gato', emoji: '🐱' },
  { valor: 'bird', nombre: 'Ave', emoji: '🐦' },
  { valor: 'rabbit', nombre: 'Conejo', emoji: '🐰' },
  { valor: 'fish', nombre: 'Pez', emoji: '🐟' },
  { valor: 'other', nombre: 'Otra', emoji: '🐾' },
]

export function especie(valor: string) {
  return ESPECIES.find(e => e.valor === valor) ?? { valor, nombre: valor, emoji: '🐾' }
}
