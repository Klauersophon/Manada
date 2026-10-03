// Tareas de cada mascota y la vista "Hoy", con Ana (admin) y Beto (miembro).
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, ruta, terminar, texto,
} from './comun.mjs'

const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const hoyIso = new Date().getDay() === 0 ? 7 : new Date().getDay()
const manana = DIAS_LARGOS[hoyIso % 7] // nunca es hoy

const clicEn = (page, lista, nombre, t) =>
  page.evaluate((lista, nombre, t) => {
    const li = [...document.querySelectorAll(`ul[aria-label="${lista}"] > li`)].find(li => li.innerText.includes(nombre))
    if (!li) throw new Error(`No está ${nombre} en ${lista}`)
    ;[...li.querySelectorAll('button')].find(b => b.innerText.trim() === t).click()
  }, lista, nombre, t)
const titulos = (page, lista) =>
  page.$$eval(`ul[aria-label="${lista}"] > li`, lis => lis.map(li => li.querySelector('p').innerText))
const itemDe = (page, lista, nombre) =>
  page.evaluate(
    (lista, nombre) =>
      [...document.querySelectorAll(`ul[aria-label="${lista}"] > li`)].find(li => li.innerText.includes(nombre))
        ?.innerText ?? '',
    lista, nombre)

async function agregarTarea(page, { sugerencia, nombre, hora, responsable, soloDia }) {
  await clicTexto(page, 'Agregar tarea')
  await page.waitForSelector('#tarea-nombre')
  if (sugerencia)
    await page.evaluate(
      s => [...document.querySelectorAll('[aria-label="Sugerencias"] button')].find(b => b.innerText.includes(s)).click(),
      sugerencia)
  if (nombre) await page.type('#tarea-nombre', nombre)
  if (hora)
    await page.$eval('#tarea-hora', (el, h) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, h)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, hora)
  if (responsable) {
    const valor = await page.$$eval('#tarea-responsable option',
      (os, r) => os.find(o => o.innerText === r).value, responsable)
    await page.select('#tarea-responsable', valor)
  }
  if (soloDia)
    await page.evaluate(dia => {
      for (const b of document.querySelectorAll('fieldset button'))
        if ((b.getAttribute('aria-pressed') === 'true') !== (b.getAttribute('aria-label') === dia)) b.click()
    }, soloDia)
  await clicTexto(page, 'Guardar')
  await page.waitForFunction(
    n => !document.querySelector('#tarea-nombre') &&
      [...document.querySelectorAll('ul[aria-label="Tareas"] > li')].some(li => li.innerText.includes(n)),
    { timeout: 10000 }, nombre ?? sugerencia)
}

