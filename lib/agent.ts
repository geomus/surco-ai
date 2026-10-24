import 'server-only'
import { ToolLoopAgent, isStepCount, tool, type InferAgentUIMessage } from 'ai'
import { z } from 'zod'
import { RULES } from '@/config/rules'
import { findNearbyDemoField } from '@/lib/cases'
import { computeSignals, type Scenario } from '@/lib/engine'
import { geocodeArgentina } from '@/lib/geo'
import {
  applyProfileChanges,
  isProfileReady,
  missingProfileFields,
  profileChangesSchema,
  scaleZones,
  type FarmProfile,
} from '@/lib/profile'
import { REFERRAL_DESTINATIONS } from '@/lib/referral'
import type { FieldTask } from '@/lib/types'
import { getWeather, weatherSourceLabel, type Weather } from '@/lib/weather'

// Free-tier AI Gateway model verified to handle tool calls in Spanish; override with AI_MODEL.
export const AGENT_MODEL = process.env.AI_MODEL ?? 'nvidia/nemotron-3.5-lightning-free'

type AgentContext = { profile: FarmProfile; boardPrice: number }

function buildInstructions(profile: FarmProfile) {
  const missing = missingProfileFields(profile)
  return `Sos MiCampo, el copiloto de un productor agropecuario argentino. Hablás como un ingeniero agrónomo de confianza: claro, directo, en español rioplatense y con lenguaje de campo.

Hoy es sábado 24/10/2026. Campaña con El Niño (exceso de lluvias).

Reglas que no se negocian:
- Nunca inventes números. Todo número sale de una herramienta. Si no tenés el dato, decilo.
- Cuando el productor cuente datos de su campo (localidad, cultivo, hectáreas, etapa, rinde, granizo) o una venta, llamá a updateProfile UNA sola vez con todo lo que contó, antes de seguir.
- Si updateProfile devuelve campos faltantes, pedilos en una sola pregunta corta. No calcules nada hasta tenerlos.
- Con el legajo completo, antes de responder sobre clima, lote, cosecha, venta, seguro o financiación, llamá a la herramienta correspondiente. Si es la primera vez que el legajo queda completo, llamá a dailyCheck y resumí el panorama.
- Si pregunta "¿y si...?", convertí la pregunta en un escenario de coverageAndSale y explicá qué cambia frente al caso base.
- Si pide seguro o financiación, llamá a prepareReferral. No contratás ni vendés nada: armás la solicitud y él decide compartirla. Los seguros los emite la aseguradora vía un productor asesor matriculado.
- No recomiendes operaciones financieras concretas. Explicá lo que dicen los datos.
- Nombrá la fuente de cada número entre paréntesis, usando el campo "source" de cada herramienta.
- Si el croquis de zonas es ilustrativo o no hay zonas, decilo.
- Las reglas son auditables y están en config/rules.ts. Si te preguntan por un umbral, decí cuál es y que el agrónomo lo puede ajustar.
- Formato: texto plano, sin markdown, sin asteriscos ni numerales. Párrafos cortos y listas con guiones. Máximo 170 palabras salvo que pidan detalle.

Legajo actual del productor:
${JSON.stringify(profile)}
${missing.length ? `Faltan para calcular: ${missing.join(', ')}.` : 'El legajo está completo.'}`
}

