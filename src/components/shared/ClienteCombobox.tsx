import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function ClienteCombobox({ value, onChange, autoFocus, onKeyDown }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Cliente[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      setLoading(true)
      // Busca ampla (até 50) e filtra/normaliza no cliente — evita problema de acento sem unaccent
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .is('deleted_at', null)
        .order('nome')
        .limit(200)

      const q = normalize(query.trim())
      const filtered = ((data ?? []) as Cliente[])
        .filter((c) => normalize(c.nome).includes(q) || (c.telefone ?? '').includes(query.trim()))
        .slice(0, 12)
      setResults(filtered)
      setLoading(false)
    }, 200)
    return () => clearTimeout(handle)
  }, [query, open])

  return (
    <div className="relative">
      <input
        type="text"
        autoFocus={autoFocus}
        value={value ? value.nome : query}
        onChange={(e) => {
          if (value) onChange(null)
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Buscar cliente por nome ou telefone…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      {open && !value && (results.length > 0 || loading || query.trim()) && (
        <motion.ul
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover text-sm shadow-xl"
        >
          {loading && <li className="px-3 py-2 text-muted-foreground">Buscando…</li>}
          {!loading && results.length === 0 && query.trim() && (
            <li className="px-3 py-2 text-muted-foreground">Nenhum cliente encontrado.</li>
          )}
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
        </motion.ul>
      )}
    </div>
  )
}
