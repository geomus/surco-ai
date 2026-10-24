import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Caso } from '@/lib/tipos'

const ORDEN = ['verde', 'amarillo', 'rojo']

export async function obtenerCasos(): Promise<Caso[]> {
  const { data, error } = await supabaseAdmin()
    .from('casos')
    .select('id, nombre, descripcion, legajo')
  if (error) throw new Error(`No se pudieron leer los casos: ${error.message}`)
  return (data as Caso[]).sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id))
}
