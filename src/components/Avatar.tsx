// Círculo con las iniciales de un miembro. El color sale del id, así cada persona conserva el
// suyo en todas las pantallas.
const COLORES = ['#3F6B45', '#7A5EA8', '#C1553F', '#B87D12', '#2F6F8F', '#8A4F7D']

function colorDe(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0
  return COLORES[Math.abs(h) % COLORES.length]
}

function iniciales(nombre: string) {
  const [primera, segunda] = nombre.trim().split(/\s+/)
  return ((primera?.[0] ?? '?') + (segunda?.[0] ?? '')).toUpperCase()
}

function Avatar({ id, nombre, tamano = 'grande' }: { id: string; nombre: string; tamano?: 'grande' | 'chico' }) {
  return (
    <span
      aria-hidden
      style={{ background: colorDe(id) }}
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${
        tamano === 'grande' ? 'size-[42px] text-base' : 'size-[30px] text-sm'
      }`}
    >
      {iniciales(nombre)}
    </span>
  )
}

export default Avatar
