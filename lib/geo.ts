import 'server-only'

export type Place = { name: string; lat: number; lon: number }

type GeocodingResult = { name: string; latitude: number; longitude: number; admin1?: string }

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export async function geocodeArgentina(query: string): Promise<Place | null> {
  const [town, province] = query.split(',').map((part) => part.trim())
  if (!town) return null
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name: town, count: '10', language: 'es', countryCode: 'AR' }).toString()

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } })
    if (!res.ok) return null
    const { results = [] } = (await res.json()) as { results?: GeocodingResult[] }
    const match =
      (province && results.find((r) => r.admin1 && normalize(r.admin1).includes(normalize(province)))) || results[0]
    if (!match) return null
    return {
      name: match.admin1 ? `${match.name}, ${match.admin1}` : match.name,
      lat: Math.round(match.latitude * 100) / 100,
      lon: Math.round(match.longitude * 100) / 100,
    }
  } catch {
    return null
  }
}
