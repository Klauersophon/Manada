// Agregar, editar, archivar y restaurar mascotas. Ana es admin y Beto es miembro.
import {
  APP, clicTexto, corrida, esperarTexto, ingresarConCodigo, irA, nuevaPagina, ok, terminar, texto,
} from './comun.mjs'

const clicEnMascota = (page, nombre, t) =>
  page.evaluate((nombre, t) => {
    const li = [...document.querySelectorAll('ul[aria-label="Mascotas"] li, ul[aria-label="Mascotas archivadas"] li')]
      .find(li => li.innerText.includes(nombre))
    ;[...li.querySelectorAll('button')].find(b => b.innerText.trim() === t).click()
  }, nombre, t)
const nombresActivas = page =>
  page.$$eval('ul[aria-label="Mascotas"] li a.font-semibold', as => as.map(a => a.innerText))

try {
  const ana = await nuevaPagina()
  ana.on('dialog', d => d.accept())
  await ana.goto(APP + '/')
  await ingresarConCodigo(ana, `ana+${corrida}@test.cl`)
  await esperarTexto(ana, 'bienvenida a Manada')
  await ana.type('#nombre-hogar', 'Casa Mascotas')
  await ana.type('#mi-nombre', 'Ana')
  await clicTexto(ana, 'Crear hogar')
  await ana.waitForSelector('nav')
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Agrega la primera')
  ok('un hogar nuevo invita a agregar la primera mascota', true)

  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Luna')
  await ana.type('#mascota-notas', 'Alérgica al pollo')
  await clicTexto(ana, 'Guardar')
  await esperarTexto(ana, 'Alérgica al pollo')
  await ana.waitForFunction(() => !document.querySelector('#mascota-nombre'), { timeout: 10000 })
  ok('el admin agrega una mascota con sus notas', (await texto(ana)).match(/Luna\s+Perro\s+Alérgica al pollo/) !== null)

  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Michi')
  await ana.select('#mascota-especie', 'cat')
  await clicTexto(ana, 'Guardar')
  await ana.waitForFunction(
    () => [...document.querySelectorAll('ul[aria-label="Mascotas"] li')].some(li => li.innerText.includes('Michi')),
    { timeout: 10000 })
  ok('se elige la especie', (await texto(ana)).match(/Michi\s+Gato/) !== null)

  await clicEnMascota(ana, 'Luna', 'Editar')
  await ana.waitForSelector('#mascota-nombre')
  ok('al editar, el formulario trae los datos actuales',
    (await ana.$eval('#mascota-notas', t => t.value)) === 'Alérgica al pollo')
  await ana.focus('#mascota-nombre')
  await ana.keyboard.down('Control'); await ana.keyboard.press('KeyA'); await ana.keyboard.up('Control')
  await ana.type('#mascota-nombre', 'Lunita')
  await clicTexto(ana, 'Guardar')
  await ana.waitForFunction(() => !document.querySelector('#mascota-nombre') && document.body.innerText.includes('Lunita'),
    { timeout: 10000 })
  ok('el admin renombra una mascota', JSON.stringify(await nombresActivas(ana)) === '["Lunita","Michi"]',
    JSON.stringify(await nombresActivas(ana)))

  await clicEnMascota(ana, 'Michi', 'Archivar')
  await esperarTexto(ana, 'Ver archivadas (1)')
  ok('al archivar, la mascota sale de la lista', JSON.stringify(await nombresActivas(ana)) === '["Lunita"]')
  await clicTexto(ana, 'Ver archivadas (1)')
  await clicEnMascota(ana, 'Michi', 'Restaurar')
  await ana.waitForFunction(() => !document.body.innerText.includes('archivadas'), { timeout: 10000 })
  ok('restaurar devuelve la mascota a la lista', JSON.stringify(await nombresActivas(ana)) === '["Lunita","Michi"]')
  await clicEnMascota(ana, 'Michi', 'Archivar')
  await esperarTexto(ana, 'Ocultar archivadas')

  await clicTexto(ana, 'Crear link de invitación')
  await ana.waitForSelector('[data-link]')
  const link = await ana.$eval('[data-link]', p => p.innerText)

  const beto = await nuevaPagina()
  await beto.goto(link)
  await ingresarConCodigo(beto, `beto+${corrida}@test.cl`)
  await esperarTexto(beto, 'Te invitaron a Casa Mascotas')
  await beto.type('#mi-nombre', 'Beto')
  await clicTexto(beto, 'Unirme')
  await beto.waitForSelector('nav')
  await irA(beto, 'Manada')
  await esperarTexto(beto, 'Lunita')
  ok('un miembro ve las mascotas activas', JSON.stringify(await nombresActivas(beto)) === '["Lunita"]')
  const tb = await texto(beto)
  ok('un miembro no ve botones para agregar ni editar',
    !tb.includes('Agregar mascota') && !tb.includes('Editar') && !tb.includes('Archivar'))
  await clicTexto(beto, 'Ver archivadas (1)')
  await esperarTexto(beto, 'Michi')
  ok('un miembro ve las archivadas pero no puede restaurarlas', !(await texto(beto)).includes('Restaurar'))
  await terminar()
} catch (e) {
  await terminar(e)
}
