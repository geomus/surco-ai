import 'server-only'
import { profileSchema, type FarmProfile } from '@/lib/profile'
import { getAdminClient } from '@/lib/supabase/admin'

export type DemoCase = { id: string; name: string; description: string; profile: FarmProfile }

const CASE_ORDER = ['green', 'yellow', 'red']

export async function getCases(): Promise<DemoCase[]> {
  const { data, error } = await getAdminClient().from('cases').select('id, name, description, profile')
  if (error) throw new Error(`No se pudieron leer los casos: ${error.message}`)
  return data
    .map((row) => ({ ...row, profile: profileSchema.parse(row.profile) }))
    .sort((a, b) => CASE_ORDER.indexOf(a.id) - CASE_ORDER.indexOf(b.id))
}
