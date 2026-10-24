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

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
