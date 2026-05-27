import { Link } from 'react-router-dom'

export default function Forbidden() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-bold">403</h1>
      <p className="text-sm text-muted-foreground">Acesso restrito. Fale com o ADM.</p>
      <Link to="/caixa" className="text-sm text-primary underline">
        Voltar
      </Link>
    </div>
  )
}
