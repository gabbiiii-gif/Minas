import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Cliente {
  id: string
  nome: string
  telefone: string | null
}

interface Props {
  value: Cliente | null
  onChange: (c: Cliente | null) => void
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function ClienteCombobox({ value, onChange, autoFocus, onKeyDown }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Cliente[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .ilike('nome', `%${query}%`)
        .is('deleted_at', null)
        .limit(8)
      setResults((data ?? []) as Cliente[])
    }, 250)
    return () => clearTimeout(handle)
  }, [query, open])

  return (
    <div className="relative">
      <input
        type="text"
        autoFocus={autoFocus}
        value={value ? value.nome : query}
        onChange={(e) => {
          onChange(null)
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar cliente por nome…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      {open && results.length > 0 && !value && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm shadow-lg">
          {results.map((c) => (
            <li
              key={c.id}
              className="cursor-pointer px-3 py-2 hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(c)
                setQuery('')
                setOpen(false)
              }}
            >
              <div className="font-medium">{c.nome}</div>
              {c.telefone && <div className="text-xs text-muted-foreground">{c.telefone}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
