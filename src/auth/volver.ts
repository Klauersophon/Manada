// Ruta a la que volver después de ingresar, tomada de ?volver=. Solo acepta rutas internas para
// que un link armado no pueda mandar a otro sitio.
export function rutaDeVuelta(params: URLSearchParams) {
  const ruta = params.get('volver')
  if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) return '/'
  return ruta
}
