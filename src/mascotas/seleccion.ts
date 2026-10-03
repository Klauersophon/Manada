// Mascota elegida en cada selector, recordada en el dispositivo. Cada pestaña recuerda la suya:
// mirar la ficha de una mascota no debe filtrar "Hoy" sin querer.
// En "Hoy" el valor puede ser 'todas'.
type Selector = 'hoy' | 'semana' | 'ficha'
const CLAVES: Record<Selector, string> = {
  hoy: 'manada:hoy-mascota',
  semana: 'manada:semana-mascota',
  ficha: 'manada:ficha-mascota',
}

export function leerMascotaElegida(selector: Selector): string | null {
  try {
    return localStorage.getItem(CLAVES[selector])
  } catch {
    return null
  }
}

export function guardarMascotaElegida(selector: Selector, valor: string) {
  try {
    localStorage.setItem(CLAVES[selector], valor)
  } catch {
    // Sin almacenamiento, simplemente no se recuerda.
  }
}
