import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Filter = { column: string; value: string }

interface Options<T> {
  table: string
  schema?: string
  filter?: Filter
  initialQuery: () => Promise<T[]>
  orderKey?: keyof T
  orderDesc?: boolean
}

export function useRealtimeTable<T extends { id: string }>(opts: Options<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    opts
      .initialQuery()
      .then((data) => {
        if (!active) return
        setRows(orderRows(data, opts.orderKey, opts.orderDesc))
        setLoading(false)
      })
      .catch((e) => {
        if (!active) return
        setError(e?.message ?? 'Erro ao carregar')
        setLoading(false)
      })

    const filterStr = opts.filter ? `${opts.filter.column}=eq.${opts.filter.value}` : undefined
    const channel = supabase
      .channel(`rt:${opts.schema ?? 'public'}.${opts.table}:${filterStr ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: opts.schema ?? 'public',
          table: opts.table,
          ...(filterStr ? { filter: filterStr } : {}),
        },
        (payload) => {
          setRows((current) => {
            let next = current
            if (payload.eventType === 'INSERT') {
              const r = payload.new as T
              if (!current.find((x) => x.id === r.id)) next = [r, ...current]
            } else if (payload.eventType === 'UPDATE') {
              next = current.map((x) => (x.id === (payload.new as T).id ? (payload.new as T) : x))
            } else if (payload.eventType === 'DELETE') {
              next = current.filter((x) => x.id !== (payload.old as T).id)
            }
            return orderRows(next, opts.orderKey, opts.orderDesc)
          })
        },
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.table, opts.schema, opts.filter?.column, opts.filter?.value])

  return { rows, loading, error, setRows }
}

function orderRows<T>(rows: T[], key?: keyof T, desc?: boolean): T[] {
  if (!key) return rows
  return [...rows].sort((a, b) => {
    const va = a[key] as unknown
    const vb = b[key] as unknown
    if (va === vb) return 0
    const order = (va as never) < (vb as never) ? -1 : 1
    return desc ? -order : order
  })
}
