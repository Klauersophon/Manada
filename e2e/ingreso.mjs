// Ingreso con enlace mágico o con el código del correo, redirecciones y cierre de sesión.
import { APP, corrida, esperarTexto, nuevaPagina, ok, pedirAcceso, ruta, terminar } from './comun.mjs'

try {
  // Con el enlace del correo
  const ana = await nuevaPagina()
  await ana.goto(APP + '/')
  await ana.waitForSelector('#correo')
  ok('sin sesión, / redirige a /ingresar', ruta(ana) === '/ingresar')
  const correo = await pedirAcceso(ana, `ana+${corrida}@test.cl`)
  ok('el correo usa la plantilla de Manada', correo.asunto === 'Tu acceso a Manada', correo.asunto)
  ok('el correo trae código de 6 dígitos', /^\d{6}$/.test(correo.codigo))
  await ana.goto(correo.enlace)
  await esperarTexto(ana, 'bienvenida a Manada')
  ok('el enlace abre la sesión y lleva al inicio', ruta(ana) === '/')
  ok('el token no queda en la URL', !ana.url().includes('access_token'), ana.url())
  await ana.goto(APP + '/ingresar')
  await esperarTexto(ana, 'bienvenida a Manada')
  ok('con sesión, /ingresar redirige al inicio', ruta(ana) === '/')
  await ana.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.includes('Cerrar')).click())
  await ana.waitForSelector('#correo')
  ok('cerrar sesión vuelve a /ingresar', ruta(ana) === '/ingresar')

  // Con el código, en otro navegador
  const beto = await nuevaPagina()
  await beto.goto(APP + '/ingresar')
  const { codigo } = await pedirAcceso(beto, `beto+${corrida}@test.cl`)
  await beto.type('#codigo', codigo === '000000' ? '111111' : '000000')
  await beto.click('button[type=submit]')
  await beto.waitForSelector('[role=alert]')
  const alerta = await beto.$eval('[role=alert]', el => el.innerText)
  ok('un código incorrecto muestra error en español', alerta.includes('no es válido'), alerta)
  await beto.focus('#codigo')
  await beto.keyboard.down('Control')
  await beto.keyboard.press('KeyA')
  await beto.keyboard.up('Control')
  await beto.keyboard.press('Backspace')
  await beto.type('#codigo', codigo)
  await beto.click('button[type=submit]')
  await esperarTexto(beto, 'bienvenida a Manada')
  ok('el código abre la sesión', ruta(beto) === '/')
  await beto.reload()
  await esperarTexto(beto, 'bienvenida a Manada')
  ok('la sesión sobrevive a recargar la página', true)
  await terminar()
} catch (e) {
  await terminar(e)
}
