import { z } from 'zod'
import { obtenerClima } from '@/lib/clima'
import { legajoSchema } from '@/lib/legajo'
import { calcularSenales } from '@/lib/motor'

const cuerpoSchema = z.object({
  casoId: z.string().max(20),
  legajo: legajoSchema,
  precioPizarra: z.number().positive().max(2000),
  labor: z.enum(['pulverizar', 'cosechar']),
})

export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { casoId, legajo, precioPizarra, labor } = parsed.data
  const clima = await obtenerClima(casoId, legajo.lat, legajo.lon)
  return Response.json(calcularSenales(legajo, clima, precioPizarra, labor))
}
