import { useState } from 'react'
import type { ResultadoCarpeta } from '@compartido/tipos'
import { useGlobal } from '../contexto'
import { IcoCarpeta } from './Iconos'
import { api, clases } from '../util'

/** Muestra dónde se guardan los mangas y permite cambiarlo (mueve lo ya descargado). */
export function SelectorCarpeta() {
  const { descargas } = useGlobal()
  const [moviendo, setMoviendo] = useState(false)
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null)

  async function ejecutar(accion: () => Promise<ResultadoCarpeta>) {
    setMoviendo(true)
    setMensaje(null)
    try {
      const r = await accion()
      if (r.ok) {
        setMensaje({
          texto: r.movidos ? `Listo: se ${r.movidos === 1 ? 'movió 1 capítulo' : `movieron ${r.movidos} capítulos`} a la carpeta nueva.` : 'Listo: los mangas se guardarán ahí.'
        })
      } else if (r.error) setMensaje({ texto: r.error, error: true })
    } finally {
      setMoviendo(false)
    }
  }

  return (
    <div className="selector-carpeta">
      <div className={clases('ruta-carpeta', !descargas.carpetaDisponible && 'no-disponible')} title={descargas.carpeta}>
        <IcoCarpeta tam={16} />
        {/* bdi: mantiene el orden de las barras aunque el contenedor use dirección rtl para recortar por la izquierda. */}
        <span>
          <bdi>{descargas.carpeta || '…'}</bdi>
        </span>
      </div>
      <div className="fila-botones izq">
        <button className="boton secundario" disabled={moviendo} onClick={() => ejecutar(api.elegirCarpetaDescargas)}>
          {moviendo ? 'Moviendo descargas…' : 'Cambiar carpeta'}
        </button>
        {descargas.carpetaPersonalizada && (
          <button className="boton-texto" disabled={moviendo} onClick={() => ejecutar(api.restablecerCarpetaDescargas)}>
            Volver a la carpeta original
          </button>
        )}
      </div>
      {mensaje && <p className={clases('nota', mensaje.error && 'error')}>{mensaje.texto}</p>}
    </div>
  )
}
