import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import Pantalla from '../components/Pantalla'
import { tarjeta } from '../components/estilos'
import { useMiHogar } from '../hogar/useMiHogar'
import { especie } from '../mascotas/especies'
import TareasDeMascota from '../tareas/TareasDeMascota'

type Mascota = {
  id: string
  name: string
  species: string
  notes: string | null
  archived_at: string | null
}

function MascotaPagina() {
  const { id = '' } = useParams()
  const { hogar, cargando } = useMiHogar()
  // undefined mientras carga, null si no existe o no es del hogar (RLS no la devuelve).
  const [mascota, setMascota] = useState<Mascota | null | undefined>(undefined)

  useEffect(() => {
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

  if (cargando || mascota === undefined) return <Pantalla><p>Cargando...</p></Pantalla>
  if (!hogar) return <Navigate to="/" replace />

  if (!mascota)
    return (
      <Pantalla titulo="Mascota no encontrada" navegacion>
        <Link to="/hogar" className="underline">Volver al hogar</Link>
      </Pantalla>
    )

  const tipo = especie(mascota.species)
  return (
    <Pantalla titulo={`${tipo.emoji} ${mascota.name}`} navegacion>
      <Link to="/hogar" className="text-sm underline">← Volver al hogar</Link>
      <section className={tarjeta}>
        <p className="text-sm text-white/70">
          {tipo.nombre}
          {mascota.archived_at && ' · archivada'}
        </p>
        {mascota.notes && <p className="whitespace-pre-line">{mascota.notes}</p>}
      </section>
      <TareasDeMascota
        petId={mascota.id}
        nombreMascota={mascota.name}
        circleId={hogar.id}
        esAdmin={hogar.esAdmin}
      />
    </Pantalla>
  )
}

export default MascotaPagina
