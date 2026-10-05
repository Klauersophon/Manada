// Tiempo real: Ana y Beto con la app abierta a la vez. Lo que hace uno le aparece al otro sin
// recargar. Para probar que no hubo recarga, se deja una marca en `window` que una recarga borraría.
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, terminar,
  unirseConCorreo,
} from './comun.mjs'

const marcar = page => page.evaluate(() => { window.__sinRecargar = true })
const sinRecargar = page => page.evaluate(() => window.__sinRecargar === true)
// El canal de Realtime tarda un momento en quedar suscrito después de cargar la pantalla, y no
// hay nada en la página que lo indique. Sin esta espera, el primer cambio podría llegar antes.
const esperarSuscripcion = () => new Promise(r => setTimeout(r, 2500))
const estadoDe = (page, nombre) =>
  page.evaluate(n => [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes(n))?.dataset.estado, nombre)
const textoDe = (page, nombre) =>
  page.evaluate(n => [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes(n))?.innerText ?? '', nombre)
const esperarEn = (page, fn, ...args) => page.waitForFunction(fn, { timeout: 10000 }, ...args)

try {
  // Ana arma el hogar con una mascota y dos tareas diarias
  const ana = await nuevaPagina()
  await ana.goto(APP + '/')
  await ingresarConCodigo(ana, `ana+${corrida}@test.cl`)
  await esperarTexto(ana, 'bienvenida a Manada')
  await ana.type('#nombre-hogar', 'Casa Vivo')
  await ana.type('#mi-nombre', 'Ana')
  await clicTexto(ana, 'Crear hogar')
  await ana.waitForSelector('nav')
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Agregar mascota')
  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Luna')
  await clicTexto(ana, 'Guardar')
  await ana.waitForSelector('ul[aria-label="Mascotas"] a')
  await ana.click('ul[aria-label="Mascotas"] a')
  await esperarTexto(ana, 'Agregar tarea')
  for (const nombre of ['Paseo', 'Comida']) {
    await clicTexto(ana, 'Agregar tarea')
    await ana.waitForSelector('#tarea-nombre')
    await ana.type('#tarea-nombre', nombre)
    await clicTexto(ana, 'Guardar')
    await esperarEn(ana, n => [...document.querySelectorAll('ul[aria-label="Tareas"] > li')].some(li => li.innerText.includes(n)), nombre)
  }

  // Beto se une
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Crear link de invitación')
  await clicTexto(ana, 'Crear link de invitación')
  await ana.waitForSelector('[data-link]')
  const link = await ana.$eval('[data-link]', p => p.innerText)
  const beto = await nuevaPagina()
  await unirseConCorreo(beto, link, `beto+${corrida}@test.cl`)
  await esperarTexto(beto, 'Te invitaron a Casa Vivo')
  await beto.type('#mi-nombre', 'Beto')
  await clicTexto(beto, 'Unirme')
  await beto.waitForSelector('[data-estado]')

  // Los dos en "Hoy"
  await irA(ana, 'Hoy')
  await ana.waitForSelector('[data-estado]')
  await marcar(ana)
  await marcar(beto)
  await esperarSuscripcion()

  // Beto marca el paseo: Ana lo ve sin recargar
  await beto.evaluate(() => {
    const li = [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes('Paseo'))
    ;[...li.querySelectorAll('button')].find(b => b.innerText === 'Hecho').click()
  })
  await esperarEn(ana, () =>
    [...document.querySelectorAll('[data-estado="hecha"]')].some(li => li.innerText.includes('Paseo')))
  ok('lo que marca otra persona aparece sin recargar', await sinRecargar(ana))
  ok('se ve quién lo hizo', (await textoDe(ana, 'Paseo')).includes('Beto'))
  await esperarEn(ana, () => document.querySelector('ul[aria-label="Hoy en la manada"]')?.innerText.includes('Beto'))
  ok('"Hoy en la manada" se actualiza solo', true)

  // Beto deshace: el borrado también llega
  await beto.evaluate(() => {
    const li = [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes('Paseo'))
    ;[...li.querySelectorAll('button')].find(b => b.innerText === 'Deshacer').click()
  })
  await esperarEn(ana, () =>
    [...document.querySelectorAll('[data-estado="pendiente"]')].some(li => li.innerText.includes('Paseo')))
  ok('deshacer también aparece sin recargar', (await estadoDe(ana, 'Paseo')) === 'pendiente' && await sinRecargar(ana))

  // Ana le asigna la comida de hoy a Beto: Beto lo ve sin recargar
  await ana.click('button[aria-label="Cambiar quién se encarga de Comida"]')
  await ana.waitForSelector('[role=dialog]')
  await ana.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes('Beto')).click())
  await esperarEn(beto, () =>
    [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes('Comida'))?.innerText.includes('hoy te toca a ti'))
  ok('una asignación de otra persona aparece sin recargar', await sinRecargar(beto))

  // Una persona nueva se une mientras Ana mira Manada
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Beto')
  await esperarSuscripcion()
  const carla = await nuevaPagina()
  await carla.goto(link)
  await esperarTexto(carla, 'Entrar como invitado')
  await clicTexto(carla, 'Entrar como invitado')
  await esperarTexto(carla, 'Te invitaron a Casa Vivo')
  await carla.type('#mi-nombre', 'Carla')
  await clicTexto(carla, 'Unirme')
  await esperarEn(ana, () => /Carla\s+Miembro/.test(document.body.innerText))
  ok('quien se une aparece en Manada sin recargar', await sinRecargar(ana))

  await terminar()
} catch (e) {
  await terminar(e)
}
