import { useCallback, useEffect, useRef, useState } from 'react'
import type { Capitulo, PaginasCapitulo } from '@compartido/tipos'
import { useGlobal, useNav } from '../contexto'
import { IcoAtras, IcoDireccion, IcoIzq, IcoDer, IcoPaginas, IcoPantalla, IcoVertical, IcoSinRed } from '../componentes/Iconos'
import { api, clases, esSinConexion, etiquetaCapitulo, mensajeError } from '../util'

interface Props {
  mangaId: string
  tituloManga: string
  capituloId: string
  lista: Capitulo[]
}

export default function Lector({ mangaId, tituloManga, capituloId, lista }: Props) {
  const { volver, reemplazar } = useNav()
  const { ajustes, cambiarAjustes, enLinea, descargas } = useGlobal()
  const modo = ajustes?.modoLectura ?? 'vertical'
  const direccion = ajustes?.direccion ?? 'der-izq'
  const ancho = ajustes?.anchoVertical ?? 820

  const indice = lista.findIndex((c) => c.id === capituloId)
  const cap = lista[indice] ?? null
  const anterior = indice > 0 ? lista[indice - 1] : null
  const siguiente = indice >= 0 && indice < lista.length - 1 ? lista[indice + 1] : null

  const [paginas, setPaginas] = useState<PaginasCapitulo | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [pagina, setPagina] = useState(0)
  const [inicio, setInicio] = useState<number | null>(null)
  const [interfaz, setInterfaz] = useState(true)
  const [fallos, setFallos] = useState<Record<number, number>>({})
  const [cargadas, setCargadas] = useState<Record<number, true>>({})
  const contenedor = useRef<HTMLDivElement>(null)
  const ultimoScroll = useRef(0)
  const total = paginas?.urls.length ?? 0

  useEffect(() => {
    let vivo = true
    Promise.all([api.paginas(capituloId), api.progreso(mangaId)])
      .then(([p, prog]) => {
        if (!vivo) return
        const previo = prog.capitulos[capituloId]
        const desde = previo && !previo.leido ? Math.min(previo.pagina, p.urls.length - 1) : 0
        setPaginas(p)
        setPagina(desde)
        setInicio(desde)
      })
      .catch((e) => vivo && setError(e))
    return () => {
      vivo = false
    }
  }, [capituloId, mangaId])

  // Guarda el progreso un momento después de cada cambio de página.
  useEffect(() => {
    if (!total || inicio === null) return
    const t = setTimeout(() => void api.guardarProgreso(mangaId, capituloId, Math.min(pagina, total - 1), total), 500)
    return () => clearTimeout(t)
  }, [pagina, total, inicio, mangaId, capituloId])

  const disponible = (c: Capitulo | null) => !!c && (enLinea || !!descargas.descargados[c.id])
  const irA = useCallback(
    (c: Capitulo | null) => {
      if (c) reemplazar({ vista: 'lector', mangaId, tituloManga, capituloId: c.id, lista })
    },
    [reemplazar, mangaId, tituloManga, lista]
  )

  const avanzar = useCallback(() => setPagina((p) => Math.min(p + 1, total)), [total])
  const retroceder = useCallback(() => setPagina((p) => Math.max(p - 1, 0)), [])

  const pantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen()
  }

  // Teclado: flechas, espacio, F para pantalla completa, Esc para salir.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'SELECT') return
      if (e.key === 'Escape') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else volver()
      } else if (e.key === 'f' || e.key === 'F') pantallaCompleta()
      else if (modo === 'paginas') {
        const adelanteEsIzq = direccion === 'der-izq'
        if (e.key === 'ArrowLeft') (adelanteEsIzq ? avanzar : retroceder)()
        else if (e.key === 'ArrowRight') (adelanteEsIzq ? retroceder : avanzar)()
        else if (e.key === ' ' || e.key === 'PageDown' || e.key === 'ArrowDown') avanzar()
        else if (e.key === 'PageUp' || e.key === 'ArrowUp') retroceder()
        else return
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [modo, direccion, avanzar, retroceder, volver])

  // Modo vertical: la página actual es la que cruza el centro de la pantalla.
  useEffect(() => {
    const raiz = contenedor.current
    if (modo !== 'vertical' || !raiz || !total) return
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const en of entradas) if (en.isIntersecting) setPagina(Number((en.target as HTMLElement).dataset.n))
      },
      { root: raiz, rootMargin: '-48% 0px -48% 0px' }
    )
    raiz.querySelectorAll('[data-n]').forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [modo, total])

  // Al abrir, salta a la página donde se había quedado.
  useEffect(() => {
    if (modo !== 'vertical' || inicio === null || !contenedor.current) return
    if (inicio > 0) contenedor.current.querySelector(`[data-n="${inicio}"]`)?.scrollIntoView()
    else contenedor.current.scrollTop = 0
    // Que el salto automático no cuente como scroll del usuario (escondería las barras).
    ultimoScroll.current = contenedor.current.scrollTop
  }, [modo, inicio])

  // En vertical, las barras se esconden al bajar y aparecen al subir.
  const alHacerScroll = () => {
    const y = contenedor.current?.scrollTop ?? 0
    if (y > ultimoScroll.current + 12 && y > 120) setInterfaz(false)
    else if (y < ultimoScroll.current - 12) setInterfaz(true)
    ultimoScroll.current = y
  }

  const src = (i: number) => {
    const url = paginas!.urls[i]
    return fallos[i] ? `${url}${url.includes('?') ? '&' : '?'}r=${fallos[i]}` : url
  }

  const [errores, setErrores] = useState<Record<number, true>>({})
  const reintentar = (i: number) => {
    setErrores(({ [i]: _, ...resto }) => resto)
    setFallos((f) => ({ ...f, [i]: (f[i] ?? 0) + 1 }))
  }

  // Función (no componente) para que React no vuelva a montar las imágenes en cada render.
  const imagen = (i: number, loading: 'lazy' | 'eager') =>
    errores[i] ? (
      <div key={i} className="pagina-error">
        <p>No se pudo cargar la página {i + 1}.</p>
        <button className="boton secundario" onClick={() => reintentar(i)}>
          Reintentar
        </button>
      </div>
    ) : (
      <img
        key={i}
        src={src(i)}
        alt={`Página ${i + 1}`}
        decoding="async"
        draggable={false}
        className={clases(!cargadas[i] && 'sin-cargar')}
        onLoad={() => setCargadas((c) => ({ ...c, [i]: true }))}
        onError={() => setErrores((e) => ({ ...e, [i]: true }))}
        loading={loading}
      />
    )

  const fin = (
    <div className="fin-capitulo">
      <p className="fin-pequeno">Terminaste</p>
      <p className="fin-titulo">{cap ? etiquetaCapitulo(cap) : ''}</p>
      {siguiente ? (
        disponible(siguiente) ? (
          <button className="boton grande" onClick={() => irA(siguiente)}>
            Siguiente: {etiquetaCapitulo(siguiente)} <IcoDer tam={18} />
          </button>
        ) : (
          <p className="nota">El {etiquetaCapitulo(siguiente).toLowerCase()} no está descargado y no hay conexión.</p>
        )
      ) : (
        <p className="nota">Es el último capítulo disponible por ahora.</p>
      )}
      <button className="boton secundario" onClick={volver}>
        Volver a la ficha
      </button>
    </div>
  )

  let cuerpo
  if (error) {
    cuerpo = (
      <div className="vacio lector-vacio">
        {esSinConexion(error) && <IcoSinRed tam={40} />}
        <h2>No se puede abrir este capítulo</h2>
        <p>{esSinConexion(error) ? 'No está descargado y no hay conexión a internet.' : mensajeError(error)}</p>
        <button className="boton" onClick={volver}>
          Volver
        </button>
      </div>
    )
  } else if (!paginas) {
    cuerpo = <div className="cargador" aria-label="Cargando capítulo" />
  } else if (modo === 'vertical') {
    cuerpo = (
      <div className="lector-vertical" ref={contenedor} onScroll={alHacerScroll} onClick={() => setInterfaz((v) => !v)}>
        <div className="tira" style={{ maxWidth: ancho }}>
          {paginas.urls.map((_, i) => (
            <div key={i} data-n={i} className="pagina-vertical">
              {imagen(i, Math.abs(i - (inicio ?? 0)) < 3 ? 'eager' : 'lazy')}
            </div>
          ))}
        </div>
        <div onClick={(e) => e.stopPropagation()}>{fin}</div>
      </div>
    )
  } else {
    const izq = direccion === 'der-izq' ? avanzar : retroceder
    const der = direccion === 'der-izq' ? retroceder : avanzar
    cuerpo = (
      <div className="lector-paginas">
        {pagina >= total ? (
          fin
        ) : (
          <>
            {imagen(pagina, 'eager')}
            <div className="zonas">
              <button className="zona" onClick={izq} aria-label={direccion === 'der-izq' ? 'Página siguiente' : 'Página anterior'} />
              <button className="zona centro" onClick={() => setInterfaz((v) => !v)} aria-label="Mostrar u ocultar controles" />
              <button className="zona" onClick={der} aria-label={direccion === 'der-izq' ? 'Página anterior' : 'Página siguiente'} />
            </div>
            <div className="precarga" aria-hidden="true">
              {[1, 2, 3].map((d) => pagina + d < total && <img key={pagina + d} src={src(pagina + d)} alt="" />)}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={clases('lector', !interfaz && 'sin-interfaz')}>
      <header className="lector-barra">
        <button className="boton-icono" onClick={volver} aria-label="Salir del lector" title="Salir (Esc)">
          <IcoAtras />
        </button>
        <div className="lector-titulos">
          <span className="lector-manga">{tituloManga}</span>
          <select
            className="lector-capitulo"
            value={capituloId}
            onChange={(e) => irA(lista.find((c) => c.id === e.target.value) ?? null)}
            aria-label="Elegir capítulo"
          >
            {lista.map((c) => (
              <option key={c.id} value={c.id} disabled={!disponible(c)}>
                {etiquetaCapitulo(c)}
                {c.titulo ? ` · ${c.titulo}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="lector-herramientas">
          <button className="boton-icono" onClick={() => irA(anterior)} disabled={!disponible(anterior)} title="Capítulo anterior" aria-label="Capítulo anterior">
            <IcoIzq />
          </button>
          <span className="contador-paginas">{total ? `${Math.min(pagina, total - 1) + 1} / ${total}` : '–'}</span>
          <button className="boton-icono" onClick={() => irA(siguiente)} disabled={!disponible(siguiente)} title="Capítulo siguiente" aria-label="Capítulo siguiente">
            <IcoDer />
          </button>
          <span className="separador" />
          {modo === 'vertical' ? (
            <>
              <button className="boton-icono" onClick={() => cambiarAjustes({ anchoVertical: ancho - 80 })} title="Más angosto" aria-label="Más angosto">−</button>
              <button className="boton-icono" onClick={() => cambiarAjustes({ anchoVertical: ancho + 80 })} title="Más ancho" aria-label="Más ancho">+</button>
            </>
          ) : (
            <button
              className="boton-icono"
              onClick={() => cambiarAjustes({ direccion: direccion === 'der-izq' ? 'izq-der' : 'der-izq' })}
              title={direccion === 'der-izq' ? 'Lectura japonesa (derecha a izquierda)' : 'Lectura occidental (izquierda a derecha)'}
              aria-label="Cambiar dirección de lectura"
            >
              <IcoDireccion />
            </button>
          )}
          <button
            className="boton-icono"
            onClick={() => cambiarAjustes({ modoLectura: modo === 'vertical' ? 'paginas' : 'vertical' })}
            title={modo === 'vertical' ? 'Cambiar a páginas' : 'Cambiar a vertical'}
            aria-label="Cambiar modo de lectura"
          >
            {modo === 'vertical' ? <IcoPaginas /> : <IcoVertical />}
          </button>
          <button className="boton-icono" onClick={pantallaCompleta} title="Pantalla completa (F)" aria-label="Pantalla completa">
            <IcoPantalla />
          </button>
        </div>
      </header>
      {total > 0 && (
        <div className="lector-progreso" aria-hidden="true">
          <span style={{ width: `${(Math.min(pagina + 1, total) / total) * 100}%` }} />
        </div>
      )}
      {cuerpo}
      {modo === 'paginas' && total > 0 && pagina < total && (
        <footer className="lector-pie">
          <input
            type="range"
            min={0}
            max={total - 1}
            value={pagina}
            onChange={(e) => setPagina(Number(e.target.value))}
            aria-label="Ir a la página"
            style={{ direction: direccion === 'der-izq' ? 'rtl' : 'ltr' }}
          />
        </footer>
      )}
    </div>
  )
}
