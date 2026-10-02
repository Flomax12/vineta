import type { Capitulo, CapituloDescargado, MangaResumen, ProgresoManga } from '@compartido/tipos'

export const api = window.vineta

export function urlPortada(m: Pick<MangaResumen, 'id' | 'portada'>): string | null {
  return m.portada ? `lector://portada/${m.id}/${encodeURIComponent(m.portada)}` : null
}

export function esSinConexion(e: unknown): boolean {
  return String((e as Error)?.message ?? e).includes('SIN_CONEXION')
}

export function mensajeError(e: unknown): string {
  if (esSinConexion(e)) return 'No hay conexión a internet.'
  return 'Algo salió mal al hablar con MangaDex. Intenta de nuevo en un rato.'
}

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

export function formatoBytes(b: number): string {
  if (b < 1024 * 1024) return `${numero.format(b / 1024)} KB`
  if (b < 1024 ** 3) return `${numero.format(b / 1024 ** 2)} MB`
  return `${numero.format(b / 1024 ** 3)} GB`
}

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function haceCuanto(fechaIso: string | number): string {
  const seg = (new Date(fechaIso).getTime() - Date.now()) / 1000
  const pasos: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ]
  for (const [unidad, s] of pasos) if (Math.abs(seg) >= s) return relativo.format(Math.round(seg / s), unidad)
  return 'recién'
}

export function etiquetaCapitulo(c: Capitulo): string {
  return c.numero ? `Capítulo ${c.numero}` : 'Oneshot'
}

/** Un capítulo puede venir traducido por varios grupos: cada grupo es una "versión". */
export interface GrupoCapitulo {
  clave: string
  versiones: Capitulo[]
  elegido: Capitulo
}

/**
 * Agrupa por número y elige la versión a mostrar: la descargada, la que ya
 * se estaba leyendo, la del mismo grupo que el último capítulo leído, o la primera.
 */
export function agruparCapitulos(
  capitulos: Capitulo[],
  progreso: ProgresoManga,
  descargados: Record<string, CapituloDescargado>,
  elecciones: Record<string, string> = {}
): GrupoCapitulo[] {
  const mapa = new Map<string, Capitulo[]>()
  for (const c of capitulos) {
    const clave = c.numero ?? `sin-numero-${c.id}`
    mapa.set(clave, [...(mapa.get(clave) ?? []), c])
  }
  const ultimo = progreso.ultimo ? capitulos.find((c) => c.id === progreso.ultimo) : null
  const grupoFavorito = ultimo?.grupos[0]
  const grupos: GrupoCapitulo[] = []
  for (const [clave, versiones] of mapa) {
    const elegido =
      versiones.find((v) => v.id === elecciones[clave]) ??
      versiones.find((v) => descargados[v.id]) ??
      versiones.find((v) => progreso.capitulos[v.id]) ??
      versiones.find((v) => grupoFavorito && v.grupos.includes(grupoFavorito)) ??
      versiones[0]
    grupos.push({ clave, versiones, elegido })
  }
  const valor = (g: GrupoCapitulo) => {
    const n = Number.parseFloat(g.elegido.numero ?? '')
    return Number.isNaN(n) ? -1 : n
  }
  return grupos.sort((a, b) => valor(a) - valor(b))
}

export function clases(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}
