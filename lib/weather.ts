import 'server-only'
import greenCache from '@/data/weather-cache/green.json'
import yellowCache from '@/data/weather-cache/yellow.json'
import redCache from '@/data/weather-cache/red.json'
import type { WeatherSource } from '@/lib/types'

export type Weather = {
  origin: WeatherSource
  date: string
  hourly: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    wind_speed_10m: number[]
    precipitation: number[]
  }
  daily: { time: string[]; precipitation_sum: number[] }
}

type OpenMeteoResponse = Omit<Weather, 'origin' | 'date'>

const CACHES: Record<string, OpenMeteoResponse> = {
  green: greenCache as OpenMeteoResponse,
  yellow: yellowCache as OpenMeteoResponse,
  red: redCache as OpenMeteoResponse,
}
const CACHE_DATE = '24/10/2026'

export async function getWeather(caseId: string, lat: number, lon: number): Promise<Weather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
    daily: 'precipitation_sum',
    forecast_days: '14',
    timezone: 'America/Argentina/Buenos_Aires',
    wind_speed_unit: 'kmh',
  }).toString()

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 1800 } })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data = (await res.json()) as OpenMeteoResponse
    return {
      ...data,
      origin: 'live',
      date: new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    }
  } catch {
    return { ...(CACHES[caseId] ?? CACHES.green), origin: 'cache', date: CACHE_DATE }
  }
}

export function weatherSourceLabel(weather: Pick<Weather, 'origin' | 'date'>) {
  return weather.origin === 'live'
    ? `Open-Meteo en vivo, ${weather.date}`
    : `Open-Meteo, caché del ${weather.date}`
}
