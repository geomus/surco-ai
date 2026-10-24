import 'server-only'

export type BcraSummary =
  | { status: 'ok'; period: string; entities: number; worstSituation: number; totalAmountThousandsArs: number }
  | { status: 'no_debts' }
  | { status: 'unavailable' }

type BcraResponse = {
  results?: {
    periodos?: { periodo: string; entidades: { situacion: number; monto: number }[] }[]
  }
}

export function isValidCuit(cuit: string) {
  if (!/^\d{11}$/.test(cuit)) return false
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(cuit[i]), 0)
  const check = 11 - (sum % 11)
  const expected = check === 11 ? 0 : check === 10 ? 9 : check
  return expected === Number(cuit[10])
}

// Public BCRA "Central de Deudores" API. Only called with the producer's own CUIT
// and explicit consent; the name it returns is never stored.
export async function getBcraSummary(cuit: string): Promise<BcraSummary> {
  try {
    const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cuit}`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    if (res.status === 404) return { status: 'no_debts' }
    if (!res.ok) return { status: 'unavailable' }
    const data = (await res.json()) as BcraResponse
    const latest = data.results?.periodos?.[0]
    if (!latest) return { status: 'no_debts' }
    return {
      status: 'ok',
      period: latest.periodo,
      entities: latest.entidades.length,
      worstSituation: Math.max(...latest.entidades.map((e) => e.situacion)),
      totalAmountThousandsArs: latest.entidades.reduce((sum, e) => sum + e.monto, 0),
    }
  } catch {
    return { status: 'unavailable' }
  }
}
