import { z } from 'zod'
import type { Legajo } from '@/lib/tipos'

export const contratoSchema = z.object({
  toneladas: z.number().positive().max(100000),
  precio_usd_t: z.number().positive().max(2000),
  entrega: z.string().max(20),
})

const zonaSchema = z.object({
  id: z.string().max(10),
  nombre: z.string().max(60),
  hectareas: z.number().positive().max(100000),
  ndvi_actual: z.number().min(-1).max(1),
  ndvi_historico: z.number().gt(0).max(1),
})

export const legajoSchema = z.object({
  alias: z.string().max(80),
  localidad: z.string().max(120),
  lat: z.number().min(-56).max(-21),
  lon: z.number().min(-74).max(-53),
  cultivo: z.string().max(40),
  hectareas: z.number().positive().max(100000),
  etapa: z.string().max(80),
  rinde_referencia_t_ha: z.number().positive().max(20),
  granizo_reciente: z.boolean(),
  nota_evento: z.string().max(300).nullable(),
  zonas: z.array(zonaSchema).max(12),
  contratos: z.array(contratoSchema).max(20),
})

export const cambiosLegajoSchema = z.object({
  cultivo: z.string().max(40).optional().describe('Cultivo del lote, ej. trigo, soja, maíz'),
  hectareas: z.number().positive().max(100000).optional().describe('Hectáreas sembradas'),
  etapa: z.string().max(80).optional().describe('Etapa fenológica, ej. llenado de grano'),
  contratoNuevo: contratoSchema
    .optional()
    .describe('Venta o contrato que el productor acaba de contar. entrega en formato AAAA-MM'),
})

export type CambiosLegajo = z.infer<typeof cambiosLegajoSchema>

export function aplicarCambios(legajo: Legajo, cambios: CambiosLegajo): Legajo {
  const factorHa = cambios.hectareas ? cambios.hectareas / legajo.hectareas : 1
  return {
    ...legajo,
    cultivo: cambios.cultivo ?? legajo.cultivo,
    etapa: cambios.etapa ?? legajo.etapa,
    hectareas: cambios.hectareas ?? legajo.hectareas,
    zonas:
      factorHa === 1
        ? legajo.zonas
        : legajo.zonas.map((z) => ({ ...z, hectareas: Math.round(z.hectareas * factorHa) })),
    contratos: cambios.contratoNuevo ? [...legajo.contratos, cambios.contratoNuevo] : legajo.contratos,
  }
}
