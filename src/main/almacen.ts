// Guarda biblioteca, fichas, progreso y ajustes en un JSON dentro de la carpeta de datos.
import { app } from 'electron'
import { existsSync, renameSync, writeFileSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  AJUSTES_INICIALES,
  type Ajustes,
  type Ficha,
  type Idioma,
  type ProgresoManga
} from '@compartido/tipos'

interface Datos {
  version: 1
  /** Ids en orden: el más reciente primero. */
  biblioteca: string[]
  /** Fichas guardadas de mangas en biblioteca o con capítulos descargados. */
  fichas: Record<string, Ficha>
  progreso: Record<string, ProgresoManga>
  ajustes: Ajustes
  /** Mangas cuyos capítulos nuevos se descargan solos. */
  automaticos: string[]
}

const ruta = () => join(app.getPath('userData'), 'datos.json')

let datos: Datos = vacio()
let temporizador: NodeJS.Timeout | null = null

function vacio(): Datos {
  return { version: 1, biblioteca: [], fichas: {}, progreso: {}, ajustes: { ...AJUSTES_INICIALES }, automaticos: [] }
}

export async function cargar(): Promise<void> {
  const archivo = ruta()
  if (!existsSync(archivo)) return
  try {
    const leido = JSON.parse(await readFile(archivo, 'utf8')) as Partial<Datos>
    datos = {
      ...vacio(),
      ...leido,
      ajustes: limpiarAjustes({ ...AJUSTES_INICIALES, ...leido.ajustes })
    }
  } catch {
    // Archivo dañado: se aparta para no perderlo y se parte de cero.
    renameSync(archivo, `${archivo}.danado-${Date.now()}`)
    datos = vacio()
  }
}

async function escribir(): Promise<void> {
  const tmp = `${ruta()}.tmp`
  await writeFile(tmp, JSON.stringify(datos))
  await rename(tmp, ruta())
}

function guardar(): void {
  if (temporizador) clearTimeout(temporizador)
  temporizador = setTimeout(() => {
    temporizador = null
    escribir().catch((e) => console.error('No se pudo guardar datos.json', e))
  }, 400)
}

/** Escritura inmediata y síncrona, para cuando la app se cierra. */
export function guardarYa(): void {
  if (!temporizador) return
  clearTimeout(temporizador)
  temporizador = null
  writeFileSync(ruta(), JSON.stringify(datos))
}

// --- Ajustes ---

const IDIOMAS: Idioma[] = ['es-la', 'es', 'en']

function limpiarAjustes(a: Ajustes): Ajustes {
  const idiomas = Array.isArray(a.idiomas) ? a.idiomas.filter((i) => IDIOMAS.includes(i)) : []
  return {
    idiomas: idiomas.length ? [...new Set(idiomas)] : AJUSTES_INICIALES.idiomas,
    calidadLectura: a.calidadLectura === 'ahorro' ? 'ahorro' : 'alta',
    calidadDescarga: a.calidadDescarga === 'alta' ? 'alta' : 'ahorro',
    modoLectura: a.modoLectura === 'paginas' ? 'paginas' : 'vertical',
    direccion: a.direccion === 'izq-der' ? 'izq-der' : 'der-izq',
    anchoVertical: Math.min(1600, Math.max(400, Math.round(Number(a.anchoVertical) || 820))),
    carpetaDescargas: typeof a.carpetaDescargas === 'string' && a.carpetaDescargas ? a.carpetaDescargas : null
  }
}

export const ajustes = (): Ajustes => datos.ajustes

/** Cambios pedidos desde la ventana: la carpeta de descargas no se toca por aquí. */
export function cambiarAjustes(parcial: Partial<Ajustes>): Ajustes {
  datos.ajustes = limpiarAjustes({ ...datos.ajustes, ...parcial, carpetaDescargas: datos.ajustes.carpetaDescargas })
  guardar()
  return datos.ajustes
}

/** Solo la llama el proceso principal, después de mover las descargas. */
export function fijarCarpetaDescargas(carpeta: string | null): void {
  datos.ajustes = { ...datos.ajustes, carpetaDescargas: carpeta }
  guardar()
  guardarYa()
}

// --- Descarga automática ---

export const automaticos = (): string[] => [...datos.automaticos]
export const esAutomatico = (id: string): boolean => datos.automaticos.includes(id)

export function marcarAutomatico(id: string, activar: boolean): void {
  datos.automaticos = datos.automaticos.filter((x) => x !== id)
  if (activar) datos.automaticos.push(id)
  guardar()
}

// --- Fichas y biblioteca ---

export const ficha = (id: string): Ficha | null => datos.fichas[id] ?? null
export const enBiblioteca = (id: string): boolean => datos.biblioteca.includes(id)
export const idsBiblioteca = (): string[] => [...datos.biblioteca]

export function guardarFicha(f: Ficha): void {
  datos.fichas[f.id] = f
  guardar()
}

/** Actualiza la ficha solo si ya la estábamos guardando. */
export function refrescarFicha(f: Ficha): void {
  if (datos.fichas[f.id]) guardarFicha(f)
}

export function agregar(f: Ficha): void {
  datos.fichas[f.id] = f
  datos.biblioteca = [f.id, ...datos.biblioteca.filter((id) => id !== f.id)]
  guardar()
}

/** Quita de la biblioteca. La ficha se borra si no quedan descargas que la necesiten. */
export function quitar(id: string, tieneDescargas: boolean): void {
  datos.biblioteca = datos.biblioteca.filter((x) => x !== id)
  if (!tieneDescargas) delete datos.fichas[id]
  guardar()
}

export function soltarFichaSiSobra(id: string, tieneDescargas: boolean): void {
  if (!tieneDescargas && !enBiblioteca(id) && datos.fichas[id]) {
    delete datos.fichas[id]
    guardar()
  }
}

// --- Progreso ---

export function progreso(mangaId: string): ProgresoManga {
  return datos.progreso[mangaId] ?? { capitulos: {}, ultimo: null }
}

export function guardarProgreso(mangaId: string, capituloId: string, pagina: number, total: number): void {
  const p = (datos.progreso[mangaId] ??= { capitulos: {}, ultimo: null })
  const antes = p.capitulos[capituloId]
  const leido = (antes?.leido ?? false) || (total > 0 && pagina >= total - 1)
  p.capitulos[capituloId] = { pagina, total, leido, fecha: Date.now() }
  p.ultimo = capituloId
  guardar()
}

export function marcarLeidos(mangaId: string, ids: string[], leido: boolean): ProgresoManga {
  const p = (datos.progreso[mangaId] ??= { capitulos: {}, ultimo: null })
  for (const id of ids) {
    const antes = p.capitulos[id]
    p.capitulos[id] = { pagina: antes?.pagina ?? 0, total: antes?.total ?? 0, leido, fecha: Date.now() }
  }
  guardar()
  return p
}
