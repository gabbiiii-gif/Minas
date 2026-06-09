import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  valueCents?: number
  /** Texto inicial (ex.: "640,85"). Use junto com `key` p/ re-semear ao trocar de contexto. */
  defaultValueText?: string
  onValueChange?: (rawText: string) => void
}

export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { valueCents, defaultValueText, onValueChange, className, ...rest },
  ref,
) {
  const [local, setLocal] = useState(defaultValueText ?? '')
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={local}
      onChange={(e) => {
        // permite apenas dígitos, vírgula, ponto
        const cleaned = e.target.value.replace(/[^\d.,]/g, '')
        setLocal(cleaned)
        onValueChange?.(cleaned)
      }}
      className={cn(
        'h-14 w-full rounded-md border bg-background px-4 text-2xl font-bold tracking-wide outline-none ring-ring focus-visible:ring-2',
        className,
      )}
      placeholder="0,00"
      {...rest}
    />
  )
})
