// Tareas de cada mascota y la vista "Hoy", con Ana (admin) y Beto (miembro).
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, ruta, terminar, texto,
} from './comun.mjs'

const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const hoyIso = new Date().getDay() === 0 ? 7 : new Date().getDay()
const manana = DIAS_LARGOS[hoyIso % 7] // nunca es hoy

// En la ficha de la mascota, las tareas viven en la lista "Tareas".
const clicEnLista = (page, lista, nombre, t) =>
  page.evaluate((lista, nombre, t) => {
    const li = [...document.querySelectorAll(`ul[aria-label="${lista}"] > li`)].find(li => li.innerText.includes(nombre))
    if (!li) throw new Error(`No está ${nombre} en ${lista}`)
    ;[...li.querySelectorAll('button')].find(b => b.innerText.trim() === t).click()
  }, lista, nombre, t)
const itemDeLista = (page, lista, nombre) =>
  page.evaluate(
    (lista, nombre) =>
      [...document.querySelectorAll(`ul[aria-label="${lista}"] > li`)].find(li => li.innerText.includes(nombre))
        ?.innerText ?? '',
    lista, nombre)

// En "Hoy", una sola lista con pendientes y hechas, marcadas con data-estado.
const LISTA = 'ul[aria-label="Tareas de hoy"]'
const clicEn = (page, nombre, t) => clicEnLista(page, 'Tareas de hoy', nombre, t)
const itemDe = (page, nombre) => itemDeLista(page, 'Tareas de hoy', nombre)
const pendientesDe = page =>
  page.$$eval(`${LISTA} > li[data-estado="pendiente"]`, lis => lis.map(li => li.querySelector('p').innerText))
const esperarEstado = (page, nombre, estado) =>
  page.waitForFunction(
    (nombre, estado) =>
      [...document.querySelectorAll('[data-estado]')].some(li => li.innerText.includes(nombre) && li.dataset.estado === estado),
    { timeout: 10000 }, nombre, estado)
const feed = page => page.$eval('ul[aria-label="Hoy en la manada"]', u => u.innerText).catch(() => '')
const textoAviso = page => page.$eval('[role=status]', a => a.innerText).catch(() => '')
async function abrirHoja(page, nombre) {
  await page.click(`button[aria-label="Cambiar quién se encarga de ${nombre}"]`)
  await page.waitForSelector('[role=dialog]')
}
const opcionHabilitada = (page, texto) =>
  page.evaluate(t => {
    const b = [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t))
    return !!b && !b.disabled
  }, texto)
