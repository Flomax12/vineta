// Cola de descargas: baja un capítulo a la vez (3 páginas en paralelo) a una
// carpeta ".parcial" y solo la renombra cuando terminó entera.
import { BrowserWindow } from 'electron'
import { mkdir, readdir, readFile, rename, rm, statfs, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { Capitulo, CapituloDescargado, DescargaEnCurso, EstadoDescargas, Ficha } from '@compartido/tipos'
import * as almacen from './almacen'
import { bajarImagen, esUuid, servidorCapitulo, SinConexion, urlImagen } from './mangadex'
import { carpetaDescargas } from './rutas'

const cola: DescargaEnCurso[] = []
const descargados = new Map<string, CapituloDescargado>()
let actual: { capituloId: string; control: AbortController } | null = null

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function etiquetaCapitulo(c: Capitulo): string {
  const base = c.numero ? `Cap. ${c.numero}` : 'Oneshot'
  return c.titulo ? `${base}: ${c.titulo}` : base
}

export const descargado = (capituloId: string) => descargados.get(capituloId) ?? null
export const tieneDescargas = (mangaId: string) => [...descargados.values()].some((d) => d.mangaId === mangaId)
export const cantidadDescargada = (mangaId: string) =>
  [...descargados.values()].filter((d) => d.mangaId === mangaId).length

/** Lee lo que ya está descargado y limpia descargas a medias de una sesión anterior. */
export async function indexar(): Promise<void> {
  const raiz = carpetaDescargas()
  await mkdir(raiz, { recursive: true })
  for (const manga of await readdir(raiz)) {
    if (!esUuid(manga)) continue
    for (const cap of await readdir(join(raiz, manga))) {
      const dir = join(raiz, manga, cap)
      if (cap.endsWith('.parcial')) {
        await rm(dir, { recursive: true, force: true })
        continue
      }
      try {
        const info = JSON.parse(await readFile(join(dir, 'info.json'), 'utf8')) as CapituloDescargado
        if (info.capituloId === cap && info.mangaId === manga) descargados.set(cap, info)
      } catch {
        await rm(dir, { recursive: true, force: true })
      }
    }
  }
}

let libreCache: { valor: number | null; hora: number } = { valor: null, hora: 0 }
async function libreEnDisco(): Promise<number | null> {
  if (Date.now() - libreCache.hora > 5000) {
    try {
      const s = await statfs(carpetaDescargas())
      libreCache = { valor: s.bavail * s.bsize, hora: Date.now() }
    } catch {
      libreCache = { valor: null, hora: Date.now() }
    }
  }
  return libreCache.valor
}

export async function estado(): Promise<EstadoDescargas> {
  let bytesTotales = 0
  for (const d of descargados.values()) bytesTotales += d.bytes
  return {
    cola: cola.map((d) => ({ ...d })),
    descargados: Object.fromEntries(descargados),
    bytesTotales,
    libreEnDisco: await libreEnDisco()
  }
}

let avisoPendiente = false
function avisar(): void {
  if (avisoPendiente) return
  avisoPendiente = true
  setTimeout(async () => {
    avisoPendiente = false
    const e = await estado()
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send('descargas:cambio', e)
  }, 150)
}

export function encolar(ficha: Ficha, ids: string[]): void {
  almacen.guardarFicha(ficha)
  for (const id of ids) {
    if (descargados.has(id)) continue
    const existente = cola.find((d) => d.capituloId === id)
    if (existente) {
      if (existente.estado === 'error') Object.assign(existente, { estado: 'en-cola', hechas: 0, error: undefined })
      continue
    }
    const cap = ficha.capitulos.find((c) => c.id === id)
    if (!cap) continue
    cola.push({
      capituloId: id,
      mangaId: ficha.id,
      tituloManga: ficha.titulo,
      portada: ficha.portada,
      etiqueta: etiquetaCapitulo(cap),
      estado: 'en-cola',
      hechas: 0,
      total: cap.paginas
    })
  }
  avisar()
  void procesar()
}

async function procesar(): Promise<void> {
  if (actual) return
  for (;;) {
    const siguiente = cola.find((d) => d.estado === 'en-cola')
    if (!siguiente) break
    await bajarCapitulo(siguiente)
  }
}

async function bajarCapitulo(d: DescargaEnCurso): Promise<void> {
  const control = new AbortController()
  actual = { capituloId: d.capituloId, control }
  d.estado = 'descargando'
  d.hechas = 0
  avisar()
  const calidad = almacen.ajustes().calidadDescarga
  const dirFinal = join(carpetaDescargas(), d.mangaId, d.capituloId)
  const dirParcial = `${dirFinal}.parcial`
  try {
    await rm(dirParcial, { recursive: true, force: true })
    await mkdir(dirParcial, { recursive: true })
    let servidor = await servidorCapitulo(d.capituloId)
    const lista = servidor[calidad]
    d.total = lista.length
    const archivos: string[] = new Array(lista.length)
    let bytes = 0
    let siguiente = 0

    const trabajador = async () => {
      while (siguiente < lista.length) {
        const n = siguiente++
        const ext = (extname(lista[n]) || '.jpg').toLowerCase()
        const nombre = `${String(n + 1).padStart(3, '0')}${ext}`
        for (let intento = 1; ; intento++) {
          try {
            const { datos } = await bajarImagen(urlImagen(servidor, calidad, lista[n]), control.signal)
            await writeFile(join(dirParcial, nombre), datos)
            bytes += datos.length
            break
          } catch (e) {
            if (control.signal.aborted || intento >= 4) throw e
            await dormir(1000 * intento)
            // Si un servidor falla, MangaDex recomienda pedir otro.
            if (intento === 2) servidor = await servidorCapitulo(d.capituloId)
          }
        }
        archivos[n] = nombre
        d.hechas++
        avisar()
      }
    }
    await Promise.all([trabajador(), trabajador(), trabajador()])

    const info: CapituloDescargado = {
      capituloId: d.capituloId,
      mangaId: d.mangaId,
      tituloManga: d.tituloManga,
      portada: d.portada,
      etiqueta: d.etiqueta,
      archivos,
      bytes,
      fecha: Date.now()
    }
    await writeFile(join(dirParcial, 'info.json'), JSON.stringify(info))
    await rm(dirFinal, { recursive: true, force: true })
    await rename(dirParcial, dirFinal)
    descargados.set(d.capituloId, info)
    cola.splice(cola.indexOf(d), 1)
  } catch (e) {
    await rm(dirParcial, { recursive: true, force: true }).catch(() => {})
    if (control.signal.aborted) {
      const i = cola.indexOf(d)
      if (i >= 0) cola.splice(i, 1)
    } else {
      d.estado = 'error'
      d.error = e instanceof SinConexion ? 'Sin conexión a internet' : 'No se pudo descargar'
    }
  } finally {
    actual = null
    avisar()
  }
}

export function cancelar(capituloId: string): void {
  if (actual?.capituloId === capituloId) {
    actual.control.abort()
    return
  }
  const i = cola.findIndex((d) => d.capituloId === capituloId)
  if (i >= 0) cola.splice(i, 1)
  avisar()
}

export async function borrar(capituloId: string): Promise<void> {
  const info = descargados.get(capituloId)
  if (!info) return
  descargados.delete(capituloId)
  const dirManga = join(carpetaDescargas(), info.mangaId)
  await rm(join(dirManga, capituloId), { recursive: true, force: true })
  if (!tieneDescargas(info.mangaId)) {
    await rm(dirManga, { recursive: true, force: true }).catch(() => {})
    almacen.soltarFichaSiSobra(info.mangaId, false)
  }
  avisar()
}

/** Ruta en disco de una página descargada, validando cada parte para no salir de la carpeta. */
export function rutaPaginaLocal(mangaId: string, capituloId: string, archivo: string): string | null {
  const info = descargados.get(capituloId)
  if (!info || info.mangaId !== mangaId || !info.archivos.includes(archivo)) return null
  return join(carpetaDescargas(), mangaId, capituloId, archivo)
}
