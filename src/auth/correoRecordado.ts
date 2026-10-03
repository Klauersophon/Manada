// Último correo con que se pidió acceso en este dispositivo, para no tener que escribirlo de
// nuevo. localStorage puede no estar disponible (modo privado), así que todo va con try/catch.
const CLAVE = 'manada:correo'

export function leerCorreo() {
  try {
    return localStorage.getItem(CLAVE) ?? ''
  } catch {
    return ''
  }
}

export function recordarCorreo(correo: string) {
  try {
    localStorage.setItem(CLAVE, correo)
  } catch {
    // Sin almacenamiento, simplemente no se recuerda.
  }
}
