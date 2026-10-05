// Corre las pruebas de punta a punta: levanta Vite en el puerto 5174 apuntando al Supabase
// local y ejecuta cada prueba. Uso: `npm run e2e` (todas) o `npm run e2e -- hoy mascotas`.
//
// Requiere `npx supabase start`. Usa el puerto 5174 con --strictPort para no conectarse por
// error a un `npm run dev` en el 5173, que apunta al Supabase real.
import { execSync, spawn, spawnSync } from 'node:child_process'

const PRUEBAS = ['ingreso', 'hogar', 'mascotas', 'hoy', 'semana', 'vivo']
const PUERTO = 5174
const elegidas = process.argv.slice(2).length ? process.argv.slice(2) : PRUEBAS

function supabaseLocal() {
  let salida
  try {
    salida = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    throw new Error('Supabase local no está corriendo. Levántalo con `npx supabase start`.')
  }
  const valor = clave => salida.match(new RegExp(`^${clave}="?([^"\\n]+)"?`, 'm'))?.[1]
  const api = valor('API_URL')
  const key = valor('PUBLISHABLE_KEY')
  const mailpit = valor('MAILPIT_URL') ?? valor('INBUCKET_URL')
  if (!api || !key || !mailpit) throw new Error('No pude leer la URL o la key de `supabase status`.')
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(api)) throw new Error(`La API no es local: ${api}`)
  return { api, key, mailpit }
}

function levantarVite({ api, key }) {
  const vite = spawn('npx', ['vite', '--port', String(PUERTO), '--strictPort'], {
    env: { ...process.env, VITE_SUPABASE_URL: api, VITE_SUPABASE_ANON_KEY: key, NO_COLOR: '1' },
    shell: true,
  })
  return new Promise((resolve, reject) => {
    let log = ''
    const plazo = setTimeout(() => {
      apagar(vite)
      reject(new Error(`Vite no arrancó en 30 segundos:\n${log}`))
    }, 30000)
    const leer = d => {
      // Por si la terminal fuerza colores: los códigos ANSI separan "localhost:" del puerto.
      log += String(d).replace(/\x1b\[[0-9;]*m/g, '')
      if (log.includes(`localhost:${PUERTO}`)) {
        clearTimeout(plazo)
        resolve(vite)
      }
    }
    vite.stdout.on('data', leer)
    vite.stderr.on('data', leer)
    vite.on('exit', () => {
      clearTimeout(plazo)
      reject(new Error(`Vite no pudo usar el puerto ${PUERTO}:\n${log}`))
    })
  })
}

function apagar(proceso) {
  // Con shell: true, kill() solo cierra la shell. En Windows hay que cerrar todo el árbol.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(proceso.pid), '/T', '/F'])
  else proceso.kill()
}

const local = supabaseLocal()
const vite = await levantarVite(local)
let fallidas = 0
try {
  for (const prueba of elegidas) {
    console.log(`\n== ${prueba}`)
    const { status } = spawnSync('node', [`e2e/${prueba}.mjs`], {
      stdio: 'inherit',
      env: { ...process.env, E2E_APP: `http://localhost:${PUERTO}`, E2E_MAILPIT: local.mailpit },
    })
    if (status !== 0) fallidas++
  }
} finally {
  apagar(vite)
}

console.log(fallidas ? `\n${fallidas} prueba(s) con fallas` : '\nTodas las pruebas pasaron')
process.exit(fallidas ? 1 : 0)
