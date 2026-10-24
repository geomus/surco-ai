import 'server-only'

export type ResumenBcra =
  | { estado: 'sin_registros'; fuente: string }
  | {
      estado: 'ok'
      periodo: string
      peorSituacion: number
      entidades: number
      montoTotalMilesArs: number
      fuente: string
    }
  | { estado: 'no_disponible'; fuente: string }

type RespuestaDeudas = {
  results?: {
    periodos?: { periodo: string; entidades: { situacion: number; monto: number }[] }[]
  }
}

const FUENTE = 'BCRA, Central de Deudores (API pública)'

export async function consultarBcra(cuit: string): Promise<ResumenBcra> {
  try {
    const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuit}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (res.status === 404) return { estado: 'sin_registros', fuente: FUENTE }
    if (!res.ok) return { estado: 'no_disponible', fuente: FUENTE }
    const data = (await res.json()) as RespuestaDeudas
    const periodo = data.results?.periodos?.[0]
    if (!periodo) return { estado: 'sin_registros', fuente: FUENTE }
    return {
      estado: 'ok',
      periodo: periodo.periodo,
      peorSituacion: Math.max(...periodo.entidades.map((e) => e.situacion)),
      entidades: periodo.entidades.length,
      montoTotalMilesArs: Math.round(periodo.entidades.reduce((s, e) => s + e.monto, 0)),
      fuente: FUENTE,
    }
  } catch {
    return { estado: 'no_disponible', fuente: FUENTE }
  }
}
