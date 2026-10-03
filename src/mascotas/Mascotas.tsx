import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { alerta, botonAgregar, botonSecundario, etiquetaSeccion, glifo } from '../components/estilos'
import { resumenMascota } from './edad'
import { especie } from './especies'
import FormMascota, { type DatosMascota } from './FormMascota'

type Mascota = DatosMascota & { id: string; archived_at: string | null }

async function buscarMascotas(circleId: string) {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, species, breed, birth_date, birth_year, vet_name, vet_phone, notes, archived_at')
    .eq('circle_id', circleId)
    .order('name')
  if (error) throw error
  return data
}

// Mascotas del hogar. RLS deja que todos los miembros las vean y que solo los admins las cambien,
// así que los botones de gestión solo aparecen para admins.
function Mascotas({ circleId, esAdmin }: { circleId: string; esAdmin: boolean }) {
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  // id de la mascota en edición, 'nueva' al agregar, o null.
  const [editando, setEditando] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const recargar = () => setVersion(v => v + 1)

  useEffect(() => {
    let vigente = true
    buscarMascotas(circleId).then(
      d => vigente && setMascotas(d),
      e => vigente && setError(e.message),
    )
    return () => {
      vigente = false
    }
  }, [circleId, version])

  const activas = mascotas.filter(m => !m.archived_at)
  const archivadas = mascotas.filter(m => m.archived_at)

  async function guardar(datos: DatosMascota, id?: string) {
    setError(null)
    const { error } = id
      ? await supabase.from('pets').update(datos).eq('id', id)
      : await supabase.from('pets').insert({ ...datos, circle_id: circleId })
    if (error) return setError('No pudimos guardar la mascota: ' + error.message)
    setEditando(null)
    recargar()
  }

  async function cambiarArchivo(m: Mascota, archivar: boolean) {
    if (archivar && !confirm(`¿Archivar a ${m.name}? Dejará de aparecer, pero se guarda su historial.`))
      return
    setError(null)
    const { error } = await supabase
      .from('pets')
      .update({ archived_at: archivar ? new Date().toISOString() : null })
      .eq('id', m.id)
    if (error) setError('No pudimos actualizar la mascota: ' + error.message)
    else recargar()
  }

  return (
    <section className="space-y-2.5">
      <h2 className={etiquetaSeccion}>Mascotas</h2>

      {activas.length === 0 && editando !== 'nueva' && (
        <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-soft">
          {esAdmin
            ? 'Todavía no hay mascotas. Agrega la primera.'
            : 'Todavía no hay mascotas. Un admin del hogar puede agregarlas.'}
        </p>
      )}

      <ul className="space-y-2" aria-label="Mascotas">
        {activas.map(m =>
          editando === m.id ? (
            <li key={m.id}>
              <FormMascota
                inicial={m}
                onGuardar={datos => guardar(datos, m.id)}
                onCancelar={() => setEditando(null)}
              />
            </li>
          ) : (
            <li key={m.id} className="flex gap-3 rounded-[14px] border border-line bg-card p-3.5">
              <span className={`${glifo} size-12 rounded-full text-2xl`} aria-hidden>{especie(m.species).emoji}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <Link to={`/mascotas/${m.id}`} className="font-display text-[17px] font-semibold">
                  {m.name}
                </Link>
                <p className="text-[12.5px] text-ink-soft">{resumenMascota(m)}</p>
                {m.notes && <p className="text-sm whitespace-pre-line">{m.notes}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to={`/mascotas/${m.id}`} className={botonSecundario}>
                    Tareas
                  </Link>
                  {esAdmin && (
                    <>
                      <button onClick={() => setEditando(m.id)} className={botonSecundario}>
                        Editar
                      </button>
                      <button onClick={() => cambiarArchivo(m, true)} className={botonSecundario}>
                        Archivar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {esAdmin &&
        (editando === 'nueva' ? (
          <FormMascota onGuardar={datos => guardar(datos)} onCancelar={() => setEditando(null)} />
        ) : (
          <button onClick={() => setEditando('nueva')} className={botonAgregar}>
            Agregar mascota
          </button>
        ))}

      {archivadas.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setVerArchivadas(v => !v)} className="text-sm text-ink-soft underline">
            {verArchivadas ? 'Ocultar archivadas' : `Ver archivadas (${archivadas.length})`}
          </button>
          {verArchivadas && (
            <ul className="space-y-2" aria-label="Mascotas archivadas">
              {archivadas.map(m => (
                <li key={m.id} className="flex items-center justify-between text-ink-soft">
                  <span>
                    {especie(m.species).emoji} {m.name}
                  </span>
                  {esAdmin && (
                    <button onClick={() => cambiarArchivo(m, false)} className={botonSecundario}>
                      Restaurar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p role="alert" className={alerta}>{error}</p>}
    </section>
  )
}

export default Mascotas
