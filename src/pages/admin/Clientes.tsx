import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { AnimatePresence, motion } from 'motion/react'
import { BlurText } from '@/components/reactbits/BlurText'
import { springModal } from '@/lib/motion'

type Cliente = Database['public']['Tables']['clientes']['Row']

export default function Clientes() {
  const [items, setItems] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Cliente> | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('clientes').select('*').is('deleted_at', null).order('nome')
    if (busca.trim()) q = q.ilike('nome', `%${busca}%`)
    const { data, error } = await q.limit(200)
    if (error) toast.error('Falha ao carregar', { description: error.message })
    setItems((data ?? []) as Cliente[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [busca])

  async function salvar() {
    if (!editing?.nome?.trim()) { toast.error('Nome obrigatório'); return }
    if (editing.id) {
      const { error } = await supabase.from('clientes').update({
        nome: editing.nome,
        telefone: editing.telefone ?? null,
        cpf: editing.cpf ?? null,
      }).eq('id', editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('Cliente atualizado')
    } else {
      const { error } = await supabase.from('clientes').insert({
        nome: editing.nome,
        telefone: editing.telefone ?? null,
        cpf: editing.cpf ?? null,
      })
      if (error) { toast.error(error.message); return }
      toast.success('Cliente criado')
    }
    setEditing(null)
    void load()
  }

  async function arquivar(id: string) {
    if (!confirm('Arquivar cliente (soft-delete)?')) return
    const { error } = await supabase.from('clientes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Arquivado')
    void load()
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold"><BlurText text="Clientes" /></h1>
        <button
          onClick={() => setEditing({ nome: '', telefone: '', cpf: '' })}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Novo cliente
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 border-b bg-muted/80 text-left backdrop-blur">
            <tr>
              <th className="px-4 py-2.5">Nome</th>
              <th className="px-2">Telefone</th>
              <th className="px-2">CPF</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b transition-colors hover:bg-muted/40">
                <td className="px-4 py-2">{c.nome}</td>
                <td className="px-2">{c.telefone ?? '—'}</td>
                <td className="px-2">{c.cpf ?? '—'}</td>
                <td className="px-4 text-right">
                  <button onClick={() => setEditing(c)} className="text-xs text-primary hover:underline">
                    Editar
                  </button>
                  <button onClick={() => arquivar(c.id)} className="ml-3 text-xs text-destructive hover:underline">
                    Arquivar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem clientes.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      <AnimatePresence>
      {editing && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setEditing(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            variants={springModal}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <h2 className="mb-4 text-xl font-bold">{editing.id ? 'Editar' : 'Novo'} cliente</h2>
            <label className="mb-1 block text-sm font-medium">Nome *</label>
            <input
              autoFocus
              value={editing.nome ?? ''}
              onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
              className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
            <label className="mb-1 block text-sm font-medium">Telefone</label>
            <input
              value={editing.telefone ?? ''}
              onChange={(e) => setEditing({ ...editing, telefone: e.target.value })}
              className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
            <label className="mb-1 block text-sm font-medium">CPF</label>
            <input
              value={editing.cpf ?? ''}
              onChange={(e) => setEditing({ ...editing, cpf: e.target.value })}
              className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Cancelar</button>
              <button onClick={salvar} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Salvar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
