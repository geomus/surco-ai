import { createAgentUIStreamResponse } from 'ai'
import { z } from 'zod'
import { crearAgente } from '@/lib/agente'
import { obtenerClima } from '@/lib/clima'
import { legajoSchema } from '@/lib/legajo'

export const maxDuration = 60

const cuerpoSchema = z.object({
  messages: z.array(z.unknown()).max(60),
  casoId: z.string().max(20),
  legajo: legajoSchema,
  precioPizarra: z.number().positive().max(2000),
})

export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { messages, casoId, legajo, precioPizarra } = parsed.data
  const clima = await obtenerClima(casoId, legajo.lat, legajo.lon)
  const agent = crearAgente({ legajo, clima, precioPizarra })

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
