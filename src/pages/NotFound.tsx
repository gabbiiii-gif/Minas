import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-sm text-muted-foreground">Página não encontrada.</p>
      <Link to="/" className="text-sm text-primary underline">
        Voltar
      </Link>
    </div>
  )
}
