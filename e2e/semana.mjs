// Vista Semana: lo hecho hasta hoy, el plan de los próximos días y el reparto. Ana es admin y
// Beto es miembro.
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, terminar, texto,
} from './comun.mjs'

const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const fecha = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const hoy = new Date()
const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
const hoyIso = hoy.getDay() === 0 ? 7 : hoy.getDay()
// Si hoy es domingo, mañana cae en la semana siguiente.
const mananaEnOtraSemana = hoyIso === 7

const celda = (page, tarea, dia) =>
  page.$eval(`td[data-tarea="${tarea}"][data-fecha="${fecha(dia)}"]`, td => ({ tipo: td.dataset.tipo, texto: td.innerText.trim() }))
const esperarCelda = (page, tarea, dia, txt) =>
  page.waitForFunction(
    (sel, txt) => document.querySelector(sel)?.innerText.trim() === txt,
    { timeout: 10000 }, `td[data-tarea="${tarea}"][data-fecha="${fecha(dia)}"]`, txt)
async function abrirPlan(page, tarea, dia) {
  await page.click(`td[data-tarea="${tarea}"][data-fecha="${fecha(dia)}"] button`)
  await page.waitForSelector('[role=dialog]')
}
const opcionHabilitada = (page, t) =>
  page.evaluate(t => {
    const b = [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t))
    return !!b && !b.disabled
  }, t)
const elegirEnHoja = (page, t) =>
  page.evaluate(t => [...document.querySelectorAll('[role=dialog] button')].find(b => b.innerText.includes(t)).click(), t)
