// Canales entre la ventana y el proceso principal. Todo lo que llega de la ventana se valida.
import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { readdir, rm } from 'node:fs/promises'
import type { Ajustes, ConsultaExplorar, EntradaBiblioteca, Ficha, PaginasCapitulo } from '@compartido/tipos'
import * as almacen from './almacen'
import * as descargas from './descargas'
import * as md from './mangadex'
import { carpetaDatos, carpetaPortadas } from './rutas'

// Fichas traídas en esta sesión, para no volver a pedirlas al agregar o descargar.
const recientes = new Map<string, Ficha>()

function idValido(v: unknown): string {
  if (!md.esUuid(v)) throw new Error('Id inválido')
  return v
}

function idsValidos(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > 5000) throw new Error('Lista inválida')
  return v.map(idValido)
}

async function fichaPara(id: string): Promise<Ficha> {
  const f = recientes.get(id) ?? almacen.ficha(id)
  if (f) return f
  const nueva = await md.ficha(id, almacen.ajustes().idiomas)
  recientes.set(id, nueva)
  return nueva
}

/** Cuenta capítulos sin leer agrupando por número (puede haber varias traducciones del mismo). */
function sinLeer(f: Ficha): number {
  const p = almacen.progreso(f.id).capitulos
  const porNumero = new Map<string, boolean>()
  for (const c of f.capitulos) {
    const clave = c.numero ?? c.id
    porNumero.set(clave, (porNumero.get(clave) ?? false) || !!p[c.id]?.leido)
  }
  return [...porNumero.values()].filter((leido) => !leido).length
}

function entrada(f: Ficha): EntradaBiblioteca {
  const p = almacen.progreso(f.id).capitulos
  return {
    ficha: f,
    sinLeer: sinLeer(f),
    descargados: descargas.cantidadDescargada(f.id),
    ultimoLeido: Math.max(0, ...Object.values(p).map((x) => x.fecha))
  }
}

export function registrarIpc(): void {
  md.vigilarRed((v) => BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('red:cambio', v)))
  ipcMain.handle('red', () => md.enLinea())

  ipcMain.handle('explorar', (_e, c: ConsultaExplorar) => md.explorar(c, almacen.ajustes().idiomas))

  ipcMain.handle('ficha', async (_e, id: unknown) => {
    const mangaId = idValido(id)
    try {
      const f = await md.ficha(mangaId, almacen.ajustes().idiomas)
      recientes.set(mangaId, f)
      almacen.refrescarFicha(f)
      return { ficha: f, sinConexion: false, enBiblioteca: almacen.enBiblioteca(mangaId) }
    } catch (e) {
      const guardada = almacen.ficha(mangaId)
      if (guardada && e instanceof md.SinConexion) return { ficha: guardada, sinConexion: true, enBiblioteca: almacen.enBiblioteca(mangaId) }
      throw e
    }
  })

  ipcMain.handle('paginas', async (_e, id: unknown): Promise<PaginasCapitulo> => {
    const capituloId = idValido(id)
    const local = descargas.descargado(capituloId)
    if (local) {
      return {
        origen: 'local',
        urls: local.archivos.map((a) => `lector://local/${local.mangaId}/${capituloId}/${a}`)
      }
    }
    const calidad = almacen.ajustes().calidadLectura
    const s = await md.servidorCapitulo(capituloId)
    return {
      origen: 'internet',
      urls: s[calidad].map((a) => `lector://web/?u=${encodeURIComponent(md.urlImagen(s, calidad, a))}`)
    }
  })

  ipcMain.handle('biblioteca', () =>
    almacen
      .idsBiblioteca()
      .map((id) => almacen.ficha(id))
      .filter((f): f is Ficha => !!f)
      .map(entrada)
  )

  ipcMain.handle('biblioteca:agregar', async (_e, id: unknown) => {
    almacen.agregar(await fichaPara(idValido(id)))
  })

  ipcMain.handle('biblioteca:quitar', (_e, id: unknown) => {
    const mangaId = idValido(id)
    almacen.quitar(mangaId, descargas.tieneDescargas(mangaId))
  })

  ipcMain.handle('biblioteca:actualizar', async () => {
    let nuevos = 0
    let fallidos = 0
    for (const id of almacen.idsBiblioteca()) {
      const antes = new Set(almacen.ficha(id)?.capitulos.map((c) => c.id))
      try {
        const f = await md.ficha(id, almacen.ajustes().idiomas)
        recientes.set(id, f)
        almacen.guardarFicha(f)
        nuevos += f.capitulos.filter((c) => !antes.has(c.id)).length
      } catch (e) {
        if (e instanceof md.SinConexion) throw e
        fallidos++
      }
    }
    return { nuevos, fallidos }
  })

  ipcMain.handle('progreso', (_e, id: unknown) => almacen.progreso(idValido(id)))

  ipcMain.handle('progreso:guardar', (_e, mangaId: unknown, capId: unknown, pagina: unknown, total: unknown) => {
    const n = Math.max(0, Math.floor(Number(pagina) || 0))
    const t = Math.max(0, Math.floor(Number(total) || 0))
    almacen.guardarProgreso(idValido(mangaId), idValido(capId), n, t)
  })

  ipcMain.handle('progreso:marcar', (_e, mangaId: unknown, ids: unknown, leido: unknown) =>
    almacen.marcarLeidos(idValido(mangaId), idsValidos(ids), leido === true)
  )

  ipcMain.handle('ajustes', () => almacen.ajustes())
  ipcMain.handle('ajustes:guardar', (_e, a: Partial<Ajustes>) => almacen.cambiarAjustes(a ?? {}))

  ipcMain.handle('descargas', () => descargas.estado())
  ipcMain.handle('descargas:agregar', async (_e, mangaId: unknown, ids: unknown) => {
    descargas.encolar(await fichaPara(idValido(mangaId)), idsValidos(ids))
  })
  ipcMain.handle('descargas:cancelar', (_e, id: unknown) => descargas.cancelar(idValido(id)))
  ipcMain.handle('descargas:borrar', (_e, id: unknown) => descargas.borrar(idValido(id)))

  ipcMain.handle('abrir:navegador', (_e, url: unknown) => {
    if (typeof url === 'string' && url.startsWith('https://mangadex.org/')) return shell.openExternal(url)
  })
  ipcMain.handle('abrir:datos', () => shell.openPath(carpetaDatos()))

  ipcMain.handle('cache:vaciar', async () => {
    await session.defaultSession.clearCache()
    // Borra portadas de mangas que ya no están guardados.
    const archivos = await readdir(carpetaPortadas()).catch(() => [] as string[])
    for (const a of archivos) {
      if (!almacen.ficha(a.slice(0, 36))) await rm(`${carpetaPortadas()}/${a}`, { force: true })
    }
  })

  app.on('before-quit', () => almacen.guardarYa())
}
