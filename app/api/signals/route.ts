import { z } from 'zod'
import { CASE_IDS } from '@/lib/cases'
import { computeSignals } from '@/lib/engine'
import { isProfileReady, missingProfileFields, profileSchema } from '@/lib/profile'
import { getWeather, weatherSourceLabel } from '@/lib/weather'

const bodySchema = z.object({
  caseId: z.enum(CASE_IDS),
  profile: profileSchema,
  boardPrice: z.number().positive().max(2000),
  task: z.enum(['spray', 'harvest']).default('spray'),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Pedido inválido' }, { status: 400 })
  }
  const { profile, boardPrice, task } = parsed.data
  if (!isProfileReady(profile)) {
    return Response.json({ signals: null, weatherSource: null, missing: missingProfileFields(profile) })
  }
  const weather = await getWeather(profile.lat, profile.lon)
  return Response.json({
    signals: computeSignals(profile, weather, boardPrice, task),
    weatherSource: weatherSourceLabel(weather),
    missing: [],
  })
}
