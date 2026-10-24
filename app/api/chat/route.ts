import { createAgentUIStreamResponse } from 'ai'
import { z } from 'zod'
import { createFarmAgent } from '@/lib/agent'
import { profileSchema } from '@/lib/profile'
import { getWeather } from '@/lib/weather'

export const maxDuration = 60

const bodySchema = z.object({
  messages: z.array(z.unknown()).max(60),
  caseId: z.enum(['green', 'yellow', 'red']),
  profile: profileSchema,
  boardPrice: z.number().positive().max(2000),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { messages, caseId, profile, boardPrice } = parsed.data
  const weather = await getWeather(caseId, profile.lat, profile.lon)
  const agent = createFarmAgent({ profile, weather, boardPrice })

  return createAgentUIStreamResponse({ agent, uiMessages: messages })
}
