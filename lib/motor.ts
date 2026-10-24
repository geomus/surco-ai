import { REGLAS } from '@/config/reglas'
import type { Clima } from '@/lib/clima'
import type { DiaLabor, Labor, Legajo, Nivel, Senales } from '@/lib/tipos'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const redondear = (v: number, dec = 0) => Math.round(v * 10 ** dec) / 10 ** dec

export type Escenario = {
  toneladasExtraVendidas?: number
  lluviaExtraMm?: number
  caidaRindePct?: number
}

function horaApta(labor: Labor, viento: number, temp: number, hr: number, lluvia: number) {
  if (labor === 'pulverizar') {
    const r = REGLAS.pulverizar
    if (lluvia > r.lluviaMaxMmHora) return 'lluvia'
    if (viento > r.vientoMaxKmh) return 'viento fuerte'
    if (viento < r.vientoMinKmh) return 'calma (riesgo de inversión térmica)'
    if (temp > r.temperaturaMaxC) return 'temperatura alta'
    if (hr < r.humedadMinPct) return 'humedad baja'
    return null
  }
  const r = REGLAS.cosechar
  if (lluvia > 0) return 'lluvia'
  if (viento > r.vientoMaxKmh) return 'viento fuerte'
  if (hr > r.humedadMaxPct) return 'humedad alta'
  return null
}

export function ventanasDeLabor(clima: Clima, labor: Labor): DiaLabor[] {
  const r = labor === 'pulverizar' ? REGLAS.pulverizar : REGLAS.cosechar
  const dias = new Map<string, { idx: number; hora: number }[]>()
  clima.hourly.time.forEach((t, idx) => {
    const [fecha, hh] = t.split('T')
    const hora = Number(hh.slice(0, 2))
    if (!dias.has(fecha)) dias.set(fecha, [])
    dias.get(fecha)!.push({ idx, hora })
  })

  return [...dias.entries()].slice(0, REGLAS.diasPronostico).map(([fecha, horas]) => {
    const h = clima.hourly
    let racha = 0
    let mejorRacha = 0
    const motivos = new Map<string, number>()
    let vientoMax = 0
    let lluviaDia = 0

    for (const { idx, hora } of horas) {
      lluviaDia += h.precipitation[idx] ?? 0
      if (hora < r.horaInicio || hora >= r.horaFin) continue
      vientoMax = Math.max(vientoMax, h.wind_speed_10m[idx])
      const motivo = horaApta(
        labor,
        h.wind_speed_10m[idx],
        h.temperature_2m[idx],
        h.relative_humidity_2m[idx],
        h.precipitation[idx] ?? 0,
      )
      if (motivo) {
        motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1)
        racha = 0
      } else {
        racha += 1
        mejorRacha = Math.max(mejorRacha, racha)
      }
    }

    const lluviaBloquea =
      labor === 'cosechar' && lluviaDia > REGLAS.cosechar.lluviaMaxMmDia
    const apto = mejorRacha >= r.horasMinimasSeguidas && !lluviaBloquea
    const motivoPrincipal = [...motivos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      fecha,
      apto,
      horasAptas: mejorRacha,
      motivo: apto
        ? `${mejorRacha} h seguidas en condiciones`
        : lluviaBloquea
          ? 'lluvia en el día'
          : motivoPrincipal ?? 'sin bloque suficiente',
      vientoMaxKmh: redondear(vientoMax),
      lluviaMm: redondear(lluviaDia, 1),
    }
  })
}

