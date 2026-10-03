// Utilidades compartidas por las pruebas de punta a punta. Corren contra el Supabase local y su
// buzón de prueba (Mailpit), nunca contra el proyecto real: ver el bloqueo en nuevaPagina().
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

export const APP = process.env.E2E_APP ?? 'http://localhost:5174'
const MAILPIT = process.env.E2E_MAILPIT ?? 'http://127.0.0.1:55324'
// Sufijo para que cada corrida use correos nuevos: la base local conserva datos entre corridas.
export const corrida = Date.now()
export const resultados = []
export const ok = (nombre, cond, detalle = '') =>
  resultados.push(`${cond ? 'OK  ' : 'FAIL'} ${nombre}${detalle ? ' — ' + detalle : ''}`)

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(p => p && existsSync(p))
if (!CHROME) throw new Error('No encontré Chrome. Indica su ruta en la variable CHROME_PATH.')

export async function correoPara(email) {
  for (let i = 0; i < 120; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)
    const { messages } = await r.json()
    if (messages?.length) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()
      await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE', body: JSON.stringify({ IDs: [messages[0].ID] }) })
      return {
        asunto: m.Subject,
        enlace: m.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&'),
        codigo: m.HTML.match(/<strong>(\d+)<\/strong>/)[1],
      }
    }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error('No llegó correo a ' + email)
}

export const ruta = page => new URL(page.url()).pathname
export const texto = page => page.evaluate(() => document.body.innerText)
export const esperarTexto = (page, t) =>
  page.waitForFunction(t => document.body.innerText.includes(t), { timeout: 10000 }, t)
export const clicTexto = (page, t) =>
  page.evaluate(t => [...document.querySelectorAll('button')].find(b => b.innerText.trim() === t).click(), t)
export const irA = (page, pestana) =>
  page.evaluate(p => [...document.querySelectorAll('nav a')].find(a => a.innerText === p).click(), pestana)

export async function pedirAcceso(page, email) {
  await page.waitForSelector('#correo')
  await page.type('#correo', email)
  await page.click('button[type=submit]')
  await esperarTexto(page, 'Te enviamos un correo')
  return correoPara(email)
}

export async function ingresarConCodigo(page, email) {
  const { codigo } = await pedirAcceso(page, email)
  await page.type('#codigo', codigo)
  await page.click('button[type=submit]')
}

export const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })

// Seguro: cualquier solicitud al Supabase real se bloquea y hace fallar la prueba.
const remotas = []
export async function nuevaPagina() {
  const page = await (await browser.createBrowserContext()).newPage()
  await page.setRequestInterception(true)
  page.on('request', r => {
    if (r.url().includes('supabase.co')) {
      remotas.push(r.url())
      r.abort()
    } else r.continue()
  })
  return page
}

export async function terminar(error) {
  if (error) ok('ejecución sin errores', false, error.message)
  ok('ninguna solicitud fue al Supabase real', remotas.length === 0, remotas[0])
  await browser.close()
  console.log(resultados.join('\n'))
  process.exit(resultados.some(r => r.startsWith('FAIL')) ? 1 : 0)
}
