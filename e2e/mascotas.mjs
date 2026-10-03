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
const valor = (page, sel, v) => page.$eval(sel, (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}, v)
const hoy = new Date()
const haceTresAnios = `${hoy.getFullYear() - 3}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
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
  await ana.type('#mascota-raza', 'Mestizo')
  await valor(ana, '#mascota-nacimiento', haceTresAnios)
  await ana.type('#mascota-veterinario', 'Vet Miraflores')
  await ana.type('#mascota-telefono', '987 654 321')
  await ana.type('#mascota-notas', 'Alérgica al pollo')
  await clicTexto(ana, 'Guardar')
  await esperarTexto(ana, 'Alérgica al pollo')
  await ana.waitForFunction(() => !document.querySelector('#mascota-nombre'), { timeout: 10000 })
  ok('el admin agrega una mascota con raza, edad y notas',
    (await texto(ana)).match(/Luna\s+Perro · Mestizo · 3 años\s+Alérgica al pollo/) !== null)

  await clicTexto(ana, 'Agregar mascota')
  await ana.type('#mascota-nombre', 'Michi')
  await ana.select('#mascota-especie', 'cat')
  await ana.click('#mascota-solo-anio')
  await ana.type('#mascota-anio', String(hoy.getFullYear() - 2))
  await clicTexto(ana, 'Guardar')
  await ana.waitForFunction(
    () => [...document.querySelectorAll('ul[aria-label="Mascotas"] li')].some(li => li.innerText.includes('Michi')),
    { timeout: 10000 })
  ok('se elige la especie y, con solo el año, la edad es aproximada',
    (await texto(ana)).match(/Michi\s+Gato · unos 2 años/) !== null)

  // La ficha muestra el veterinario y el admin puede editarla
  await ana.evaluate(() => [...document.querySelectorAll('ul[aria-label="Mascotas"] a')].find(a => a.innerText === 'Luna').click())
  await ana.waitForSelector('[data-resumen]')
  ok('la ficha resume especie, raza y edad', (await ana.$eval('[data-resumen]', p => p.innerText)) === 'Perro · Mestizo · 3 años')
  ok('el teléfono del veterinario se puede tocar para llamar',
    (await ana.$eval('a[href^="tel:"]', a => a.getAttribute('href'))) === 'tel:987654321')
  await clicTexto(ana, 'Editar ficha')
  await ana.waitForSelector('#mascota-raza')
  ok('al editar la ficha, trae el nacimiento guardado', (await ana.$eval('#mascota-nacimiento', i => i.value)) === haceTresAnios)
  await ana.focus('#mascota-raza')
  await ana.keyboard.down('Control'); await ana.keyboard.press('KeyA'); await ana.keyboard.up('Control')
  await ana.type('#mascota-raza', 'Labrador')
  await clicTexto(ana, 'Guardar')
  await ana.waitForFunction(() => document.querySelector('[data-resumen]')?.innerText === 'Perro · Labrador · 3 años', { timeout: 10000 })
  ok('el admin edita la ficha desde la mascota', true)
  const fichaLuna = ana.url()
  await irA(ana, 'Manada')
  await esperarTexto(ana, 'Labrador')

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
  await beto.goto(fichaLuna)
  await beto.waitForSelector('[data-resumen]')
  ok('un miembro ve la ficha pero no puede editarla', !(await texto(beto)).includes('Editar ficha'))
  await terminar()
} catch (e) {
  await terminar(e)
}
