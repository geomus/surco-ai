import { z } from 'zod'
import { DEFAULT_YIELD_T_HA } from '@/config/rules'

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
  lat: z.number().min(-56).max(-21).nullable(),
  lon: z.number().min(-74).max(-53).nullable(),
  crop: z.string().max(30),
  hectares: z.number().min(0).max(100000),
  stage: z.string().max(40),
  referenceYieldTHa: z.number().min(0).max(20),
  recentHail: z.boolean(),
  eventNote: z.string().max(200).nullable(),
  zones: z.array(zoneSchema).max(8),
  contracts: z.array(contractSchema).max(10),
})

export type FarmProfile = z.infer<typeof profileSchema>
export type Zone = z.infer<typeof zoneSchema>
export type Contract = z.infer<typeof contractSchema>

export const BLANK_PROFILE: FarmProfile = {
  alias: 'Productor nuevo',
  location: '',
  lat: null,
  lon: null,
  crop: '',
  hectares: 0,
  stage: '',
  referenceYieldTHa: 0,
  recentHail: false,
  eventNote: null,
  zones: [],
  contracts: [],
}

export const profileChangesSchema = z.object({
  alias: z.string().max(40).optional().describe('Nombre o apodo con el que el productor quiere figurar'),
  location: z
    .string()
    .max(80)
    .optional()
    .describe('Localidad del lote, idealmente con provincia, ej. "Ataliva, Santa Fe"'),
  crop: z.string().max(30).optional().describe('Cultivo, en minúsculas, ej. trigo, soja, maíz'),
  hectares: z.number().positive().max(100000).optional(),
  stage: z.string().max(40).optional().describe('Etapa fenológica, ej. macollaje, llenado de grano'),
  referenceYieldTHa: z.number().positive().max(20).optional().describe('Rinde esperado en t/ha si el productor lo dice'),
  recentHail: z.boolean().optional().describe('true si el productor contó que le cayó granizo hace poco'),
  eventNote: z.string().max(200).optional().describe('Descripción breve del evento climático que contó, con fecha'),
  newContract: contractSchema.optional().describe('Una venta o contrato nuevo que el productor contó'),
})

export type ProfileChanges = z.infer<typeof profileChangesSchema>

export function scaleZones(zones: Zone[], hectares: number): Zone[] {
  const total = zones.reduce((sum, zone) => sum + zone.hectares, 0)
  if (!total || !hectares) return zones
  return zones.map((zone) => ({ ...zone, hectares: Math.round((zone.hectares / total) * hectares * 10) / 10 }))
}

export function applyProfileChanges(profile: FarmProfile, changes: ProfileChanges): FarmProfile {
  const next = structuredClone(profile)
  if (changes.alias) next.alias = changes.alias
  if (changes.crop) {
    next.crop = changes.crop
    if (!next.referenceYieldTHa) next.referenceYieldTHa = DEFAULT_YIELD_T_HA[changes.crop] ?? 0
  }
  if (changes.stage) next.stage = changes.stage
  if (changes.referenceYieldTHa) next.referenceYieldTHa = changes.referenceYieldTHa
  if (changes.recentHail !== undefined) next.recentHail = changes.recentHail
  if (changes.eventNote) next.eventNote = changes.eventNote
  if (changes.hectares && changes.hectares !== next.hectares) {
    next.zones = scaleZones(next.zones, changes.hectares)
    next.hectares = changes.hectares
  }
  if (changes.newContract) next.contracts = [...next.contracts, changes.newContract]
  return next
}

export function missingProfileFields(profile: FarmProfile): string[] {
  const missing: string[] = []
  if (profile.lat === null || profile.lon === null) missing.push('localidad del lote')
  if (!profile.hectares) missing.push('hectáreas')
  if (!profile.crop) missing.push('cultivo')
  if (!profile.referenceYieldTHa) missing.push('rinde esperado')
  return missing
}

export function isProfileReady(
  profile: FarmProfile,
): profile is FarmProfile & { lat: number; lon: number } {
  return missingProfileFields(profile).length === 0
}
