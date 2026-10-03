import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import Pantalla from '../components/Pantalla'
import { useMiHogar, type Hogar } from '../hogar/useMiHogar'
import { guardarMascotaElegida, leerMascotaElegida } from '../mascotas/seleccion'
import SelectorMascotas from '../mascotas/SelectorMascotas'
import { useMascotas } from '../mascotas/useMascotas'
import Semana from '../semana/Semana'
import { diasDeLaSemana, lunesDe, rangoDeSemana } from '../semana/reglas'

const flecha = 'rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink-soft active:bg-sage-deep'

function SemanaDelHogar({ hogar }: { hogar: Hogar }) {
  const mascotas = useMascotas(hogar.id)
  const [elegida, setElegida] = useState(() => leerMascotaElegida('semana'))
  // 0 es la semana actual; negativo, semanas anteriores.
  const [desplazamiento, setDesplazamiento] = useState(0)
  const lunes = lunesDe(new Date(), desplazamiento)

  if (!mascotas) return <Pantalla navegacion><p>Cargando...</p></Pantalla>
  if (mascotas.length === 0)
    return (
      <Pantalla titulo="Semana" navegacion>
        <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 py-5 text-center text-ink-soft">
          Todavía no hay mascotas.{' '}
          {hogar.esAdmin ? (
            <Link to="/manada" className="font-semibold underline">Agrega la primera en Manada.</Link>
          ) : (
            'Un admin del hogar puede agregarlas.'
          )}
        </p>
      </Pantalla>
    )

  const mascota = mascotas.find(m => m.id === elegida) ?? mascotas[0]
  const elegir = (id: string) => {
    guardarMascotaElegida('semana', id)
    setElegida(id)
  }

  return (
    <Pantalla
      antetitulo={rangoDeSemana(lunes)}
      titulo={`La semana de ${mascota.name}`}
      navegacion
      cabecera={<SelectorMascotas mascotas={mascotas} elegida={mascota.id} onElegir={elegir} />}
    >
      <div className="-mt-2 flex items-center gap-2">
        <button onClick={() => setDesplazamiento(d => d - 1)} className={flecha} aria-label="Semana anterior">
          ‹ Anterior
        </button>
        {desplazamiento !== 0 && (
          <button onClick={() => setDesplazamiento(0)} className={flecha}>
            Esta semana
          </button>
        )}
        <button onClick={() => setDesplazamiento(d => d + 1)} className={`${flecha} ml-auto`} aria-label="Semana siguiente">
          Siguiente ›
        </button>
      </div>
      <Semana key={`${mascota.id}-${desplazamiento}`} hogar={hogar} mascota={mascota} dias={diasDeLaSemana(lunes)} />
    </Pantalla>
  )
}

function SemanaPagina() {
  const { hogar, cargando } = useMiHogar()
  if (cargando) return <Pantalla><p>Cargando...</p></Pantalla>
  if (!hogar) return <Navigate to="/" replace />
  return <SemanaDelHogar hogar={hogar} />
}

export default SemanaPagina
