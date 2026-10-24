import { z } from 'zod'
import { DESTINOS } from '@/lib/agente'
import { consultarBcra } from '@/lib/bcra'
import { obtenerClima } from '@/lib/clima'
import { legajoSchema } from '@/lib/legajo'
import { calcularSenales } from '@/lib/motor'
import { supabaseAdmin } from '@/lib/supabase/admin'

const cuerpoSchema = z.object({
  casoId: z.string().max(20),
  tipo: z.enum(['financiacion', 'seguro']),
  consentimiento: z.literal(true),
  legajo: legajoSchema,
  precioPizarra: z.number().positive().max(2000),
  cuit: z
    .string()
    .regex(/^\d{11}$/, 'El CUIT tiene que tener 11 dígitos')
    .optional(),
})

export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Pedido inválido' },
      { status: 400 },
    )
  }
  const { casoId, tipo, legajo, precioPizarra, cuit } = parsed.data
  const clima = await obtenerClima(casoId, legajo.lat, legajo.lon)
  const senales = calcularSenales(legajo, clima, precioPizarra)
  const bcra = tipo === 'financiacion' && cuit ? await consultarBcra(cuit) : null

  const { data, error } = await supabaseAdmin()
    .from('derivaciones')
    .insert({
      caso_id: casoId,
      tipo,
      destino: DESTINOS[tipo],
      consentimiento: true,
      resumen: {
        legajo,
        precioPizarra,
        senales,
        bcra,
        fuenteClima: { origen: clima.origen, fecha: clima.fecha },
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[derivaciones] insert', error.message)
    return Response.json({ error: 'No se pudo guardar la carpeta' }, { status: 500 })
  }
  return Response.json({ id: data.id })
}