const elegirEnHoja = (page, texto) =>
  page.evaluate(t => [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t)).click(), texto)

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

  await irA(ana, 'Manada')
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
    (await itemDeLista(ana, 'Tareas', 'Paseo')).includes('08:00 · Todos los días · Ana'), await itemDeLista(ana, 'Tareas', 'Paseo'))
  await agregarTarea(ana, { sugerencia: 'Comida' })
  ok('sin hora queda "Durante el día" y sin responsable "A cualquiera"',
    (await itemDeLista(ana, 'Tareas', 'Comida')).includes('Durante el día · Todos los días · A cualquiera'))
  await agregarTarea(ana, { nombre: 'Baño', soloDia: manana })
  ok('se pueden elegir solo algunos días', !(await itemDeLista(ana, 'Tareas', 'Baño')).includes('Todos los días'),
    await itemDeLista(ana, 'Tareas', 'Baño'))
  await agregarTarea(ana, { sugerencia: 'Remedio' })
  await clicEnLista(ana, 'Tareas', 'Remedio', 'Pausar')
  await esperarTexto(ana, '(pausada)')
  ok('una tarea se puede pausar', true)

  await irA(ana, 'Hoy')
  await ana.waitForSelector(LISTA)
  ok('hoy muestra solo las tareas activas del día, primero las con hora',
    JSON.stringify(await pendientesDe(ana)) === '["Paseo","Comida"]', JSON.stringify(await pendientesDe(ana)))
  ok('el progreso parte en 0', (await texto(ana)).includes('0 de 2 hechas'))
  ok('la tarea con responsable dice a quién le toca', (await itemDe(ana, 'Paseo')).includes('te toca a ti'))
  ok('la tarea sin responsable dice "sin asignar"', (await itemDe(ana, 'Comida')).includes('sin asignar'))
  ok('"Hoy en la manada" parte vacío', (await texto(ana)).includes('Nadie ha registrado nada todavía'))

  // Beto se une
  await irA(ana, 'Manada')
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
  await beto.waitForSelector(LISTA)
  ok('al unirse, el miembro llega a la vista del día', ruta(beto) === '/')
  await beto.waitForFunction(() => document.body.innerText.includes('le toca a Ana'), { timeout: 10000 })
  ok('el miembro ve a quién le toca cada tarea', true)

  // Un miembro solo puede tomar tareas para sí
  await abrirHoja(beto, 'Paseo')
  ok('la hoja queda pegada al borde inferior',
    await beto.$eval('[role=dialog]', d => Math.abs(d.getBoundingClientRect().bottom - innerHeight) < 1))
  ok('en la hoja, un miembro no puede elegir a otra persona', !(await opcionHabilitada(beto, 'Ana')))
  ok('en la hoja, un miembro puede tomar la tarea', await opcionHabilitada(beto, 'Me encargo yo'))
  await beto.keyboard.press('Escape')
  await beto.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 })
  ok('Escape cierra la hoja', true)

  await abrirHoja(beto, 'Comida')
  await elegirEnHoja(beto, 'Me encargo yo')
  await beto.waitForFunction(() => document.body.innerText.includes('hoy te toca a ti'), { timeout: 10000 })
  ok('"Me encargo yo" asigna la tarea solo por hoy', (await itemDe(beto, 'Comida')).includes('hoy te toca a ti'))
  ok('un aviso confirma la asignación', (await textoAviso(beto)).includes('Hoy te toca a ti'), await textoAviso(beto))
  await abrirHoja(beto, 'Comida')
  ok('la hoja explica que es una excepción',
    (await beto.$eval('[role=dialog]', d => d.innerText)).includes('Hoy es una excepción. Normalmente no tiene responsable fijo.'))
  await beto.keyboard.press('Escape')

  // Marcar, deshacer desde el aviso y volver a marcar
  await clicEn(beto, 'Comida', 'Hecho')
  await esperarEstado(beto, 'Comida', 'hecha')
  ok('marcar hecha la deja en verde a mi nombre', (await itemDe(beto, 'Comida')).includes('Tú ·'))
  ok('el aviso ofrece deshacer', (await textoAviso(beto)).includes('Hecho · Comida'))
  await beto.evaluate(() => [...document.querySelectorAll('[role=status] button')].find(b => b.innerText === 'Deshacer').click())
  await esperarEstado(beto, 'Comida', 'pendiente')
  ok('"Deshacer" del aviso la devuelve a pendiente', true)
  await clicEn(beto, 'Comida', 'Hecho')
  await esperarEstado(beto, 'Comida', 'hecha')
  ok('el progreso avanza', (await texto(beto)).includes('1 de 2 hechas'))
  ok('"Hoy en la manada" muestra quién hizo qué', (await feed(beto)).includes('Tú · comida'), await feed(beto))

  await ana.goto(APP + '/')
  await esperarEstado(ana, 'Comida', 'hecha')
  const hechaPorBeto = await itemDe(ana, 'Comida')
  ok('los demás ven quién la hizo y no pueden deshacerla',
    hechaPorBeto.includes('Beto ·') && !hechaPorBeto.includes('Deshacer'), hechaPorBeto)
  ok('los demás ven el registro en "Hoy en la manada"', (await feed(ana)).includes('Beto · comida'))

  // El admin reparte por hoy y vuelve a la rutina
  await abrirHoja(ana, 'Paseo')
  await elegirEnHoja(ana, 'Beto')
  await ana.waitForFunction(() => document.body.innerText.includes('hoy le toca a Beto'), { timeout: 10000 })
  ok('el admin puede asignarle la tarea de hoy a otra persona', true)
  await abrirHoja(ana, 'Paseo')
  ok('la hoja recuerda a quién le toca normalmente',
    (await ana.$eval('[role=dialog]', d => d.innerText)).includes('Normalmente te toca a ti'))
  await elegirEnHoja(ana, 'Me encargo yo')
  await ana.waitForFunction(
    () => [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes('Paseo'))?.innerText.includes('· te toca a ti'),
    { timeout: 10000 })
  ok('volver a quien le toca normalmente quita la excepción', !(await itemDe(ana, 'Paseo')).includes('hoy'))

  await clicEn(ana, 'Paseo', 'Hecho')
  await esperarTexto(ana, '2 de 2 hechas')
  ok('con todo hecho, el título lo celebra', (await texto(ana)).includes('Todo listo por hoy'))
  await clicEn(ana, 'Paseo', 'Deshacer')
  await esperarTexto(ana, '1 de 2 hechas')
  ok('se puede deshacer lo propio desde la tarjeta', JSON.stringify(await pendientesDe(ana)) === '["Paseo"]')

  await beto.goto(paginaLuna)
  await esperarTexto(beto, 'Paseo')
  ok('un miembro ve las tareas pero no puede gestionarlas',
    !(await texto(beto)).includes('Agregar tarea') && !(await texto(beto)).includes('Pausar'))
  await terminar()
} catch (e) {
  await terminar(e)
}
