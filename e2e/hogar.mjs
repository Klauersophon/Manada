// Crear el hogar, invitar con link y unirse. Ana crea, Beto se une y Caro pega el link.
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, pedirAcceso, ruta,
  terminar, texto,
} from './comun.mjs'

try {
  const ana = await nuevaPagina()
  await ana.goto(APP + '/')
  await ingresarConCodigo(ana, `ana+${corrida}@test.cl`)
  await esperarTexto(ana, 'bienvenida a Manada')
  ok('sin hogar, el inicio ofrece crear o unirse', true)
  await ana.type('#nombre-hogar', 'Casa Test')
  await ana.type('#mi-nombre', 'Ana')
  await clicTexto(ana, 'Crear hogar')
  await ana.waitForSelector('nav')
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Admin')
  ok('al crear el hogar se ve su nombre', (await ana.$eval('h1', h => h.innerText)) === 'Casa Test')
  ok('Ana aparece como admin', (await texto(ana)).match(/Ana \(tú\)\s+Admin/) !== null)

  await clicTexto(ana, 'Crear link de invitación')
  await ana.waitForSelector('[data-link]')
  const link = await ana.$eval('[data-link]', p => p.innerText)
  ok('el link de invitación usa el código de la base', /\/unirse\/[A-Za-z0-9_-]{12}$/.test(link), link)
  ok('la invitación muestra su vencimiento', (await texto(ana)).includes('Vence el'))
  const codigoInv = link.split('/unirse/')[1]

  // Beto abre el link sin sesión, entra con el enlace del correo y vuelve a la invitación
  const beto = await nuevaPagina()
  await beto.goto(link)
  await beto.waitForSelector('#correo')
  ok('sin sesión, el link manda a ingresar recordando la invitación',
    beto.url().endsWith(`/ingresar?volver=${encodeURIComponent('/unirse/' + codigoInv)}`), beto.url())
  const { enlace } = await pedirAcceso(beto, `beto+${corrida}@test.cl`)
  await beto.goto(enlace)
  await esperarTexto(beto, 'Te invitaron a Casa Test')
  ok('el enlace del correo vuelve a la invitación', ruta(beto) === '/unirse/' + codigoInv, ruta(beto))
  await beto.type('#mi-nombre', 'Beto')
  await clicTexto(beto, 'Unirme')
  await beto.waitForSelector('nav')
  await irA(beto, 'Manada')
  await beto.waitForFunction(() => /Beto \(tú\)\s+Miembro/.test(document.body.innerText), { timeout: 10000 })
  ok('Beto queda en el hogar como miembro', true)
  ok('un miembro no ve la sección de invitar', !(await texto(beto)).includes('Invitar a tu familia'))
  await beto.goto(link)
  await beto.waitForSelector('nav')
  ok('abrir el link del propio hogar lleva al inicio', ruta(beto) === '/')

  await ana.reload()
  await ana.waitForFunction(() => /Beto\s+Miembro/.test(document.body.innerText), { timeout: 10000 })
  ok('Ana ve a Beto en su hogar', true)

  // Caro pega el link en la bienvenida
  const caro = await nuevaPagina()
  await caro.goto(APP + '/')
  await ingresarConCodigo(caro, `caro+${corrida}@test.cl`)
  await esperarTexto(caro, 'Tengo una invitación')
  await caro.type('#codigo-invitacion', link)
  await clicTexto(caro, 'Continuar')
  await esperarTexto(caro, 'Te invitaron a Casa Test')
  ok('pegar el link completo en la bienvenida lleva a la invitación', true)

  // Ana revoca y la invitación deja de servir
  await clicTexto(ana, 'Revocar')
  await ana.waitForFunction(() => !document.querySelector('[data-link]'), { timeout: 10000 })
  ok('al revocar, el link desaparece de la lista', true)
  await caro.reload()
  await esperarTexto(caro, 'Invitación no válida')
  ok('un link revocado muestra que no es válido', true)
  await terminar()
} catch (e) {
  await terminar(e)
}
