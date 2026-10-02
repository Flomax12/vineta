import { useEffect, useMemo, useState } from 'react'
import type { Capitulo, ProgresoManga, ResultadoFicha } from '@compartido/tipos'
import { useGlobal, useNav } from '../contexto'
import { FilaCapitulo } from '../componentes/FilaCapitulo'
import { IcoAtras, IcoDescarga, IcoExterno, IcoLibro, IcoMarcador, IcoMarcadorOk, IcoOrden, IcoSinRed } from '../componentes/Iconos'
import { Portada } from '../componentes/Portada'
import { agruparCapitulos, api, clases, etiquetaCapitulo, formatoBytes, mensajeError, urlPortada } from '../util'

// Peso promedio por página, para estimar cuánto ocupará una descarga.
const MB_POR_PAGINA = { alta: 0.35, ahorro: 0.09 }

export default function Ficha({ id }: { id: string }) {
  const { ruta, ir, volver } = useNav()
  const { enLinea, descargas, ajustes } = useGlobal()
  const [res, setRes] = useState<ResultadoFicha | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [progreso, setProgreso] = useState<ProgresoManga>({ capitulos: {}, ultimo: null })
  const [descendente, setDescendente] = useState(true)
  const [elecciones, setElecciones] = useState<Record<string, string>>({})
  const [verMas, setVerMas] = useState(false)
  const [confirmar, setConfirmar] = useState<{ ids: string[]; paginas: number; texto: string } | null>(null)

  async function cargar() {
    setError(null)
    try {
      const [r, p] = await Promise.all([api.ficha(id), api.progreso(id)])
      setRes(r)
      setProgreso(p)
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Al volver del lector, refresca qué se leyó.
  useEffect(() => {
    if (ruta.vista === 'ficha' && ruta.id === id) void api.progreso(id).then(setProgreso)
  }, [ruta, id])

  const f = res?.ficha ?? null
  const sinRed = !enLinea || !!res?.sinConexion
  const grupos = useMemo(
    () => (f ? agruparCapitulos(f.capitulos, progreso, descargas.descargados, elecciones) : []),
    [f, progreso, descargas.descargados, elecciones]
  )
  const lista = useMemo(() => grupos.map((g) => g.elegido), [grupos])

  const continuar = useMemo((): { cap: Capitulo; texto: string } | null => {
    if (!lista.length) return null
    // Sin internet, se sugiere el primer capítulo descargado que falte leer.
    if (sinRed) {
      const bajados = lista.filter((c) => descargas.descargados[c.id])
      const cap = bajados.find((c) => !progreso.capitulos[c.id]?.leido) ?? bajados[0]
      return cap ? { cap, texto: `Leer · ${etiquetaCapitulo(cap)}` } : null
    }
    const i = grupos.findIndex((g) => g.versiones.some((v) => v.id === progreso.ultimo))
    if (i < 0) return { cap: lista[0], texto: 'Empezar a leer' }
    const ultimoLeido = progreso.capitulos[progreso.ultimo!]?.leido
    const cap = ultimoLeido && i + 1 < lista.length ? lista[i + 1] : grupos[i].elegido
    return { cap, texto: `${ultimoLeido && i + 1 >= lista.length ? 'Releer' : 'Continuar'} · ${etiquetaCapitulo(cap)}` }
  }, [grupos, lista, progreso, sinRed, descargas.descargados])

  if (error && !res) {
    return (
      <section className="vista">
        <button className="boton-volver" onClick={volver}>
          <IcoAtras tam={18} /> Volver
        </button>
        <div className="vacio">
          <IcoSinRed tam={40} />
          <h2>No se pudo abrir</h2>
          <p>{mensajeError(error)}</p>
          <button className="boton" onClick={cargar}>
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  if (!f) {
    return (
      <section className="vista">
        <div className="ficha-cabecera cargando">
          <div className="portada" />
          <div className="ficha-datos">
            <span className="linea larga" />
            <span className="linea" />
            <span className="linea corta" />
          </div>
        </div>
      </section>
    )
  }

  const abrir = (cap: Capitulo) =>
    ir({ vista: 'lector', mangaId: f.id, tituloManga: f.titulo, capituloId: cap.id, lista })

  const pendientes = lista.filter((c) => !descargas.descargados[c.id] && !descargas.cola.some((d) => d.capituloId === c.id))
  const noLeidos = pendientes.filter((c) => !progreso.capitulos[c.id]?.leido)

  const pedirConfirmacion = (caps: Capitulo[], texto: string) =>
    setConfirmar({ ids: caps.map((c) => c.id), paginas: caps.reduce((s, c) => s + c.paginas, 0), texto })

  const calidad = ajustes?.calidadDescarga ?? 'ahorro'
  const estimado = confirmar ? confirmar.paginas * MB_POR_PAGINA[calidad] * 1024 * 1024 : 0
  const libre = descargas.libreEnDisco
  const fondo = urlPortada(f)

  async function alternarBiblioteca() {
    if (!res) return
    if (res.enBiblioteca) await api.quitarDeBiblioteca(id)
    else await api.agregarABiblioteca(id)
    setRes({ ...res, enBiblioteca: !res.enBiblioteca })
  }

  async function marcar(ids: string[], leido: boolean) {
    setProgreso(await api.marcarLeidos(id, ids, leido))
  }

  const ordenados = descendente ? [...grupos].reverse() : grupos

  return (
    <section className="vista ficha">
      {fondo && <div className="ficha-fondo" style={{ backgroundImage: `url("${fondo}")` }} aria-hidden="true" />}
      <button className="boton-volver" onClick={volver}>
        <IcoAtras tam={18} /> Volver
      </button>

      {res?.sinConexion && (
        <div className="aviso">
          <IcoSinRed tam={18} /> Sin conexión: ves la copia guardada. Solo puedes leer los capítulos descargados.
        </div>
      )}

      <div className="ficha-cabecera">
        <Portada manga={f} />
        <div className="ficha-datos">
          <h1 className="ficha-titulo">{f.titulo}</h1>
          <p className="ficha-autores">{f.autores.join(' · ') || 'Autor desconocido'}</p>
          <p className="ficha-meta">
            {[f.estado, f.anio, `${grupos.length} capítulos`].filter(Boolean).join(' · ')}
          </p>
          {f.etiquetas.length > 0 && (
            <ul className="etiquetas">
              {f.etiquetas.slice(0, 10).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <div className="ficha-acciones">
            {continuar && (
              <button
                className="boton"
                onClick={() => abrir(continuar.cap)}
                disabled={sinRed && !descargas.descargados[continuar.cap.id]}
              >
                <IcoLibro tam={18} /> {continuar.texto}
              </button>
            )}
            <button className={clases('boton secundario', res?.enBiblioteca && 'marcado')} onClick={alternarBiblioteca}>
              {res?.enBiblioteca ? <IcoMarcadorOk tam={18} /> : <IcoMarcador tam={18} />}
              {res?.enBiblioteca ? 'En tu biblioteca' : 'Agregar a biblioteca'}
            </button>
            {!sinRed && pendientes.length > 0 && (
              <button className="boton secundario" onClick={() => pedirConfirmacion(noLeidos.length ? noLeidos : pendientes, noLeidos.length ? 'los capítulos sin leer' : 'todos los capítulos')}>
                <IcoDescarga tam={18} /> Descargar {noLeidos.length ? 'no leídos' : 'todo'}
              </button>
            )}
            {!sinRed && (
              <button
                className="boton-icono"
                onClick={() => api.abrirEnNavegador(`https://mangadex.org/title/${f.id}`)}
                title="Ver en MangaDex"
                aria-label="Ver en MangaDex"
              >
                <IcoExterno tam={18} />
              </button>
            )}
          </div>
          {confirmar && (
            <div className="confirmacion" role="dialog" aria-label="Confirmar descarga">
              <p>
                Descargar {confirmar.texto}: <strong>{confirmar.ids.length}</strong> capítulos, unos{' '}
                <strong>{formatoBytes(estimado)}</strong> en calidad {calidad === 'alta' ? 'alta' : 'de ahorro'}.
                {libre !== null && estimado > libre * 0.8 && (
                  <span className="peligro-texto"> Ojo: solo quedan {formatoBytes(libre)} libres en el disco.</span>
                )}
              </p>
              <div className="fila-botones">
                <button
                  className="boton"
                  onClick={() => {
                    void api.descargar(id, confirmar.ids)
                    setConfirmar(null)
                  }}
                >
                  Descargar
                </button>
                <button className="boton secundario" onClick={() => setConfirmar(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {f.descripcion && (
        <div className={clases('descripcion', verMas && 'abierta')}>
          <p>{f.descripcion}</p>
          {f.descripcion.length > 320 && (
            <button className="enlace-texto" onClick={() => setVerMas(!verMas)}>
              {verMas ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>
      )}

      <div className="capitulos-cabecera">
        <h2>Capítulos</h2>
        <button className="boton-texto" onClick={() => setDescendente(!descendente)}>
          <IcoOrden tam={16} /> {descendente ? 'Más nuevos primero' : 'Más antiguos primero'}
        </button>
      </div>

      {grupos.length === 0 ? (
        <p className="nota">No hay capítulos en tus idiomas. Puedes sumar otro idioma en Ajustes.</p>
      ) : (
        <ul className="lista-capitulos">
          {ordenados.map((g) => {
            const c = g.elegido
            return (
              <FilaCapitulo
                key={g.clave}
                grupo={g}
                progreso={progreso.capitulos[c.id]}
                descargado={descargas.descargados[c.id]}
                enCola={descargas.cola.find((d) => d.capituloId === c.id)}
                sinRed={sinRed}
                onAbrir={() => abrir(c)}
                onDescargar={() => api.descargar(id, [c.id])}
                onCancelar={() => api.cancelarDescarga(c.id)}
                onBorrar={() => api.borrarDescarga(c.id)}
                onMarcar={(leido) => marcar(g.versiones.map((v) => v.id), leido)}
                onVersion={(v) => setElecciones({ ...elecciones, [g.clave]: v })}
              />
            )
          })}
        </ul>
      )}
      <p className="credito">Datos e imágenes de MangaDex. Las traducciones son de los grupos que aparecen en cada capítulo.</p>
    </section>
  )
}