const valor = (page, sel, v) => page.$eval(sel, (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, v)

try {
  // Ana arma una mascota con una tarea diaria y otra solo para mañana
  const ana = await nuevaPagina()
  await ana.goto(APP + '/')
  await ingresarConCodigo(ana, `ana+${corrida}@test.cl`)
  await esperarTexto(ana, 'bienvenida a Manada')
  await ana.type('#nombre-hogar', 'Casa Semana')
  await ana.type('#mi-nombre', 'Ana')
  await clicTexto(ana, 'Crear hogar')
  await ana.waitForSelector('nav')
  await irA(ana, 'Semana')
  await esperarTexto(ana, 'Todavía no hay mascotas')
  ok('Semana sin mascotas lleva a agregarlas', true)

  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Agregar mascota')
  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Luna')
  await clicTexto(ana, 'Guardar')
  await ana.waitForSelector('ul[aria-label="Mascotas"] a')
  await ana.click('ul[aria-label="Mascotas"] a')
  await esperarTexto(ana, 'Agregar tarea')
  for (const t of [{ nombre: 'Paseo', hora: '08:00', responsable: 'Ana' }, { nombre: 'Baño', soloDia: DIAS_LARGOS[hoyIso % 7] }]) {
    await clicTexto(ana, 'Agregar tarea')
    await ana.waitForSelector('#tarea-nombre')
    await ana.type('#tarea-nombre', t.nombre)
    if (t.hora) await valor(ana, '#tarea-hora', t.hora)
    if (t.responsable) {
      const v = await ana.$$eval('#tarea-responsable option', (os, r) => os.find(o => o.innerText === r).value, t.responsable)
      await ana.select('#tarea-responsable', v)
    }
    if (t.soloDia)
      await ana.evaluate(dia => {
        for (const b of document.querySelectorAll('fieldset button'))
          if ((b.getAttribute('aria-pressed') === 'true') !== (b.getAttribute('aria-label') === dia)) b.click()
      }, t.soloDia)
    await clicTexto(ana, 'Guardar')
    await ana.waitForFunction(n => [...document.querySelectorAll('ul[aria-label="Tareas"] > li')].some(li => li.innerText.includes(n)), { timeout: 10000 }, t.nombre)
  }

  await irA(ana, 'Hoy')
  await ana.waitForSelector('ul[aria-label="Tareas de hoy"]')
  await ana.evaluate(() => {
    const li = [...document.querySelectorAll('[data-estado]')].find(li => li.innerText.includes('Paseo'))
    ;[...li.querySelectorAll('button')].find(b => b.innerText === 'Hecho').click()
  })
  await ana.waitForSelector('[data-estado="hecha"]')

  // Lo hecho hasta hoy
  await irA(ana, 'Semana')
  await esperarTexto(ana, 'La semana de Luna')
  await ana.waitForSelector('td[data-tarea]')
  ok('hoy muestra la inicial de quien la hizo', JSON.stringify(await celda(ana, 'Paseo', hoy)) === '{"tipo":"hecha","texto":"A"}',
    JSON.stringify(await celda(ana, 'Paseo', hoy)))
  ok('una tarea que hoy no toca muestra un punto', (await celda(ana, 'Baño', hoy)).tipo === 'no-toca')
  if (hoyIso > 1) {
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1)
    ok('los días antes de crear la tarea no cuentan como "sin registrar"', (await celda(ana, 'Paseo', ayer)).tipo === 'no-toca')
  }
  ok('el admin ve cómo se repartió la semana', (await texto(ana)).includes('Cómo se repartió'))
  ok('el reparto cuenta lo hecho por cada uno',
    await ana.$eval('ul[aria-label="Reparto de la semana"]', u => /Tú\s+100% de lo que va de semana\s+1\s+tarea/.test(u.innerText)))

  // El plan de mañana
  if (mananaEnOtraSemana) await ana.click('button[aria-label="Semana siguiente"]')
  await ana.waitForSelector(`td[data-tarea="Baño"][data-fecha="${fecha(manana)}"]`)
  ok('mañana muestra al responsable habitual como previsto', JSON.stringify(await celda(ana, 'Paseo', manana)) === '{"tipo":"plan","texto":"A"}')
  ok('una tarea sin responsable aparece libre', (await celda(ana, 'Baño', manana)).texto === '+')

  // Beto se une
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Crear link de invitación')
  await clicTexto(ana, 'Crear link de invitación')
  await ana.waitForSelector('[data-link]')
  const link = await ana.$eval('[data-link]', p => p.innerText)
  const beto = await nuevaPagina()
  await beto.goto(link)
  await ingresarConCodigo(beto, `beto+${corrida}@test.cl`)
  await esperarTexto(beto, 'Te invitaron a Casa Semana')
  await beto.type('#mi-nombre', 'Beto')
  await clicTexto(beto, 'Unirme')
  await beto.waitForSelector('nav')

  // Ana le reparte el baño de mañana a Beto
  await irA(ana, 'Semana')
  await ana.waitForSelector('td[data-tarea]')
  if (mananaEnOtraSemana) await ana.click('button[aria-label="Semana siguiente"]')
  await ana.waitForSelector(`td[data-tarea="Baño"][data-fecha="${fecha(manana)}"] button`)
  await abrirPlan(ana, 'Baño', manana)
  ok('la hoja de un día futuro dice "Me apunto yo"', await opcionHabilitada(ana, 'Me apunto yo'))
  ok('la hoja explica que es un plan', (await ana.$eval('[role=dialog]', d => d.innerText)).includes('Es un plan'))
  await elegirEnHoja(ana, 'Beto')
  await esperarCelda(ana, 'Baño', manana, 'B')
  ok('el admin puede repartir días futuros', true)
  ok('un aviso confirma el plan', (await ana.$eval('[role=status]', a => a.innerText)).includes('queda Beto'))

  // Beto ve el plan y se apunta a un paseo
  await irA(beto, 'Semana')
  await beto.waitForSelector('td[data-tarea]')
  ok('un miembro no ve el reparto', !(await texto(beto)).includes('Cómo se repartió'))
  if (mananaEnOtraSemana) await beto.click('button[aria-label="Semana siguiente"]')
  await esperarCelda(beto, 'Baño', manana, 'B')
  ok('los demás ven lo planificado', true)
  await abrirPlan(beto, 'Paseo', manana)
  ok('un miembro no puede planificarle tareas a otra persona', !(await opcionHabilitada(beto, 'Ana')))
  await elegirEnHoja(beto, 'Me apunto yo')
  await esperarCelda(beto, 'Paseo', manana, 'B')
  ok('un miembro puede apuntarse a un día futuro', true)

  // Moverse entre semanas
  const rango = await beto.$eval('main p', p => p.innerText)
  await beto.click('button[aria-label="Semana anterior"]')
  await beto.waitForFunction(r => document.querySelector('main p').innerText !== r, { timeout: 5000 }, rango)
  ok('se puede ver la semana anterior', (await texto(beto)).includes('Esta semana'))
  await clicTexto(beto, 'Esta semana')
  await beto.waitForFunction(() => !document.body.innerText.includes('Esta semana'), { timeout: 5000 })
  ok('"Esta semana" vuelve a la semana actual', true)
  await terminar()
} catch (e) {
  await terminar(e)
}
