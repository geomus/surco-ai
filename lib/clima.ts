import 'server-only'
import cacheVerde from '@/data/clima-cache/verde.json'
import cacheAmarillo from '@/data/clima-cache/amarillo.json'
import cacheRojo from '@/data/clima-cache/rojo.json'

export type Clima = {
  origen: 'en_vivo' | 'cache'
  fecha: string
  hourly: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    wind_speed_10m: number[]
    precipitation: number[]
  }
  daily: { time: string[]; precipitation_sum: number[] }
}

type RespuestaOpenMeteo = Omit<Clima, 'origen' | 'fecha'>

const CACHES: Record<string, RespuestaOpenMeteo> = {
  verde: cacheVerde as RespuestaOpenMeteo,
  amarillo: cacheAmarillo as RespuestaOpenMeteo,
  rojo: cacheRojo as RespuestaOpenMeteo,
}
const FECHA_CACHE = '24/10/2026'

export async function obtenerClima(casoId: string, lat: number, lon: number): Promise<Clima> {
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
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 1800 },
    })
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const data = (await res.json()) as RespuestaOpenMeteo
    return {
      ...data,
      origen: 'en_vivo',
      fecha: new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    }
  } catch {
    const cache = CACHES[casoId] ?? cacheVerde
    return { ...(cache as RespuestaOpenMeteo), origen: 'cache', fecha: FECHA_CACHE }
  }
}
