// Descarga automática: revisa cada cierto tiempo los mangas marcados y baja
// los capítulos que falten, avisando con una notificación de Windows.
import { Notification } from 'electron'
import type { Ficha } from '@compartido/tipos'
import { gruposMasUsados, unaVersionPorCapitulo } from '@compartido/capitulos'
import * as almacen from './almacen'
import * as descargas from './descargas'
import * as md from './mangadex'

const CADA = 2 * 60 * 60 * 1000 // 2 horas

/** Encola los capítulos del manga que aún no están descargados (una traducción por número). */
export function encolarFaltantes(f: Ficha): number {
  const bajados = f.capitulos.filter((c) => descargas.descargado(c.id))
  const numerosBajados = new Set(bajados.map((c) => c.numero ?? c.id))
  const faltan = unaVersionPorCapitulo(f.capitulos, gruposMasUsados(bajados)).filter(
    (c) => !numerosBajados.has(c.numero ?? c.id) && !descargas.enCola(c.id)
  )
  if (faltan.length) descargas.encolar(f, faltan.map((c) => c.id))
  return faltan.length
}

let revisando = false

export async function revisar(): Promise<number> {
  if (revisando) return 0
  revisando = true
  const nuevos: { titulo: string; n: number }[] = []
  try {
    for (const id of almacen.automaticos()) {
      let f: Ficha
      try {
        f = await md.ficha(id, almacen.ajustes().idiomas)
      } catch (e) {
        if (e instanceof md.SinConexion) break
        continue
      }
      almacen.guardarFicha(f)
      const n = encolarFaltantes(f)
      if (n) nuevos.push({ titulo: f.titulo, n })
    }
  } finally {
    revisando = false
  }
  const total = nuevos.reduce((s, x) => s + x.n, 0)
  if (total && Notification.isSupported()) {
    const cuerpo =
      nuevos.length === 1
        ? `${total} ${total === 1 ? 'capítulo nuevo' : 'capítulos nuevos'} de ${nuevos[0].titulo}`
        : `${total} capítulos nuevos de ${nuevos.length} mangas`
    new Notification({ title: 'Descargando capítulos nuevos', body: cuerpo }).show()
  }
  return total
}

export function iniciar(): void {
  const tic = () => void revisar().catch(() => {})
  setTimeout(tic, 15_000)
  setInterval(tic, CADA)
}
