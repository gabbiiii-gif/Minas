import { format, toZonedTime } from 'date-fns-tz'

const TZ = (import.meta.env?.VITE_TIMEZONE as string | undefined) ?? 'America/Belem'

export function hojeBelem(): string {
  return format(toZonedTime(new Date(), TZ), 'yyyy-MM-dd', { timeZone: TZ })
}

export function formatBelem(iso: string | Date, pattern = 'dd/MM/yyyy HH:mm'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return format(toZonedTime(d, TZ), pattern, { timeZone: TZ })
}

export function formatTimeBelem(iso: string | Date): string {
  return formatBelem(iso, 'HH:mm:ss')
}
