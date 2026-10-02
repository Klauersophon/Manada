import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { alerta, boton, botonSecundario, campo, tarjeta } from '../components/estilos'
import { ESPECIES, especie } from './especies'

type Mascota = {
  id: string
  name: string
  species: string
  notes: string | null
  archived_at: string | null
}
type DatosMascota = Pick<Mascota, 'name' | 'species' | 'notes'>

async function buscarMascotas(circleId: string) {
  const { data, error } = await supabase
    .from('pets')
    .select('id, name, species, notes, archived_at')
    .eq('circle_id', circleId)
    .order('name')
  if (error) throw error
  return data
}

function FormMascota({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: DatosMascota
  onGuardar: (datos: DatosMascota) => Promise<void>
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(inicial?.name ?? '')
  const [tipo, setTipo] = useState(inicial?.species ?? 'dog')
  const [notas, setNotas] = useState(inicial?.notes ?? '')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    await onGuardar({ name: nombre.trim(), species: tipo, notes: notas.trim() || null })
    setOcupado(false)
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-lg bg-green-950/40 p-3">
      <label htmlFor="mascota-nombre" className="block">Nombre</label>
      <input
        id="mascota-nombre"
        required
        pattern=".*\S.*"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className={campo}
      />
      <label htmlFor="mascota-especie" className="block">Especie</label>
      <select
        id="mascota-especie"
        value={tipo}
        onChange={e => setTipo(e.target.value)}
        className={campo}
      >
        {ESPECIES.map(e => (
          <option key={e.valor} value={e.valor}>{e.emoji} {e.nombre}</option>
        ))}
      </select>
      <label htmlFor="mascota-notas" className="block">Notas (opcional)</label>
      <textarea
        id="mascota-notas"
        rows={3}
        placeholder="Alergias, comida, veterinario..."
        value={notas}
        onChange={e => setNotas(e.target.value)}
        className={campo}
      />
      <div className="flex gap-2">
        <button type="submit" disabled={ocupado} className={boton}>
          {ocupado ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>
          Cancelar
        </button>
      </div>
    </form>
  )
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
    <section className={tarjeta}>
      <h2 className="text-lg font-semibold">Mascotas</h2>

      {activas.length === 0 && editando !== 'nueva' && (
        <p className="text-sm text-white/80">
          {esAdmin
            ? 'Todavía no hay mascotas. Agrega la primera.'
            : 'Todavía no hay mascotas. Un admin del hogar puede agregarlas.'}
        </p>
      )}

      <ul className="space-y-3" aria-label="Mascotas">
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
            <li key={m.id} className="flex gap-3 rounded-lg bg-green-950/40 p-3">
              <span className="text-3xl" aria-hidden>{especie(m.species).emoji}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-white/70">{especie(m.species).nombre}</p>
                {m.notes && <p className="whitespace-pre-line text-sm">{m.notes}</p>}
                {esAdmin && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditando(m.id)} className={botonSecundario}>
                      Editar
                    </button>
                    <button onClick={() => cambiarArchivo(m, true)} className={botonSecundario}>
                      Archivar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ),
        )}
      </ul>

      {esAdmin &&
        (editando === 'nueva' ? (
          <FormMascota onGuardar={datos => guardar(datos)} onCancelar={() => setEditando(null)} />
        ) : (
          <button onClick={() => setEditando('nueva')} className={boton}>
            Agregar mascota
          </button>
        ))}

      {archivadas.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setVerArchivadas(v => !v)} className="text-sm underline">
            {verArchivadas ? 'Ocultar archivadas' : `Ver archivadas (${archivadas.length})`}
          </button>
          {verArchivadas && (
            <ul className="space-y-2" aria-label="Mascotas archivadas">
              {archivadas.map(m => (
                <li key={m.id} className="flex items-center justify-between text-white/70">
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
