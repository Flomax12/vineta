import { useEffect, useState } from 'react'
import type { EntradaBiblioteca } from '@compartido/tipos'
import { useGlobal, useNav } from '../contexto'
import { IcoBiblioteca, IcoDescarga, IcoRefrescar } from '../componentes/Iconos'
import { TarjetaManga } from '../componentes/TarjetaManga'
import { api, clases, esSinConexion } from '../util'

type Orden = 'leidos' | 'agregados' | 'pendientes'

export default function Biblioteca() {
  const { enLinea, descargas } = useGlobal()
  const { seccion } = useNav()
  const [entradas, setEntradas] = useState<EntradaBiblioteca[] | null>(null)
  const [orden, setOrden] = useState<Orden>('leidos')
  const [actualizando, setActualizando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const cargar = () => api.biblioteca().then(setEntradas)

  useEffect(() => {
    void cargar()
  }, [descargas.descargados])

  async function actualizar() {
    setActualizando(true)
    setMensaje(null)
    try {
      const r = await api.actualizarBiblioteca()
      setMensaje(
        r.nuevos === 0
          ? 'No hay capítulos nuevos.'
          : `${r.nuevos} ${r.nuevos === 1 ? 'capítulo nuevo' : 'capítulos nuevos'}.`
      )
      await cargar()
    } catch (e) {
      setMensaje(esSinConexion(e) ? 'Sin conexión: no se pudo buscar.' : 'No se pudo actualizar.')
    } finally {
      setActualizando(false)
    }
  }

  const ordenadas = [...(entradas ?? [])].sort((a, b) => {
    if (orden === 'leidos') return b.ultimoLeido - a.ultimoLeido
    if (orden === 'pendientes') return b.sinLeer - a.sinLeer
    return 0 // "agregados": ya viene del más reciente al más antiguo
  })

  return (
    <section className="vista">
      <header className="cabecera-vista">
        <h1 className="titulo-vista">Biblioteca</h1>
        <div className="cabecera-acciones">
          <select className="selector" value={orden} onChange={(e) => setOrden(e.target.value as Orden)} aria-label="Ordenar">
            <option value="leidos">Leídos recientemente</option>
            <option value="agregados">Agregados recientemente</option>
            <option value="pendientes">Más capítulos pendientes</option>
          </select>
          <button className="boton secundario" onClick={actualizar} disabled={!enLinea || actualizando || !entradas?.length}>
            <IcoRefrescar tam={16} className={clases(actualizando && 'girando')} />
            {actualizando ? 'Buscando…' : 'Buscar capítulos nuevos'}
          </button>
        </div>
      </header>
      {mensaje && <p className="nota">{mensaje}</p>}

      {entradas && entradas.length === 0 ? (
        <div className="vacio">
          <IcoBiblioteca tam={40} />
          <h2>Tu biblioteca está vacía</h2>
          <p>Agrega mangas desde su ficha para seguirlos y saber cuándo salen capítulos nuevos.</p>
          {enLinea && (
            <button className="boton" onClick={() => seccion({ vista: 'explorar' })}>
              Explorar mangas
            </button>
          )}
        </div>
      ) : (
        <div className="grilla">
          {ordenadas.map((e) => (
            <TarjetaManga
              key={e.ficha.id}
              manga={e.ficha}
              insignia={
                <span className="insignias">
                  {e.sinLeer > 0 && <span className="insignia">{e.sinLeer}</span>}
                  {e.descargados > 0 && (
                    <span className="insignia oscura" title={`${e.descargados} capítulos descargados`}>
                      <IcoDescarga tam={12} /> {e.descargados}
                    </span>
                  )}
                </span>
              }
              pie={e.sinLeer > 0 ? `${e.sinLeer} sin leer` : 'Al día'}
            />
          ))}
        </div>
      )}
    </section>
  )
}
