import { useEffect, useRef, useState } from 'react'
import type { MangaResumen, OrdenExplorar } from '@compartido/tipos'
import { useGlobal, useNav } from '../contexto'
import { IcoBuscar, IcoCerrar, IcoSinRed } from '../componentes/Iconos'
import { TarjetaFantasma, TarjetaManga } from '../componentes/TarjetaManga'
import { api, clases, esSinConexion, mensajeError } from '../util'

const ORDENES: { valor: OrdenExplorar; nombre: string }[] = [
  { valor: 'populares', nombre: 'Populares' },
  { valor: 'recientes', nombre: 'Actualizados' },
  { valor: 'nuevos', nombre: 'Nuevos' }
]

export default function Explorar() {
  const { enLinea, ajustes } = useGlobal()
  const { seccion } = useNav()
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<OrdenExplorar>('populares')
  const [items, setItems] = useState<MangaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const pedido = useRef(0)

  // Espera a que el usuario deje de escribir antes de buscar.
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto.trim()), 350)
    return () => clearTimeout(t)
  }, [texto])

  async function cargar(desde: number) {
    const n = ++pedido.current
    setCargando(true)
    setError(null)
    try {
      const r = await api.explorar({ texto: busqueda, orden, desde })
      if (n !== pedido.current) return
      setItems((prev) => {
        if (desde === 0) return r.items
        const vistos = new Set(prev.map((m) => m.id))
        return [...prev, ...r.items.filter((m) => !vistos.has(m.id))]
      })
      setTotal(r.total)
    } catch (e) {
      if (n === pedido.current) setError(e)
    } finally {
      if (n === pedido.current) setCargando(false)
    }
  }

  useEffect(() => {
    if (ajustes) void cargar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, orden, ajustes?.idiomas.join()])

  // Si vuelve internet y la carga había fallado, se reintenta sola.
  useEffect(() => {
    if (enLinea && error && esSinConexion(error)) void cargar(items.length ? items.length : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLinea])

  const sinRed = !enLinea || esSinConexion(error)

  return (
    <section className="vista">
      <header className="cabecera-explorar">
        <h1 className="titulo-vista">Explorar</h1>
        <div className="buscador">
          <IcoBuscar />
          <input
            type="search"
            placeholder="Buscar manga, manhwa o webtoon…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Buscar"
          />
          {texto && (
            <button className="boton-icono" onClick={() => setTexto('')} aria-label="Borrar búsqueda">
              <IcoCerrar tam={16} />
            </button>
          )}
        </div>
        {!busqueda && (
          <div className="pestanas" role="tablist">
            {ORDENES.map((o) => (
              <button
                key={o.valor}
                role="tab"
                aria-selected={orden === o.valor}
                className={clases('pestana', orden === o.valor && 'activa')}
                onClick={() => setOrden(o.valor)}
              >
                {o.nombre}
              </button>
            ))}
          </div>
        )}
      </header>

      {sinRed && items.length === 0 ? (
        <div className="vacio">
          <IcoSinRed tam={40} />
          <h2>Sin conexión</h2>
          <p>Para explorar necesitas internet. Lo que descargaste sigue disponible.</p>
          <div className="fila-botones">
            <button className="boton" onClick={() => seccion({ vista: 'biblioteca' })}>
              Ir a la biblioteca
            </button>
            <button className="boton secundario" onClick={() => seccion({ vista: 'descargas' })}>
              Ver descargas
            </button>
          </div>
        </div>
      ) : error && items.length === 0 ? (
        <div className="vacio">
          <h2>No se pudo cargar</h2>
          <p>{mensajeError(error)}</p>
          <button className="boton" onClick={() => cargar(0)}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {busqueda && !cargando && (
            <p className="nota">
              {total === 0 ? `Nada para “${busqueda}” en tus idiomas.` : `${total.toLocaleString('es-CL')} resultados`}
            </p>
          )}
          <div className="grilla">
            {items.map((m) => (
              <TarjetaManga key={m.id} manga={m} />
            ))}
            {cargando && Array.from({ length: items.length ? 6 : 18 }, (_, i) => <TarjetaFantasma key={`f${i}`} />)}
          </div>
          {!cargando && items.length > 0 && items.length < Math.min(total, 10_000) && (
            <div className="mas">
              <button className="boton secundario" onClick={() => cargar(items.length)}>
                Cargar más
              </button>
            </div>
          )}
          {error && items.length > 0 && <p className="nota error">{mensajeError(error)}</p>}
        </>
      )}
    </section>
  )
}
