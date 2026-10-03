import { Link } from 'react-router'

function NoEncontrado() {
  return (
    <div className="grid min-h-dvh place-items-center bg-sage px-6 text-ink">
      <div className="space-y-4 text-center">
        <h1 className="text-[27px] font-extrabold">Esta página no existe 🐾</h1>
        <Link to="/" className="font-semibold text-moss underline underline-offset-[3px]">Volver al inicio</Link>
      </div>
    </div>
  )
}

export default NoEncontrado
