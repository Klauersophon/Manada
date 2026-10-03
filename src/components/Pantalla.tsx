import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router'
import { supabase } from '../lib/supabase'
import { leerMascotaElegida } from '../mascotas/seleccion'

const pestana = (activa: boolean) =>
  `flex flex-1 flex-col items-center gap-1 rounded-[10px] py-1.5 text-[10.5px] ${activa ? 'font-semibold text-ink' : 'font-medium text-ink-faint'}`

function Pestanas() {
  const { pathname } = useLocation()
  const elegida = leerMascotaElegida('ficha')
  const rutaMascota = elegida ? `/mascotas/${elegida}` : '/mascotas'
  const tabs = [
    { a: '/', icono: '☀️', texto: 'Hoy', activa: pathname === '/' },
    { a: '/manada', icono: '👥', texto: 'Manada', activa: pathname === '/manada' },
    { a: rutaMascota, icono: '🐾', texto: 'Mascota', activa: pathname.startsWith('/mascotas') },
  ]
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map(t => (
          <NavLink key={t.texto} to={t.a} className={pestana(t.activa)} aria-current={t.activa ? 'page' : undefined}>
            <span aria-hidden className={`text-[19px] leading-none ${t.activa ? '' : 'opacity-55'}`}>{t.icono}</span>
            {t.texto}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// Marco común de las pantallas con sesión: encabezado, contenido y, cuando la persona ya tiene
// hogar, la barra de pestañas de abajo. `cabecera` va pegada al encabezado (el selector de
// mascotas) y `antetitulo` es la línea chica sobre el título (la fecha, por ejemplo).
function Pantalla({
  titulo,
  antetitulo,
  cabecera,
  navegacion = false,
  children,
}: {
  titulo?: ReactNode
  antetitulo?: ReactNode
  cabecera?: ReactNode
  navegacion?: boolean
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-sage text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-sage px-4 pt-3 pb-2.5">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-[17px] font-extrabold tracking-[-.03em]">
              <span className="text-[15px]">🐾</span> Manada
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft"
            >
              Cerrar sesión
            </button>
          </div>
          {cabecera && <div className="mt-2.5">{cabecera}</div>}
        </div>
      </header>
      <main className={`mx-auto max-w-lg space-y-5 px-4 pt-5 ${navegacion ? 'pb-28' : 'pb-8'}`}>
        {(titulo || antetitulo) && (
          <div>
            {antetitulo && <p className="text-[13px] font-medium text-ink-soft">{antetitulo}</p>}
            {titulo && <h1 className="mt-0.5 text-[29px] leading-[1.1] font-extrabold">{titulo}</h1>}
          </div>
        )}
        {children}
      </main>
      {navegacion && <Pestanas />}
    </div>
  )
}

export default Pantalla
