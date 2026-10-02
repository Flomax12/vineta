// Cliente de la API pública de MangaDex (https://api.mangadex.org/docs).
// Respeta sus límites: ~5 llamadas/s a la API y 40/min al servidor de imágenes.
import { net } from 'electron'
import type { Capitulo, ConsultaExplorar, Ficha, Idioma, MangaResumen, ResultadoExplorar } from '@compartido/tipos'
import { traducirEtiqueta } from './etiquetas'

/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de MangaDex */

const API = 'https://api.mangadex.org'
export const AGENTE = 'Vineta/0.1 (lector de manga personal para Windows)'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export class SinConexion extends Error {
  constructor() {
    super('SIN_CONEXION')
  }
}

export function esUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v)
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Reserva turnos separados por 250 ms para no pasar el límite de la API.
let proximoTurno = 0
async function turnoApi(): Promise<void> {
  const ahora = Date.now()
  const espera = Math.max(0, proximoTurno - ahora)
  proximoTurno = ahora + espera + 250
  if (espera) await dormir(espera)
}

// El endpoint at-home permite 40 llamadas por minuto.
const llamadasAtHome: number[] = []
async function turnoAtHome(): Promise<void> {
  for (;;) {
    const hace1min = Date.now() - 60_000
    while (llamadasAtHome.length && llamadasAtHome[0] < hace1min) llamadasAtHome.shift()
    if (llamadasAtHome.length < 38) break
    await dormir(llamadasAtHome[0] - hace1min + 50)
  }
  llamadasAtHome.push(Date.now())
}

// Estado de la conexión según si MangaDex responde (más fiable que el de Windows,
// que dice "conectado" aunque el Wi-Fi no tenga internet).
let hayInternet = true
let avisarRed: ((v: boolean) => void) | null = null
let ping: NodeJS.Timeout | null = null

export const enLinea = () => hayInternet
export function vigilarRed(cb: (v: boolean) => void): void {
  avisarRed = cb
}

function marcarRed(v: boolean): void {
  if (v === hayInternet) return
  hayInternet = v
  avisarRed?.(v)
  if (!v && !ping) {
    // Sin conexión: se prueba cada 15 s hasta que vuelva.
    ping = setInterval(async () => {
      try {
        const r = await net.fetch(`${API}/ping`, { headers: { 'User-Agent': AGENTE } })
        if (!r.ok) return
        clearInterval(ping!)
        ping = null
        marcarRed(true)
      } catch {
        // sigue sin conexión
      }
    }, 15_000)
  }
}

type Parametros = [string, string][]

async function pedirJson(ruta: string, params: Parametros = [], intento = 0): Promise<any> {
  await turnoApi()
  const qs = new URLSearchParams(params).toString()
  let r: Response
  try {
    r = await net.fetch(`${API}${ruta}${qs ? `?${qs}` : ''}`, { headers: { 'User-Agent': AGENTE } })
  } catch {
    marcarRed(false)
    throw new SinConexion()
  }
  marcarRed(true)
  if (r.status === 429 && intento < 2) {
    const hasta = Number(r.headers.get('x-ratelimit-retry-after')) * 1000
    await dormir(Math.min(Math.max(hasta - Date.now(), 1000), 30_000))
    return pedirJson(ruta, params, intento + 1)
  }
  if (!r.ok) throw new Error(`MangaDex respondió ${r.status} en ${ruta}`)
  return r.json()
}

/** Busca el texto en los idiomas elegidos, luego inglés, luego el primero que haya. */
function textoPreferido(principal: Record<string, string> | undefined, alternativos: Record<string, string>[], idiomas: Idioma[]): string | null {
  for (const l of [...idiomas, 'en']) {
    if (principal?.[l]) return principal[l]
    const alt = alternativos.find((a) => a[l])
    if (alt) return alt[l]
  }
  return (principal && Object.values(principal)[0]) || null
}

