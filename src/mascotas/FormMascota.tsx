import { useState, type FormEvent } from 'react'
import { boton, botonSecundario, campo, etiquetaCampo } from '../components/estilos'
import { fechaLocal } from '../hoy/calendario'
import { ESPECIES } from './especies'

export type DatosMascota = {
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  birth_year: number | null
  vet_name: string | null
  vet_phone: string | null
  notes: string | null
}

const opcional = (v: string) => v.trim() || null

// Formulario de alta y edición de una mascota. Se usa en Manada y en la ficha.
function FormMascota({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial?: DatosMascota
  onGuardar: (datos: DatosMascota) => Promise<void>
  onCancelar: () => void
}) {
  const hoy = new Date()
  const [nombre, setNombre] = useState(inicial?.name ?? '')
  const [tipo, setTipo] = useState(inicial?.species ?? 'dog')
  const [raza, setRaza] = useState(inicial?.breed ?? '')
  // Si solo se sabe el año, se guarda birth_year sin birth_date.
  const [soloAnio, setSoloAnio] = useState(!!inicial?.birth_year && !inicial?.birth_date)
  const [nacimiento, setNacimiento] = useState(inicial?.birth_date ?? '')
  const [anio, setAnio] = useState(inicial?.birth_year ? String(inicial.birth_year) : '')
  const [veterinario, setVeterinario] = useState(inicial?.vet_name ?? '')
  const [telefono, setTelefono] = useState(inicial?.vet_phone ?? '')
  const [notas, setNotas] = useState(inicial?.notes ?? '')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    const fecha = soloAnio ? null : nacimiento || null
    await onGuardar({
      name: nombre.trim(),
      species: tipo,
      breed: opcional(raza),
      birth_date: fecha,
      birth_year: fecha ? Number(fecha.slice(0, 4)) : soloAnio && anio ? Number(anio) : null,
      vet_name: opcional(veterinario),
      vet_phone: opcional(telefono),
      notes: opcional(notas),
    })
    setOcupado(false)
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-[14px] border border-line bg-card p-4">
      <label htmlFor="mascota-nombre" className={etiquetaCampo}>Nombre</label>
      <input
        id="mascota-nombre"
        required
        pattern=".*\S.*"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className={campo}
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="mascota-especie" className={etiquetaCampo}>Especie</label>
          <select id="mascota-especie" value={tipo} onChange={e => setTipo(e.target.value)} className={campo}>
            {ESPECIES.map(e => (
              <option key={e.valor} value={e.valor}>{e.emoji} {e.nombre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mascota-raza" className={etiquetaCampo}>Raza</label>
          <input
            id="mascota-raza"
            placeholder="Mestizo"
            value={raza}
            onChange={e => setRaza(e.target.value)}
            className={campo}
          />
        </div>
      </div>

      <label htmlFor={soloAnio ? 'mascota-anio' : 'mascota-nacimiento'} className={etiquetaCampo}>
        {soloAnio ? 'Año de nacimiento' : 'Fecha de nacimiento'}
      </label>
      {soloAnio ? (
        <input
          id="mascota-anio"
          type="number"
          inputMode="numeric"
          min={1980}
          max={hoy.getFullYear()}
          placeholder={String(hoy.getFullYear() - 3)}
          value={anio}
          onChange={e => setAnio(e.target.value)}
          className={campo}
        />
      ) : (
        <input
          id="mascota-nacimiento"
          type="date"
          max={fechaLocal(hoy)}
          value={nacimiento}
          onChange={e => setNacimiento(e.target.value)}
          className={campo}
        />
      )}
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          id="mascota-solo-anio"
          type="checkbox"
          checked={soloAnio}
          onChange={e => setSoloAnio(e.target.checked)}
          className="size-4 accent-moss"
        />
        Solo sé el año
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label htmlFor="mascota-veterinario" className={etiquetaCampo}>Veterinario</label>
          <input
            id="mascota-veterinario"
            value={veterinario}
            onChange={e => setVeterinario(e.target.value)}
            className={campo}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mascota-telefono" className={etiquetaCampo}>Teléfono</label>
          <input
            id="mascota-telefono"
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            className={campo}
          />
        </div>
      </div>

      <label htmlFor="mascota-notas" className={etiquetaCampo}>Nota para quien la cuide</label>
      <textarea
        id="mascota-notas"
        rows={3}
        placeholder="Alergias, miedos, cuánto come..."
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

export default FormMascota
