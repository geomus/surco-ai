import { z } from 'zod'

export const zoneSchema = z.object({
  id: z.string().max(10),
  name: z.string().max(40),
  hectares: z.number().positive().max(100000),
  ndviCurrent: z.number().min(0).max(1),
  ndviBaseline: z.number().min(0.05).max(1),
})

export const contractSchema = z.object({
  tons: z.number().positive().max(100000),
  priceUsdT: z.number().positive().max(2000),
  delivery: z.string().max(10),
})

export const profileSchema = z.object({
  alias: z.string().max(40),
  location: z.string().max(80),
  lat: z.number().min(-56).max(-21),
  lon: z.number().min(-74).max(-53),
  crop: z.string().max(30),
  hectares: z.number().positive().max(100000),
  stage: z.string().max(40),
  referenceYieldTHa: z.number().positive().max(20),
  recentHail: z.boolean(),
  eventNote: z.string().max(200).nullable(),
  zones: z.array(zoneSchema).min(1).max(8),
  contracts: z.array(contractSchema).max(10),
})

export type FarmProfile = z.infer<typeof profileSchema>
export type Zone = z.infer<typeof zoneSchema>
export type Contract = z.infer<typeof contractSchema>

export const profileChangesSchema = z.object({
  crop: z.string().max(30).optional().describe('Cultivo, en minúsculas, ej. trigo, soja, maíz'),
  hectares: z.number().positive().max(100000).optional(),
  stage: z.string().max(40).optional().describe('Etapa fenológica, ej. macollaje, llenado de grano'),
  referenceYieldTHa: z.number().positive().max(20).optional().describe('Rinde esperado en t/ha si el productor lo dice'),
  newContract: contractSchema.optional().describe('Una venta o contrato nuevo que el productor contó'),
})

export type ProfileChanges = z.infer<typeof profileChangesSchema>

export function applyProfileChanges(profile: FarmProfile, changes: ProfileChanges): FarmProfile {
  const next = structuredClone(profile)
  if (changes.crop) next.crop = changes.crop
  if (changes.stage) next.stage = changes.stage
  if (changes.referenceYieldTHa) next.referenceYieldTHa = changes.referenceYieldTHa
  if (changes.hectares && changes.hectares !== next.hectares) {
    const scale = changes.hectares / next.hectares
    next.zones = next.zones.map((zone) => ({
      ...zone,
      hectares: Math.round(zone.hectares * scale * 10) / 10,
    }))
    next.hectares = changes.hectares
  }
  if (changes.newContract) next.contracts = [...next.contracts, changes.newContract]
  return next
}
