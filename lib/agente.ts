import 'server-only'
import { ToolLoopAgent, isStepCount, tool, type InferAgentUIMessage } from 'ai'
import { z } from 'zod'
import { REGLAS } from '@/config/reglas'
import type { Clima } from '@/lib/clima'
import { aplicarCambios, cambiosLegajoSchema } from '@/lib/legajo'
import { calcularSenales, type Escenario } from '@/lib/motor'
import type { Labor, Legajo } from '@/lib/tipos'

export const MODELO = 'anthropic/claude-sonnet-5.5'

export const DESTINOS = {
  financiacion: 'fyo (financiación contra cosecha)',
  seguro: 'Aseguradora, vía productor asesor de seguros matriculado',
} as const

type Contexto = { legajo: Legajo; clima: Clima; precioPizarra: number }

function instrucciones(legajo: Legajo, fuenteClima: string) {
  return `Sos Surco, el copiloto de un productor agropecuario argentino. Hablás como un ingeniero agrónomo de confianza: claro, directo, en español rioplatense y con lenguaje de campo.

Hoy es sábado 24/10/2026. Campaña con El Niño (exceso de lluvias).

Reglas que no se negocian:
- Nunca inventes números. Todo número sale de una herramienta. Si no tenés el dato, decilo.
- Antes de responder sobre clima, lote, cosecha, venta, seguro o financiación, llamá a la herramienta correspondiente.
- Cuando el productor cuente datos de su campo o una venta nueva, llamá a actualizarLegajo antes de seguir.
- Si pregunta "¿y si...?", convertí la pregunta en un escenario de coberturaYVenta y explicá qué cambia frente al caso base.
- Si pide seguro o financiación, llamá a prepararDerivacion. No contratás ni vendés nada: armás la solicitud y él decide compartirla. Los seguros los emite la aseguradora vía un productor asesor matriculado.
- No recomiendes operaciones financieras concretas. Explicá lo que dicen los datos.
- Nombrá la fuente de cada número entre paréntesis: (${fuenteClima}), (Sentinel-2, NDVI precalculado), (rinde de referencia cargado), (precio pizarra cargado a mano), (dato del productor).
- Las reglas son auditables y están en config/reglas.ts. Si te preguntan por un umbral, decí cuál es y que el agrónomo lo puede ajustar.
- Formato: texto plano, sin markdown, sin asteriscos ni numerales. Párrafos cortos y listas con guiones. Máximo 170 palabras salvo que pidan detalle.

Legajo actual del productor (caso ilustrativo):
${JSON.stringify(legajo)}`
}

