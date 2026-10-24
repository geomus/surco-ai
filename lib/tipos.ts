export type Zona = {
  id: string
  nombre: string
  hectareas: number
  ndvi_actual: number
  ndvi_historico: number
}

export type Contrato = {
  toneladas: number
  precio_usd_t: number
  entrega: string
}

export type Legajo = {
  alias: string
  localidad: string
  lat: number
  lon: number
  cultivo: string
  hectareas: number
  etapa: string
  rinde_referencia_t_ha: number
  granizo_reciente: boolean
  nota_evento: string | null
  zonas: Zona[]
  contratos: Contrato[]
}

export type Caso = {
  id: string
  nombre: string
  descripcion: string
  legajo: Legajo
}

export type Nivel = 'verde' | 'amarillo' | 'rojo'

export type Labor = 'pulverizar' | 'cosechar'

export type DiaLabor = {
  fecha: string
  apto: boolean
  horasAptas: number
  motivo: string
  vientoMaxKmh: number
  lluviaMm: number
}

export type FuenteClima = {
  origen: 'en_vivo' | 'cache'
  fecha: string
}

export type Senales = {
  semaforo: Nivel
  motivosSemaforo: string[]
  ventanas: { labor: Labor; dias: DiaLabor[]; fuente: FuenteClima }
  zonas: (Zona & { anomalia: number; recorrer: boolean })[]
  produccion: {
    anomaliaPonderada: number
    esperadaT: number
    pesimistaT: number
    optimistaT: number
    vendidoT: number
    cobertura: number
    coberturaPesimista: number
  }
  venta: {
    precioPizarra: number
    precioContratoPromedio: number
    alertaPrecio: boolean
    senal: 'no_vender_mas' | 'fijar_parte' | 'escalonar'
    explicacion: string
  }
  seguro: {
    exposicion: Nivel
    lluviaProximos14dMm: number
    motivos: string[]
  }
  financiacion: {
    nivel: Nivel
    valorProduccionPesimistaUsd: number
    compromisosUsd: number
    margenUsd: number
    motivos: string[]
  }
}
