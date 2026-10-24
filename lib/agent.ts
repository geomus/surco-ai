import 'server-only'
import { ToolLoopAgent, isStepCount, tool, type InferAgentUIMessage } from 'ai'
import { z } from 'zod'
import { RULES } from '@/config/rules'
import { computeSignals, type Scenario } from '@/lib/engine'
import { applyProfileChanges, profileChangesSchema, type FarmProfile } from '@/lib/profile'
import { REFERRAL_DESTINATIONS } from '@/lib/referral'
import type { FieldTask } from '@/lib/types'
import { weatherSourceLabel, type Weather } from '@/lib/weather'

export const AGENT_MODEL = 'anthropic/claude-sonnet-5.5'

type AgentContext = { profile: FarmProfile; weather: Weather; boardPrice: number }

function buildInstructions(profile: FarmProfile, weatherSource: string) {
  return `Sos Surco, el copiloto de un productor agropecuario argentino. Hablás como un ingeniero agrónomo de confianza: claro, directo, en español rioplatense y con lenguaje de campo.

Hoy es sábado 24/10/2026. Campaña con El Niño (exceso de lluvias).

Reglas que no se negocian:
- Nunca inventes números. Todo número sale de una herramienta. Si no tenés el dato, decilo.
- Antes de responder sobre clima, lote, cosecha, venta, seguro o financiación, llamá a la herramienta correspondiente.
- Cuando el productor cuente datos de su campo o una venta nueva, llamá a updateProfile antes de seguir.
- Si pregunta "¿y si...?", convertí la pregunta en un escenario de coverageAndSale y explicá qué cambia frente al caso base.
- Si pide seguro o financiación, llamá a prepareReferral. No contratás ni vendés nada: armás la solicitud y él decide compartirla. Los seguros los emite la aseguradora vía un productor asesor matriculado.
- No recomiendes operaciones financieras concretas. Explicá lo que dicen los datos.
- Nombrá la fuente de cada número entre paréntesis: (${weatherSource}), (Sentinel-2, NDVI precalculado), (rinde de referencia cargado), (precio pizarra cargado a mano), (dato del productor).
- Las reglas son auditables y están en config/rules.ts. Si te preguntan por un umbral, decí cuál es y que el agrónomo lo puede ajustar.
- Formato: texto plano, sin markdown, sin asteriscos ni numerales. Párrafos cortos y listas con guiones. Máximo 170 palabras salvo que pidan detalle.

Legajo actual del productor (caso ilustrativo):
${JSON.stringify(profile)}`
}

export function createFarmAgent(context: AgentContext) {
  let profile = structuredClone(context.profile)
  const weatherSource = weatherSourceLabel(context.weather)
  const signals = (task: FieldTask = 'spray', scenario: Scenario = {}) =>
    computeSignals(profile, context.weather, context.boardPrice, task, scenario)

  return new ToolLoopAgent({
    model: AGENT_MODEL,
    instructions: buildInstructions(profile, weatherSource),
    stopWhen: isStepCount(8),
    tools: {
      updateProfile: tool({
        description:
          'Guarda en el legajo los datos que el productor contó en lenguaje natural: cultivo, hectáreas, etapa o una venta/contrato nuevo.',
        inputSchema: profileChangesSchema,
        execute: async (changes) => {
          profile = applyProfileChanges(profile, changes)
          return {
            changes,
            totalSoldT: profile.contracts.reduce((sum, c) => sum + c.tons, 0),
            source: 'dato del productor',
          }
        },
      }),
      fieldWindows: tool({
        description:
          'Días aptos de los próximos 7 para pulverizar o cosechar, según viento, lluvia, temperatura y humedad hora por hora.',
        inputSchema: z.object({ task: z.enum(['spray', 'harvest']) }),
        execute: async ({ task }) => ({
          task,
          days: signals(task).windows.days,
          rules: task === 'spray' ? RULES.spray : RULES.harvest,
          source: weatherSource,
        }),
      }),
      zonesToInspect: tool({
        description:
          'Compara el NDVI actual de cada zona del lote con el de la misma quincena de años previos y marca las que conviene recorrer.',
        inputSchema: z.object({}),
        execute: async () => ({
          zones: signals().zones,
          threshold: RULES.ndvi.inspectThreshold,
          source: 'Sentinel-2, NDVI precalculado (caso ilustrativo)',
        }),
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
          const base = signals()
          const hasScenario = Object.values(scenario).some((value) => value !== undefined && value > 0)
          const alternative = hasScenario ? signals('spray', scenario) : null
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
            source: 'rinde de referencia cargado × anomalía NDVI; precio pizarra cargado a mano',
          }
        },
      }),
      insuranceExposure: tool({
        description: 'Exposición del lote a granizo y exceso de lluvia, para decidir si conviene asegurar.',
        inputSchema: z.object({}),
        execute: async () => {
          const s = signals()
          return {
            insurance: s.insurance,
            affectedZones: s.zones.filter((z) => z.inspect).map((z) => z.name),
            source: `${weatherSource}; Sentinel-2 precalculado`,
          }
        },
      }),
      dailyCheck: tool({
        description:
          'Chequeo proactivo de mañana: junta ventanas de labor, zonas a recorrer, cobertura, precio y clima en una lista de avisos.',
        inputSchema: z.object({}),
        execute: async () => {
          const s = signals()
          return {
            tomorrow: s.windows.days[1],
            zonesToInspect: s.zones.filter((z) => z.inspect).map((z) => z.name),
            coverage: s.production.coverage,
            priceAlert: s.sale.priceAlert,
            insuranceExposure: s.insurance.exposure,
            level: s.level,
            reasons: s.levelReasons,
            source: weatherSource,
          }
        },
      }),
      prepareReferral: tool({
        description:
          'Arma el borrador de la carpeta de financiación para fyo o la solicitud de seguro. El productor la revisa y da su consentimiento antes de compartir.',
        inputSchema: z.object({ kind: z.enum(['financing', 'insurance']) }),
        execute: async ({ kind }) => {
          const s = signals()
          return {
            kind,
            destination: REFERRAL_DESTINATIONS[kind],
            producer: profile.alias,
            field: `${profile.hectares} ha de ${profile.crop} en ${profile.location}`,
            production: s.production,
            insurance: s.insurance,
            financing: s.financing,
            requiresConsent: true,
          }
        },
      }),
    },
  })
}

export type FarmAgentMessage = InferAgentUIMessage<ReturnType<typeof createFarmAgent>>