/** Quita el formato markdown que MangaDex usa en las descripciones. */
function limpiarDescripcion(texto: string): string {
  return texto
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const ESTADOS: Record<string, string> = {
  ongoing: 'En publicación',
  completed: 'Finalizado',
  hiatus: 'En pausa',
  cancelled: 'Cancelado'
}

function aResumen(m: any, idiomas: Idioma[]): MangaResumen {
  const a = m.attributes
  const rel = (tipo: string) => (m.relationships ?? []).filter((r: any) => r.type === tipo)
  const autores: string[] = [...rel('author'), ...rel('artist')]
    .map((r: any) => r.attributes?.name)
    .filter((n: unknown): n is string => typeof n === 'string')
  return {
    id: m.id,
    titulo: textoPreferido(a.title, a.altTitles ?? [], idiomas) ?? 'Sin título',
    portada: rel('cover_art')[0]?.attributes?.fileName ?? null,
    autores: [...new Set(autores)],
    estado: ESTADOS[a.status] ?? null,
    anio: a.year ?? null,
    descripcion: limpiarDescripcion(textoPreferido(a.description, [], idiomas) ?? ''),
    etiquetas: (a.tags ?? []).map((t: any) => traducirEtiqueta(t.attributes?.name?.en ?? '')).filter(Boolean),
    clasificacion: a.contentRating ?? 'safe'
  }
}

const ORDENES: Record<ConsultaExplorar['orden'], [string, string]> = {
  populares: ['order[followedCount]', 'desc'],
  recientes: ['order[latestUploadedChapter]', 'desc'],
  nuevos: ['order[createdAt]', 'desc']
}

export async function explorar(c: ConsultaExplorar, idiomas: Idioma[]): Promise<ResultadoExplorar> {
  const desde = Math.max(0, Math.min(9_976, Math.floor(Number(c.desde) || 0)))
  const p: Parametros = [
    ['limit', '24'],
    ['offset', String(desde)],
    ['includes[]', 'cover_art'],
    ['includes[]', 'author'],
    ['contentRating[]', 'safe'],
    ['contentRating[]', 'suggestive'],
    ['hasAvailableChapters', 'true']
  ]
  for (const l of idiomas) p.push(['availableTranslatedLanguage[]', l])
  const texto = String(c.texto ?? '').trim().slice(0, 120)
  if (texto) p.push(['title', texto], ['order[relevance]', 'desc'])
  else p.push(ORDENES[c.orden] ?? ORDENES.populares)
  const j = await pedirJson('/manga', p)
  return { items: j.data.map((m: any) => aResumen(m, idiomas)), total: j.total }
}

async function capitulosDe(id: string, idiomas: Idioma[]): Promise<Capitulo[]> {
  const capitulos: Capitulo[] = []
  for (let desde = 0; desde < 10_000; desde += 500) {
    const p: Parametros = [
      ['limit', '500'],
      ['offset', String(desde)],
      ['order[volume]', 'asc'],
      ['order[chapter]', 'asc'],
      ['includes[]', 'scanlation_group'],
      ['includeExternalUrl', '0'],
      ['includeEmptyPages', '0'],
      ['includeUnavailable', '0']
    ]
    for (const l of idiomas) p.push(['translatedLanguage[]', l])
    const j = await pedirJson(`/manga/${id}/feed`, p)
    for (const c of j.data) {
      const a = c.attributes
      capitulos.push({
        id: c.id,
        numero: a.chapter ?? null,
        volumen: a.volume ?? null,
        titulo: a.title || null,
        idioma: a.translatedLanguage,
        paginas: a.pages,
        grupos: c.relationships
          .filter((r: any) => r.type === 'scanlation_group' && r.attributes?.name)
          .map((r: any) => r.attributes.name as string),
        publicado: a.publishAt
      })
    }
    if (desde + 500 >= j.total) break
  }
  return capitulos
}

export async function ficha(id: string, idiomas: Idioma[]): Promise<Ficha> {
  const m = await pedirJson(`/manga/${id}`, [
    ['includes[]', 'cover_art'],
    ['includes[]', 'author'],
    ['includes[]', 'artist']
  ])
  const capitulos = await capitulosDe(id, idiomas)
  return { ...aResumen(m.data, idiomas), capitulos, actualizado: Date.now() }
}

export interface ServidorCapitulo {
  base: string
  hash: string
  alta: string[]
  ahorro: string[]
}

export async function servidorCapitulo(capituloId: string): Promise<ServidorCapitulo> {
  await turnoAtHome()
  const j = await pedirJson(`/at-home/server/${capituloId}`)
  return { base: j.baseUrl, hash: j.chapter.hash, alta: j.chapter.data, ahorro: j.chapter.dataSaver }
}

export function urlImagen(s: ServidorCapitulo, calidad: 'alta' | 'ahorro', archivo: string): string {
  return `${s.base}/${calidad === 'alta' ? 'data' : 'data-saver'}/${s.hash}/${archivo}`
}

/** Solo se aceptan imágenes servidas por MangaDex. */
export function esUrlDeImagenPermitida(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && (u.hostname.endsWith('.mangadex.network') || u.hostname === 'uploads.mangadex.org')
  } catch {
    return false
  }
}

// MangaDex pide que los clientes reporten cómo les fue con cada imagen de su red
// MangaDex@Home, para sacar de rotación los servidores que fallan.
function reportar(url: string, exito: boolean, bytes: number, duracion: number, cacheado: boolean): void {
  if (url.includes('mangadex.org')) return
  net
    .fetch('https://api.mangadex.network/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': AGENTE },
      body: JSON.stringify({ url, success: exito, bytes, duration: duracion, cached: cacheado })
    })
    .catch(() => {})
}

export async function bajarImagen(url: string, senal?: AbortSignal): Promise<{ datos: Buffer; tipo: string }> {
  const inicio = Date.now()
  let r: Response
  try {
    r = await net.fetch(url, { headers: { 'User-Agent': AGENTE }, signal: senal })
  } catch (e) {
    if (senal?.aborted) throw e
    reportar(url, false, 0, Date.now() - inicio, false)
    throw new SinConexion()
  }
  if (!r.ok) {
    reportar(url, false, 0, Date.now() - inicio, false)
    throw new Error(`La imagen respondió ${r.status}`)
  }
  const datos = Buffer.from(await r.arrayBuffer())
  reportar(url, true, datos.length, Date.now() - inicio, (r.headers.get('x-cache') ?? '').startsWith('HIT'))
  return { datos, tipo: r.headers.get('content-type') ?? 'image/jpeg' }
}
