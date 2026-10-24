import { createAgentUIStreamResponse } from 'ai'
import { z } from 'zod'
import { createFarmAgent } from '@/lib/agent'
import { CASE_IDS } from '@/lib/cases'
import { profileSchema } from '@/lib/profile'

export const maxDuration = 60

const bodySchema = z.object({
  messages: z.array(z.unknown()).max(60),
  caseId: z.enum(CASE_IDS),
  profile: profileSchema,
  boardPrice: z.number().positive().max(2000),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { messages, profile, boardPrice } = parsed.data
  const agent = createFarmAgent({ profile, boardPrice })

  return createAgentUIStreamResponse({ agent, uiMessages: messages, onError: chatErrorMessage })
}

function chatErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[chat] agent failed', message)
  if (message.includes('credit card')) {
    return 'El asistente no está disponible: falta activar AI Gateway en la cuenta de Vercel (agregar una tarjeta).'
  }
  return 'No pude responder. Probá de nuevo en un momento.'
}