try {
  const ana = await nuevaPagina()
  await ana.goto(APP + '/')
  await ingresarConCodigo(ana, `ana+${corrida}@test.cl`)
  await esperarTexto(ana, 'bienvenida a Manada')
  await ana.type('#nombre-hogar', 'Casa Hoy')
  await ana.type('#mi-nombre', 'Ana')
  await clicTexto(ana, 'Crear hogar')
  await esperarTexto(ana, 'Todavía no hay mascotas')
  ok('el inicio es la vista del día y avisa que faltan mascotas', ruta(ana) === '/')

  await irA(ana, 'Hogar')
  await esperarTexto(ana, 'Agrega la primera')
  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Luna')
  await clicTexto(ana, 'Guardar')
  await ana.waitForSelector('ul[aria-label="Mascotas"] a')
  ok('la tarjeta de la mascota tiene un botón de tareas',
    await ana.$$eval('ul[aria-label="Mascotas"] a', as => as.some(a => a.innerText === 'Tareas')))
  await irA(ana, 'Hoy')
  await esperarTexto(ana, 'Definir tareas de Luna')
  ok('"Hoy" sin tareas lleva directo a definirlas por mascota', true)
  await ana.evaluate(() => [...document.querySelectorAll('a')].find(a => a.innerText.includes('Definir tareas de Luna')).click())
  await esperarTexto(ana, 'Todavía no hay tareas para Luna')
  ok('cada mascota tiene su página de tareas', /^\/mascotas\/[0-9a-f-]{36}$/.test(ruta(ana)), ruta(ana))
  const paginaLuna = ana.url()

  await agregarTarea(ana, { sugerencia: 'Paseo', hora: '08:00', responsable: 'Ana' })
  ok('la sugerencia completa el nombre y se guardan hora y responsable',
    (await itemDe(ana, 'Tareas', 'Paseo')).includes('08:00 · Todos los días · Ana'), await itemDe(ana, 'Tareas', 'Paseo'))
  await agregarTarea(ana, { sugerencia: 'Comida' })
  ok('sin hora queda "Durante el día" y sin responsable "A cualquiera"',
    (await itemDe(ana, 'Tareas', 'Comida')).includes('Durante el día · Todos los días · A cualquiera'))
  await agregarTarea(ana, { nombre: 'Baño', soloDia: manana })
  ok('se pueden elegir solo algunos días', !(await itemDe(ana, 'Tareas', 'Baño')).includes('Todos los días'),
    await itemDe(ana, 'Tareas', 'Baño'))
  await agregarTarea(ana, { sugerencia: 'Remedio' })
  await clicEn(ana, 'Tareas', 'Remedio', 'Pausar')
  await esperarTexto(ana, '(pausada)')
  ok('una tarea se puede pausar', true)

  await irA(ana, 'Hoy')
  await ana.waitForSelector('ul[aria-label="Pendientes"]')
  ok('hoy muestra solo las tareas activas del día, primero las con hora',
    JSON.stringify(await titulos(ana, 'Pendientes')) === '["Paseo","Comida"]', JSON.stringify(await titulos(ana, 'Pendientes')))
  ok('el progreso parte en 0', (await texto(ana)).includes('0 de 2 hechas'))
  ok('la tarea con responsable dice a quién le toca', (await itemDe(ana, 'Pendientes', 'Paseo')).includes('Le toca a ti'))
  ok('la tarea sin responsable dice "Sin asignar"', (await itemDe(ana, 'Pendientes', 'Comida')).includes('Sin asignar'))

  // Beto se une y toma la comida
  await irA(ana, 'Hogar')
  await esperarTexto(ana, 'Crear link de invitación')
  await clicTexto(ana, 'Crear link de invitación')
  await ana.waitForSelector('[data-link]')
  const link = await ana.$eval('[data-link]', p => p.innerText)

  const beto = await nuevaPagina()
  await beto.goto(link)
  await ingresarConCodigo(beto, `beto+${corrida}@test.cl`)
  await esperarTexto(beto, 'Te invitaron a Casa Hoy')
  await beto.type('#mi-nombre', 'Beto')
  await clicTexto(beto, 'Unirme')
  await beto.waitForSelector('ul[aria-label="Pendientes"]')
  ok('al unirse, el miembro llega a la vista del día', ruta(beto) === '/')
  await beto.waitForFunction(() => document.body.innerText.includes('Le toca a Ana'), { timeout: 10000 })
  ok('el miembro ve a quién le toca cada tarea', true)

  await clicEn(beto, 'Pendientes', 'Comida', 'Lo hago yo')
  await esperarTexto(beto, 'Soltar')
  ok('"Lo hago yo" asigna la tarea del día', (await itemDe(beto, 'Pendientes', 'Comida')).includes('Le toca a ti'))
  await clicEn(beto, 'Pendientes', 'Comida', '✓ Hecho')
  await beto.waitForSelector('ul[aria-label="Hechas"]')
  ok('marcar hecha la mueve a "Hechas" a mi nombre', (await itemDe(beto, 'Hechas', 'Comida')).includes('Tú ·'))
  ok('el progreso avanza', (await texto(beto)).includes('1 de 2 hechas'))

  await ana.goto(APP + '/')
  await ana.waitForSelector('ul[aria-label="Hechas"]')
  const hechaPorBeto = await itemDe(ana, 'Hechas', 'Comida')
  ok('los demás ven quién la hizo y no pueden deshacerla',
    hechaPorBeto.includes('Beto ·') && !hechaPorBeto.includes('Deshacer'), hechaPorBeto)
  await clicEn(ana, 'Pendientes', 'Paseo', '✓ Hecho')
  await esperarTexto(ana, '2 de 2 hechas')
  await clicEn(ana, 'Hechas', 'Paseo', 'Deshacer')
  await esperarTexto(ana, '1 de 2 hechas')
  ok('se puede deshacer lo propio', JSON.stringify(await titulos(ana, 'Pendientes')) === '["Paseo"]')

  await beto.goto(paginaLuna)
  await esperarTexto(beto, 'Paseo')
  ok('un miembro ve las tareas pero no puede gestionarlas',
    !(await texto(beto)).includes('Agregar tarea') && !(await texto(beto)).includes('Pausar'))
  await terminar()
} catch (e) {
  await terminar(e)
}