export function crearAgente(ctx: Contexto) {
  let legajo = structuredClone(ctx.legajo)
  const fuenteClima =
    ctx.clima.origen === 'en_vivo'
      ? `Open-Meteo en vivo, ${ctx.clima.fecha}`
      : `Open-Meteo, caché del ${ctx.clima.fecha}`
  const senales = (labor: Labor = 'pulverizar', escenario: Escenario = {}) =>
    calcularSenales(legajo, ctx.clima, ctx.precioPizarra, labor, escenario)

  return new ToolLoopAgent({
    model: MODELO,
    instructions: instrucciones(legajo, fuenteClima),
    stopWhen: isStepCount(8),
    tools: {
      actualizarLegajo: tool({
        description:
          'Guarda en el legajo los datos que el productor contó en lenguaje natural: cultivo, hectáreas, etapa o una venta/contrato nuevo.',
        inputSchema: cambiosLegajoSchema,
        execute: async (cambios) => {
          legajo = aplicarCambios(legajo, cambios)
          return {
            cambios,
            totalVendidoT: legajo.contratos.reduce((s, c) => s + c.toneladas, 0),
            fuente: 'dato del productor',
          }
        },
      }),
      ventanasDeLabor: tool({
        description:
          'Días aptos de los próximos 7 para pulverizar o cosechar, según viento, lluvia, temperatura y humedad hora por hora.',
        inputSchema: z.object({ labor: z.enum(['pulverizar', 'cosechar']) }),
        execute: async ({ labor }) => {
          const s = senales(labor)
          return {
            labor,
            dias: s.ventanas.dias,
            reglas: labor === 'pulverizar' ? REGLAS.pulverizar : REGLAS.cosechar,
            fuente: fuenteClima,
          }
        },
      }),
      zonasARecorrer: tool({
        description:
          'Compara el NDVI actual de cada zona del lote con el de la misma quincena de años previos y marca las que conviene recorrer.',
        inputSchema: z.object({}),
        execute: async () => ({
          zonas: senales().zonas,
          umbral: REGLAS.ndvi.umbralRecorrer,
          fuente: 'Sentinel-2, NDVI precalculado (caso ilustrativo)',
        }),
      }),
      coberturaYVenta: tool({
        description:
          'Producción estimada (rango), cobertura (vendido / producción probable) y señal de venta. Acepta un escenario hipotético para responder "¿y si...?".',
        inputSchema: z.object({
          toneladasExtraVendidas: z.number().min(0).max(100000).optional(),
          lluviaExtraMm: z.number().min(0).max(1000).optional(),
          caidaRindePct: z.number().min(0).max(90).optional(),
        }),
        execute: async (escenario) => {
          const base = senales()
          const hayEscenario = Object.values(escenario).some((v) => v !== undefined && v > 0)
          const alt = hayEscenario ? senales('pulverizar', escenario) : null
          return {
            base: { produccion: base.produccion, venta: base.venta, semaforo: base.semaforo },
            escenario: alt
              ? { supuestos: escenario, produccion: alt.produccion, venta: alt.venta, semaforo: alt.semaforo }
              : null,
            fuente: 'rinde de referencia cargado × anomalía NDVI; precio pizarra cargado a mano',
          }
        },
      }),
      exposicionSeguro: tool({
        description: 'Exposición del lote a granizo y exceso de lluvia, para decidir si conviene asegurar.',
        inputSchema: z.object({}),
        execute: async () => {
          const s = senales()
          return {
            seguro: s.seguro,
            zonasAfectadas: s.zonas.filter((z) => z.recorrer).map((z) => z.nombre),
            fuente: `${fuenteClima}; Sentinel-2 precalculado`,
          }
        },
      }),
      chequeoDiario: tool({
        description:
          'Chequeo proactivo de mañana: junta ventanas de labor, zonas a recorrer, cobertura, precio y clima en una lista de avisos.',
        inputSchema: z.object({}),
        execute: async () => {
          const s = senales()
          const manana = s.ventanas.dias[1]
          return {
            manana,
            zonasARecorrer: s.zonas.filter((z) => z.recorrer).map((z) => z.nombre),
            cobertura: s.produccion.cobertura,
            alertaPrecio: s.venta.alertaPrecio,
            exposicionSeguro: s.seguro.exposicion,
            semaforo: s.semaforo,
            motivos: s.motivosSemaforo,
            fuente: fuenteClima,
          }
        },
      }),
      prepararDerivacion: tool({
        description:
          'Arma el borrador de la carpeta de financiación para fyo o la solicitud de seguro. El productor la revisa y da su consentimiento antes de compartir.',
        inputSchema: z.object({ tipo: z.enum(['financiacion', 'seguro']) }),
        execute: async ({ tipo }) => {
          const s = senales()
          return {
            tipo,
            destino: DESTINOS[tipo],
            productor: legajo.alias,
            lote: `${legajo.hectareas} ha de ${legajo.cultivo} en ${legajo.localidad}`,
            produccion: s.produccion,
            seguro: s.seguro,
            financiacion: s.financiacion,
            requiereConsentimiento: true,
          }
        },
      }),
    },
  })
}

export type MensajeCopiloto = InferAgentUIMessage<ReturnType<typeof crearAgente>>
