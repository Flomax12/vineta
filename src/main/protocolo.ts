// Protocolo interno "lector://" para que la ventana muestre imágenes sin hablar
// directo con internet:
//   lector://portada/<mangaId>/<archivo>  portada (se guarda en disco para verla sin conexión)
//   lector://web/?u=<url>                 página de un capítulo leído en línea
//   lector://local/<mangaId>/<capId>/<n>  página de un capítulo descargado
import { protocol } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { rutaPaginaLocal } from './descargas'
import { bajarImagen, esUrlDeImagenPermitida, esUuid } from './mangadex'
import { carpetaPortadas } from './rutas'

export const ESQUEMA = 'lector'

export function registrarEsquema(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
  ])
}

const TIPOS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

const ARCHIVO_PORTADA = /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/

function imagen(datos: Buffer, tipo: string, cache = 'max-age=31536000, immutable'): Response {
  return new Response(new Uint8Array(datos), { headers: { 'Content-Type': tipo, 'Cache-Control': cache } })
}

const noEncontrado = () => new Response('No encontrado', { status: 404 })

async function portada(mangaId: string, archivo: string): Promise<Response> {
  if (!esUuid(mangaId) || !ARCHIVO_PORTADA.test(archivo)) return noEncontrado()
  const destino = join(carpetaPortadas(), `${mangaId}-${archivo}.512.jpg`)
  if (existsSync(destino)) return imagen(await readFile(destino), 'image/jpeg')
  const { datos } = await bajarImagen(`https://uploads.mangadex.org/covers/${mangaId}/${archivo}.512.jpg`)
  await mkdir(carpetaPortadas(), { recursive: true })
  await writeFile(destino, datos)
  return imagen(datos, 'image/jpeg')
}

export function manejarProtocolo(): void {
  protocol.handle(ESQUEMA, async (peticion) => {
    try {
      const u = new URL(peticion.url)
      const partes = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      if (u.host === 'portada' && partes.length === 2) return await portada(partes[0], partes[1])
      if (u.host === 'local' && partes.length === 3) {
        const ruta = rutaPaginaLocal(partes[0], partes[1], partes[2])
        if (!ruta) return noEncontrado()
        return imagen(await readFile(ruta), TIPOS[extname(ruta)] ?? 'image/jpeg')
      }
      if (u.host === 'web') {
        const destino = u.searchParams.get('u') ?? ''
        if (!esUrlDeImagenPermitida(destino)) return noEncontrado()
        const { datos, tipo } = await bajarImagen(destino)
        return imagen(datos, tipo, 'max-age=3600')
      }
      return noEncontrado()
    } catch {
      return new Response('Error al cargar la imagen', { status: 502 })
    }
  })
}
