import { Link } from 'react-router'

function NoEncontrado() {
  return (
    <div className="min-h-screen bg-green-900 text-white grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Esta página no existe 🐾</h1>
        <Link to="/" className="underline">Volver al inicio</Link>
      </div>
    </div>
  )
}

export default NoEncontrado
