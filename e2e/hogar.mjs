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
  ok('el link usa un código de 8 caracteres de la base', /\/unirse\/[A-HJKMNP-TW-Z2-9]{8}$/.test(link), link)
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

  // Dani abre el link sin cuenta y entra como invitado, sin correo
  const dani = await nuevaPagina()
  await dani.goto(link)
  await esperarTexto(dani, 'Entrar como invitado')
  ok('sin sesión, el link ofrece entrar como invitado sin pasar por ingresar', ruta(dani) === '/unirse/' + codigoInv, ruta(dani))
  await clicTexto(dani, 'Entrar como invitado')
  await esperarTexto(dani, 'Te invitaron a Casa Test')
  await dani.type('#mi-nombre', 'Dani')
  await clicTexto(dani, 'Unirme')
  await dani.waitForSelector('nav')
  await irA(dani, 'Manada')
  await esperarTexto(dani, 'Guarda tu cuenta')
  ok('el invitado queda en el hogar y se le ofrece guardar su cuenta', true)

  // Ana revoca y la invitación deja de servir
  await clicTexto(ana, 'Revocar')
  await ana.waitForFunction(() => !document.querySelector('[data-link]'), { timeout: 10000 })
  ok('al revocar, el link desaparece de la lista', true)
  await caro.reload()
  await esperarTexto(caro, 'Invitación no válida')
  ok('un link revocado muestra que no es válido', true)

  // Roles: el hogar nunca queda sin admin
  const opcion = (page, t) =>
    page.evaluate(t => {
      const b = [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t))
      return b ? { activa: !b.disabled, elegida: b.getAttribute('aria-pressed') === 'true' } : null
    }, t)
  const elegir = (page, t) =>
    page.evaluate(t => [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t)).click(), t)
  ok('el admin ve cuántas tareas hizo cada uno esta semana', (await texto(ana)).includes('esta semana'))
  await irA(beto, 'Manada')
  await beto.waitForFunction(() => /Beto \(tú\)\s+Miembro/.test(document.body.innerText), { timeout: 10000 })
  ok('un miembro no ve ese conteo', !(await texto(beto)).includes('esta semana'))
  ok('un miembro no puede abrir la hoja de roles', (await beto.$$('button[aria-label^="Cambiar el rol"]')).length === 0)
  await ana.click('button[aria-label="Cambiar el rol de Ana"]')
  await ana.waitForSelector('[role=dialog]')
  ok('la única admin no puede pasar a miembro', JSON.stringify(await opcion(ana, 'Miembro')) === '{"activa":false,"elegida":false}')
  ok('la hoja explica por qué', (await ana.$eval('[role=dialog]', d => d.innerText)).includes('Es la única persona que administra'))
  await ana.keyboard.press('Escape')
  await ana.click('button[aria-label="Cambiar el rol de Beto"]')
  await ana.waitForSelector('[role=dialog]')
  await elegir(ana, 'Admin')
  await ana.waitForFunction(() => /Beto\s+Admin/.test(document.body.innerText), { timeout: 10000 })
  ok('el admin puede nombrar a otra persona admin', true)
  await ana.click('button[aria-label="Cambiar el rol de Ana"]')
  await ana.waitForSelector('[role=dialog]')
  await elegir(ana, 'Miembro')
  await ana.waitForFunction(() => /Ana \(tú\)\s+Miembro/.test(document.body.innerText), { timeout: 10000 })
  ok('con otro admin, puede quitarse el rol', true)
  ok('al dejar de ser admin, deja de ver lo de admin', !(await texto(ana)).includes('Invitar a tu familia'))
  await beto.reload()
  await beto.waitForFunction(() => /Beto \(tú\)\s+Admin/.test(document.body.innerText), { timeout: 10000 })
  ok('el nuevo admin ve las herramientas de admin', (await texto(beto)).includes('Invitar a tu familia'))
  await terminar()
} catch (e) {
  await terminar(e)
}
