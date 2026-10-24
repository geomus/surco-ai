import type { Level } from '@/lib/types'

export const formatPct = (value: number) => `${Math.round(value * 100)}%`
export const formatTons = (value: number) => `${Math.round(value).toLocaleString('es-AR')} t`
export const formatUsd = (value: number) =>
  `USD ${Math.round(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

export const LEVEL_LABEL: Record<Level, string> = {
  green: 'Verde',
  yellow: 'Amarillo',
  red: 'Rojo',
}

export const LEVEL_TEXT: Record<Level, string> = {
  green: 'text-level-green',
  yellow: 'text-level-yellow',
  red: 'text-level-red',
}

export const LEVEL_BG: Record<Level, string> = {
  green: 'bg-level-green',
  yellow: 'bg-level-yellow',
  red: 'bg-level-red',
}

export function formatDay(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
  })
}

export const formatArs = (value: number) => `$ ${Math.round(value).toLocaleString('es-AR')}`

// Referrals are read on a server that runs in UTC, so the producer's timezone is explicit.
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
