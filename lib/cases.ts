import 'server-only'
import { NEARBY_FIELD_KM } from '@/config/rules'
import { distanceKm } from '@/lib/geo'
import { profileSchema, type FarmProfile } from '@/lib/profile'
import { getAdminClient } from '@/lib/supabase/admin'

export type DemoCase = { id: string; name: string; description: string; profile: FarmProfile }

export const CASE_IDS = ['scratch', 'green', 'yellow', 'red'] as const
const CASE_ORDER: readonly string[] = CASE_IDS

export async function findNearbyDemoField(place: { lat: number; lon: number }) {
  const cases = await getCases()
  const candidates = cases
    .filter((c) => c.profile.lat !== null && c.profile.lon !== null && c.profile.zones.length > 0)
    .map((c) => ({ demoCase: c, km: distanceKm(place, { lat: c.profile.lat!, lon: c.profile.lon! }) }))
    .filter((c) => c.km <= NEARBY_FIELD_KM)
    .sort((a, b) => a.km - b.km)
  return candidates[0] ?? null
}

export async function getCases(): Promise<DemoCase[]> {
  const { data, error } = await getAdminClient().from('cases').select('id, name, description, profile')
  if (error) throw new Error(`No se pudieron leer los casos: ${error.message}`)
  return data
    .map((row) => ({ ...row, profile: profileSchema.parse(row.profile) }))
    .sort((a, b) => CASE_ORDER.indexOf(a.id) - CASE_ORDER.indexOf(b.id))
}