export function calcularSenales(
  legajo: Legajo,
  clima: Clima,
  precioPizarra: number,
  labor: Labor = 'pulverizar',
  escenario: Escenario = {},
): Senales {
  const zonas = legajo.zonas.map((z) => {
    const anomalia = redondear(z.ndvi_actual / z.ndvi_historico, 2)
    return { ...z, anomalia, recorrer: anomalia < REGLAS.ndvi.umbralRecorrer }
  })

  const haTotal = zonas.reduce((s, z) => s + z.hectareas, 0) || legajo.hectareas
  const anomaliaPonderada = redondear(
    zonas.reduce((s, z) => s + z.anomalia * z.hectareas, 0) / haTotal || 1,
    2,
  )

  const lluvia14 = redondear(
    clima.daily.precipitation_sum.reduce((s, v) => s + (v ?? 0), 0) + (escenario.lluviaExtraMm ?? 0),
    1,
  )
  const factorCaida = 1 - (escenario.caidaRindePct ?? 0) / 100
  const factorLluviaCosecha = (escenario.lluviaExtraMm ?? 0) > 100 ? 0.92 : 1

  const esperadaT = redondear(
    legajo.hectareas *
      legajo.rinde_referencia_t_ha *
      clamp(anomaliaPonderada, REGLAS.ndvi.anomaliaMin, REGLAS.ndvi.anomaliaMax) *
      factorCaida *
      factorLluviaCosecha,
  )
  const inc = REGLAS.ndvi.rangoIncertidumbre
  const pesimistaT = redondear(esperadaT * (1 - inc))
  const optimistaT = redondear(esperadaT * (1 + inc))
  const vendidoT =
    legajo.contratos.reduce((s, c) => s + c.toneladas, 0) + (escenario.toneladasExtraVendidas ?? 0)
  const cobertura = esperadaT > 0 ? redondear(vendidoT / esperadaT, 2) : 0
  const coberturaPesimista = pesimistaT > 0 ? redondear(vendidoT / pesimistaT, 2) : 0

  const toneladasContrato = legajo.contratos.reduce((s, c) => s + c.toneladas, 0)
  const precioContratoPromedio = toneladasContrato
    ? redondear(
        legajo.contratos.reduce((s, c) => s + c.toneladas * c.precio_usd_t, 0) / toneladasContrato,
      )
    : 0
  const alertaPrecio =
    precioContratoPromedio > 0 &&
    precioPizarra > precioContratoPromedio * (1 + REGLAS.precio.alertaSobreContrato)

  let senalVenta: Senales['venta']['senal'] = 'escalonar'
  let explicacionVenta = 'Cobertura moderada: conviene escalonar ventas chicas en lugar de una grande.'
  if (cobertura >= REGLAS.cobertura.rojo) {
    senalVenta = 'no_vender_mas'
    explicacionVenta = `Ya comprometiste el ${Math.round(cobertura * 100)}% de lo que probablemente coseches. Vender más te expone a no poder entregar.`
  } else if (cobertura < REGLAS.cobertura.amarillo && precioPizarra >= precioContratoPromedio) {
    senalVenta = 'fijar_parte'
    explicacionVenta = `Tenés margen (cobertura ${Math.round(cobertura * 100)}%) y el precio pizarra está igual o por encima de tus contratos: podrías fijar una parte.`
  }

  const motivosSeguro: string[] = []
  let exposicion: Nivel = 'verde'
  if (legajo.granizo_reciente) {
    exposicion = 'rojo'
    motivosSeguro.push(legajo.nota_evento ?? 'Granizo reciente en la zona')
  }
  if (lluvia14 >= REGLAS.seguro.lluviaAltaMm14d) {
    exposicion = 'rojo'
    motivosSeguro.push(`${lluvia14} mm pronosticados en 14 días (exceso hídrico, año Niño)`)
  } else if (lluvia14 >= REGLAS.seguro.lluviaMediaMm14d) {
    if (exposicion === 'verde') exposicion = 'amarillo'
    motivosSeguro.push(`${lluvia14} mm pronosticados en 14 días`)
  }
  if (zonas.some((z) => z.recorrer) && exposicion === 'verde') {
    exposicion = 'amarillo'
    motivosSeguro.push('Zonas con vegetación por debajo de su historial')
  }
  if (legajo.nota_evento && !legajo.granizo_reciente) motivosSeguro.push(legajo.nota_evento)
  if (motivosSeguro.length === 0) motivosSeguro.push('Sin eventos ni pronóstico adverso relevante')

  const valorProduccionPesimistaUsd = redondear(pesimistaT * precioPizarra)
  const compromisosUsd = redondear(
    legajo.contratos.reduce((s, c) => s + c.toneladas * c.precio_usd_t, 0),
  )
  const margenUsd = valorProduccionPesimistaUsd - compromisosUsd
  const motivosFin: string[] = []
  let nivelFin: Nivel = 'verde'
  if (coberturaPesimista > 1) {
    nivelFin = 'rojo'
    motivosFin.push('En el escenario pesimista no alcanza para entregar lo vendido')
  } else if (coberturaPesimista > REGLAS.cobertura.rojo) {
    nivelFin = 'amarillo'
    motivosFin.push('Margen de entrega ajustado en el escenario pesimista')
  } else {
    motivosFin.push('La producción pesimista cubre los compromisos con margen')
  }
  if (exposicion === 'rojo') {
    if (nivelFin === 'verde') nivelFin = 'amarillo'
    motivosFin.push('Exposición climática alta: conviene seguro o warrant como garantía')
  }

  const ventanas = ventanasDeLabor(clima, labor)
  const motivosSemaforo: string[] = []
  let semaforo: Nivel = 'verde'
  if (cobertura > REGLAS.cobertura.rojo) {
    semaforo = 'rojo'
    motivosSemaforo.push(`Cobertura ${Math.round(cobertura * 100)}% (umbral rojo ${REGLAS.cobertura.rojo * 100}%)`)
  } else if (cobertura >= REGLAS.cobertura.amarillo) {
    semaforo = 'amarillo'
    motivosSemaforo.push(`Cobertura ${Math.round(cobertura * 100)}% (umbral amarillo ${REGLAS.cobertura.amarillo * 100}%)`)
  }
  if (exposicion === 'rojo') {
    if (semaforo === 'verde') semaforo = 'amarillo'
    motivosSemaforo.push('Exposición climática alta')
  }
  if (alertaPrecio) {
    if (semaforo === 'verde') semaforo = 'amarillo'
    motivosSemaforo.push('El mercado supera tus contratos en más de 10%')
  }
  if (motivosSemaforo.length === 0) motivosSemaforo.push('Cobertura holgada y sin alertas')

  return {
    semaforo,
    motivosSemaforo,
    ventanas: {
      labor,
      dias: ventanas,
      fuente: { origen: clima.origen, fecha: clima.fecha },
    },
    zonas,
    produccion: {
      anomaliaPonderada,
      esperadaT,
      pesimistaT,
      optimistaT,
      vendidoT,
      cobertura,
      coberturaPesimista,
    },
    venta: {
      precioPizarra,
      precioContratoPromedio,
      alertaPrecio,
      senal: senalVenta,
      explicacion: explicacionVenta,
    },
    seguro: { exposicion, lluviaProximos14dMm: lluvia14, motivos: motivosSeguro },
    financiacion: {
      nivel: nivelFin,
      valorProduccionPesimistaUsd,
      compromisosUsd,
      margenUsd,
      motivos: motivosFin,
    },
  }
}
