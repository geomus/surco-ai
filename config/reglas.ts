// Every number the product shows comes from these parameters. They are
// deliberately explicit so an agronomist or fyo's risk team can audit and tune them.
export const REGLAS = {
  pulverizar: {
    vientoMinKmh: 3,
    vientoMaxKmh: 15,
    temperaturaMaxC: 28,
    humedadMinPct: 50,
    lluviaMaxMmHora: 0,
    horaInicio: 7,
    horaFin: 19,
    horasMinimasSeguidas: 3,
  },
  cosechar: {
    vientoMaxKmh: 30,
    humedadMaxPct: 75,
    lluviaMaxMmDia: 1,
    horaInicio: 10,
    horaFin: 20,
    horasMinimasSeguidas: 5,
  },
  ndvi: {
    umbralRecorrer: 0.9,
    anomaliaMin: 0.6,
    anomaliaMax: 1.1,
    rangoIncertidumbre: 0.15,
  },
  cobertura: {
    rojo: 0.85,
    amarillo: 0.6,
  },
  precio: {
    alertaSobreContrato: 0.1,
  },
  seguro: {
    lluviaAltaMm14d: 60,
    lluviaMediaMm14d: 30,
  },
  diasPronostico: 7,
} as const

export const PRECIO_PIZARRA_DEFECTO_USD_T = 215
