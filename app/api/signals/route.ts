import { z } from 'zod'
import { computeSignals } from '@/lib/engine'
import { profileSchema } from '@/lib/profile'
import { getWeather, weatherSourceLabel } from '@/lib/weather'

const bodySchema = z.object({
  caseId: z.enum(['green', 'yellow', 'red']),
  profile: profileSchema,
  boardPrice: z.number().positive().max(2000),
  task: z.enum(['spray', 'harvest']).default('spray'),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { caseId, profile, boardPrice, task } = parsed.data
  const weather = await getWeather(caseId, profile.lat, profile.lon)
  return Response.json({
    signals: computeSignals(profile, weather, boardPrice, task),
    weatherSource: weatherSourceLabel(weather),
  })
}