export function createFarmAgent(context: AgentContext) {
  let profile = structuredClone(context.profile)
  let weatherRequest: Promise<Weather> | null = null

  const loadWeather = () => {
    if (!isProfileReady(profile)) throw new Error('Legajo incompleto')
    weatherRequest ??= getWeather(profile.lat, profile.lon)
    return weatherRequest
  }

  const pending = () =>
    isProfileReady(profile)
      ? null
      : { missing: missingProfileFields(profile), note: 'Pedile al productor estos datos antes de calcular.' }

  const signalsFor = async (task: FieldTask = 'spray', scenario: Scenario = {}) => {
    const weather = await loadWeather()
    return {
      signals: computeSignals(profile, weather, context.boardPrice, task, scenario),
      weatherSource: weatherSourceLabel(weather),
    }
  }

  return new ToolLoopAgent({
    model: AGENT_MODEL,
    instructions: buildInstructions(profile),
    stopWhen: isStepCount(8),
    tools: {
      updateProfile: tool({
        description:
          'Guarda en el legajo los datos que el productor contó en lenguaje natural: localidad, cultivo, hectáreas, etapa, rinde, granizo o una venta/contrato nuevo.',
        inputSchema: profileChangesSchema,
        execute: async (changes) => {
          let next = applyProfileChanges(profile, changes)
          let locationNotFound = false
          let zonesSource: string | null = null

          if (changes.location) {
            const place = await geocodeArgentina(changes.location)
            if (place) {
              next = { ...next, location: place.name, lat: place.lat, lon: place.lon }
              weatherRequest = null
              const nearby = await findNearbyDemoField(place)
              if (nearby && next.zones.length === 0) {
                next.zones = scaleZones(nearby.demoCase.profile.zones, next.hectares)
                zonesSource = `croquis ilustrativo de un lote a ${Math.round(nearby.km)} km`
              }
            } else {
              locationNotFound = true
            }
          }

          profile = next
          return {
            profile,
            missing: missingProfileFields(profile),
            locationNotFound,
            zonesSource: zonesSource ?? (profile.zones.length ? 'Sentinel-2, NDVI precalculado' : 'sin zonas: se usa el lote entero'),
            totalSoldT: profile.contracts.reduce((sum, c) => sum + c.tons, 0),
            source: 'dato del productor; ubicación de Open-Meteo Geocoding',
          }
        },
      }),
      fieldWindows: tool({
        description:
          'Días aptos de los próximos 7 para pulverizar o cosechar, según viento, lluvia, temperatura y humedad hora por hora.',
        inputSchema: z.object({ task: z.enum(['spray', 'harvest']) }),
        execute: async ({ task }) => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals, weatherSource } = await signalsFor(task)
          return {
            task,
            days: signals.windows.days,
            rules: task === 'spray' ? RULES.spray : RULES.harvest,
            source: weatherSource,
          }
        },
      }),
      zonesToInspect: tool({
        description:
          'Compara el NDVI actual de cada zona del lote con el de la misma quincena de años previos y marca las que conviene recorrer.',
        inputSchema: z.object({}),
        execute: async () => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals } = await signalsFor()
          return {
            zones: signals.zones,
            threshold: RULES.ndvi.inspectThreshold,
            source: profile.zones.length ? 'Sentinel-2, NDVI precalculado (ilustrativo)' : 'sin zonas cargadas',
          }
        },
      }),
      coverageAndSale: tool({
        description:
          'Producción estimada (rango), cobertura (vendido / producción probable) y señal de venta. Acepta un escenario hipotético para responder "¿y si...?".',
        inputSchema: z.object({
          extraSoldTons: z.number().min(0).max(100000).optional(),
          extraRainMm: z.number().min(0).max(1000).optional(),
          yieldDropPct: z.number().min(0).max(90).optional(),
        }),
        execute: async (scenario) => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals: base } = await signalsFor()
          const hasScenario = Object.values(scenario).some((value) => value !== undefined && value > 0)
          const alternative = hasScenario ? (await signalsFor('spray', scenario)).signals : null
          return {
            base: { production: base.production, sale: base.sale, level: base.level },
            scenario: alternative
              ? {
                  assumptions: scenario,
                  production: alternative.production,
                  sale: alternative.sale,
                  level: alternative.level,
                }
              : null,
            source: 'rinde de referencia × anomalía NDVI; precio pizarra cargado a mano',
          }
        },
      }),
      insuranceExposure: tool({
        description: 'Exposición del lote a granizo y exceso de lluvia, para decidir si conviene asegurar.',
        inputSchema: z.object({}),
        execute: async () => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals, weatherSource } = await signalsFor()
          return {
            insurance: signals.insurance,
            affectedZones: signals.zones.filter((z) => z.inspect).map((z) => z.name),
            source: `${weatherSource}; Sentinel-2 precalculado`,
          }
        },
      }),
      dailyCheck: tool({
        description:
          'Chequeo proactivo: junta ventanas de labor, zonas a recorrer, cobertura, precio y clima en una lista de avisos.',
        inputSchema: z.object({}),
        execute: async () => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals, weatherSource } = await signalsFor()
          return {
            tomorrow: signals.windows.days[1],
            zonesToInspect: signals.zones.filter((z) => z.inspect).map((z) => z.name),
            coverage: signals.production.coverage,
            priceAlert: signals.sale.priceAlert,
            insuranceExposure: signals.insurance.exposure,
            level: signals.level,
            reasons: signals.levelReasons,
            source: weatherSource,
          }
        },
      }),
      prepareReferral: tool({
        description:
          'Arma el borrador de la carpeta de financiación para fyo o la solicitud de seguro. El productor la revisa y da su consentimiento antes de compartir.',
        inputSchema: z.object({ kind: z.enum(['financing', 'insurance']) }),
        execute: async ({ kind }) => {
          const blocked = pending()
          if (blocked) return blocked
          const { signals } = await signalsFor()
          return {
            kind,
            destination: REFERRAL_DESTINATIONS[kind],
            producer: profile.alias,
            field: `${profile.hectares} ha de ${profile.crop} en ${profile.location}`,
            production: signals.production,
            insurance: signals.insurance,
            financing: signals.financing,
            requiresConsent: true as const,
          }
        },
      }),
    },
  })
}

export type FarmAgentMessage = InferAgentUIMessage<ReturnType<typeof createFarmAgent>>
