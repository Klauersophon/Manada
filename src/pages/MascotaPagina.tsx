import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { etiquetaSeccion, tarjeta } from '../components/estilos'
import { useMiHogar, type Hogar } from '../hogar/useMiHogar'
import { especie } from '../mascotas/especies'
import { guardarMascotaElegida, leerMascotaElegida } from '../mascotas/seleccion'
import SelectorMascotas from '../mascotas/SelectorMascotas'
import { useMascotas } from '../mascotas/useMascotas'
import TareasDeMascota from '../tareas/TareasDeMascota'

type Mascota = {
  id: string
  name: string
  species: string
  notes: string | null
  archived_at: string | null
}

function PerfilMascota({ hogar, id }: { hogar: Hogar; id: string | undefined }) {
  const navigate = useNavigate()
  const mascotas = useMascotas(hogar.id)
  // undefined mientras carga, null si no existe o no es del hogar (RLS no la devuelve).
  const [mascota, setMascota] = useState<Mascota | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    guardarMascotaElegida('ficha', id)
    let vigente = true
    supabase
      .from('pets')
      .select('id, name, species, notes, archived_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (vigente) setMascota(data)
      })
    return () => {
      vigente = false
    }
  }, [id])

  // Sin id (pestaña Mascota): abrir la última elegida o la primera del hogar.
  if (!id) {
    if (!mascotas) return <Pantalla navegacion><p>Cargando...</p></Pantalla>
    const recordada = leerMascotaElegida('ficha')
    const destino = mascotas.find(m => m.id === recordada) ?? mascotas[0]
    if (destino) return <Navigate to={`/mascotas/${destino.id}`} replace />
    return (
      <Pantalla titulo="Mascotas" navegacion>
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
  }

  const selector = mascotas && (
    <SelectorMascotas mascotas={mascotas} elegida={id} onElegir={m => navigate(`/mascotas/${m}`)} />
  )

  if (mascota === undefined || mascota?.id !== id)
    return (
      <Pantalla navegacion cabecera={selector}>
        <p>{mascota === null ? '' : 'Cargando...'}</p>
      </Pantalla>
    )

  if (!mascota)
    return (
      <Pantalla titulo="Mascota no encontrada" navegacion cabecera={selector}>
        <Link to="/manada" className="underline">Volver a Manada</Link>
      </Pantalla>
    )

  const tipo = especie(mascota.species)
  return (
    <Pantalla navegacion cabecera={selector}>
      <section className={`${tarjeta} text-center`}>
        <div className="mx-auto grid size-[76px] place-items-center rounded-full bg-sage text-[40px]">
          {tipo.emoji}
        </div>
        <h1 className="text-[25px] font-extrabold">{mascota.name}</h1>
        <p className="text-[13.5px] text-ink-soft">
          {tipo.nombre}
          {mascota.archived_at && ' · archivada'}
        </p>
      </section>

      <TareasDeMascota
        petId={mascota.id}
        nombreMascota={mascota.name}
        circleId={hogar.id}
        esAdmin={hogar.esAdmin}
      />

      {mascota.notes && (
        <section className="space-y-2.5">
          <h2 className={etiquetaSeccion}>Nota para quien la cuide</h2>
          <p className={`${tarjeta} text-[14.5px] whitespace-pre-line`}>{mascota.notes}</p>
        </section>
      )}
    </Pantalla>
  )
}

function MascotaPagina() {
  const { id } = useParams()
  const { hogar, cargando } = useMiHogar()

  if (cargando) return <Pantalla><p>Cargando...</p></Pantalla>
  if (!hogar) return <Navigate to="/" replace />
  return <PerfilMascota hogar={hogar} id={id} />
}

export default MascotaPagina
