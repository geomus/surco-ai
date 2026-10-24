import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

// Server-only client: derivaciones have no public policies, so every write
// goes through our route handlers after validating consent.
export function supabaseAdmin() {
  if (!cliente) {
    cliente = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
  }
  return cliente
}
