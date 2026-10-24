import { z } from 'zod'
import { getBcraSummary, isValidCuit } from '@/lib/bcra'
import { computeSignals } from '@/lib/engine'
import { CASE_IDS } from '@/lib/cases'
import { isProfileReady, profileSchema } from '@/lib/profile'
import { REFERRAL_DESTINATIONS, type ReferralSummary } from '@/lib/referral'
import { getAdminClient } from '@/lib/supabase/admin'
import { getWeather, weatherSourceLabel } from '@/lib/weather'

const bodySchema = z.object({
  caseId: z.enum(CASE_IDS),
  kind: z.enum(['financing', 'insurance']),
  profile: profileSchema,
  boardPrice: z.number().positive().max(2000),
  consent: z.literal(true),
  cuit: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .optional(),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: 'Falta el consentimiento o hay datos inválidos' }, { status: 400 })
  }
  const { caseId, kind, profile, boardPrice, cuit } = parsed.data
  if (cuit && !isValidCuit(cuit)) {
    return Response.json({ error: 'El CUIT no es válido' }, { status: 400 })
  }

  if (!isProfileReady(profile)) {
    return Response.json({ error: 'Faltan datos del legajo para armar la carpeta' }, { status: 400 })
  }

  // Numbers are recomputed here so a referral never carries client-supplied figures.
  const weather = await getWeather(profile.lat, profile.lon)
  const signals = computeSignals(profile, weather, boardPrice)
  const bcra = kind === 'financing' && cuit ? await getBcraSummary(cuit) : null

  const summary: ReferralSummary = {
    producer: profile.alias,
    field: `${profile.hectares} ha de ${profile.crop} en ${profile.location}`,
    stage: profile.stage,
    weatherSource: weatherSourceLabel(weather),
    boardPrice,
    contracts: profile.contracts,
    production: signals.production,
    insurance: signals.insurance,
    financing: signals.financing,
    zones: signals.zones,
    level: signals.level,
    levelReasons: signals.levelReasons,
    bcra,
  }

  const { data, error } = await getAdminClient()
    .from('referrals')
    .insert({ case_id: caseId, kind, destination: REFERRAL_DESTINATIONS[kind], consent: true, summary })
    .select('id')
    .single()

  if (error) {
    console.error('[referrals] insert failed', error.message)
    return Response.json({ error: 'No se pudo guardar la carpeta' }, { status: 500 })
  }
  return Response.json({ id: data.id })
}
