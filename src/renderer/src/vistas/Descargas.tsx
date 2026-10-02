import { useMemo, useState } from 'react'
import type { CapituloDescargado } from '@compartido/tipos'
import { useGlobal, useNav } from '../contexto'
import { IcoBasura, IcoCerrar, IcoDescarga, IcoRefrescar, IcoSinRed } from '../componentes/Iconos'
import { Portada } from '../componentes/Portada'
import { SelectorCarpeta } from '../componentes/SelectorCarpeta'
import { api, clases, formatoBytes } from '../util'

const POCO_ESPACIO = 1024 ** 3 // 1 GB

export default function Descargas() {
  const { descargas } = useGlobal()
  const { ir } = useNav()
  const [abierto, setAbierto] = useState<string | null>(null)

  const porManga = useMemo(() => {
    const mapa = new Map<string, CapituloDescargado[]>()
    for (const d of Object.values(descargas.descargados)) mapa.set(d.mangaId, [...(mapa.get(d.mangaId) ?? []), d])
    return [...mapa.values()]
      .map((caps) => caps.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true })))
      .sort((a, b) => a[0].tituloManga.localeCompare(b[0].tituloManga, 'es'))
  }, [descargas.descargados])

  const libre = descargas.libreEnDisco
  const enCurso = descargas.cola.filter((d) => d.estado !== 'error')
  const conError = descargas.cola.filter((d) => d.estado === 'error')

  return (
    <section className="vista">
      <header className="cabecera-vista">
        <h1 className="titulo-vista">Descargas</h1>
      </header>

      {!descargas.carpetaDisponible && (
        <div className="aviso aviso-carpeta">
          <IcoSinRed tam={18} />
          <span>
            No se encuentra la carpeta <strong>{descargas.carpeta}</strong>. Si está en un pendrive o disco externo, conéctalo
            y toca «Revisar de nuevo».
          </span>
          <button className="boton secundario" onClick={() => api.revisarCarpetaDescargas()}>
            Revisar de nuevo
          </button>
        </div>
      )}

      <div className="resumen-espacio">
        <div>
          <span className="cifra">{formatoBytes(descargas.bytesTotales)}</span>
          <span className="rotulo">usados por Viñeta</span>
        </div>
        {libre !== null && (
          <div className={clases(libre < POCO_ESPACIO && 'peligro-texto')}>
            <span className="cifra">{formatoBytes(libre)}</span>
            <span className="rotulo">libres en el disco</span>
          </div>
        )}
        {libre !== null && libre < POCO_ESPACIO && (
          <p className="aviso">
            Queda poco espacio. Elige una carpeta en otro disco o pendrive, usa la calidad «ahorro» en Ajustes o borra
            capítulos ya leídos.
          </p>
        )}
        <div className="resumen-carpeta">
          <span className="rotulo">Los mangas se guardan en</span>
          <SelectorCarpeta />
        </div>
      </div>

      {(enCurso.length > 0 || conError.length > 0) && (
        <>
          <h2 className="subtitulo">En curso</h2>
          <ul className="cola">
            {[...enCurso, ...conError].map((d) => {
              const pct = d.total ? Math.round((d.hechas / d.total) * 100) : 0
              return (
                <li key={d.capituloId} className={clases('cola-item', d.estado === 'error' && 'error')}>
                  <div className="cola-texto">
                    <span className="cola-titulo">{d.tituloManga}</span>
                    <span className="cola-meta">
                      {d.etiqueta} ·{' '}
                      {d.estado === 'en-cola' ? 'en espera' : d.estado === 'error' ? d.error : `${d.hechas} de ${d.total} páginas`}
                    </span>
                    {d.estado !== 'error' && (
                      <span className="barra">
                        <span style={{ width: `${pct}%` }} />
                      </span>
                    )}
                  </div>
                  {d.estado === 'error' && (
                    <button className="boton-icono" onClick={() => api.descargar(d.mangaId, [d.capituloId])} title="Reintentar" aria-label="Reintentar">
                      <IcoRefrescar tam={18} />
                    </button>
                  )}
                  <button className="boton-icono" onClick={() => api.cancelarDescarga(d.capituloId)} title="Cancelar" aria-label="Cancelar">
                    <IcoCerrar tam={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h2 className="subtitulo">Para leer sin conexión</h2>
      {porManga.length === 0 ? (
        <div className="vacio">
          <IcoDescarga tam={40} />
          <h2>Nada descargado todavía</h2>
          <p>
            En la ficha de un manga, toca «Descargar manga» para bajarlo completo (y sus capítulos nuevos), o el ícono de
            descarga de un capítulo suelto.
          </p>
        </div>
      ) : (
        <ul className="descargados">
          {porManga.map((caps) => {
            const m = caps[0]
            const bytes = caps.reduce((s, c) => s + c.bytes, 0)
            const estaAbierto = abierto === m.mangaId
            const auto = descargas.automaticos.includes(m.mangaId)
            return (
              <li key={m.mangaId} className="descargado">
                <div className="descargado-cabecera">
                  <button className="descargado-portada" onClick={() => ir({ vista: 'ficha', id: m.mangaId })} aria-label={`Abrir ${m.tituloManga}`}>
                    <Portada manga={{ id: m.mangaId, portada: m.portada, titulo: m.tituloManga }} />
                  </button>
                  <button className="descargado-texto" onClick={() => setAbierto(estaAbierto ? null : m.mangaId)} aria-expanded={estaAbierto}>
                    <span className="cola-titulo">{m.tituloManga}</span>
                    <span className="cola-meta">
                      {caps.length} {caps.length === 1 ? 'capítulo' : 'capítulos'} · {formatoBytes(bytes)}
                    </span>
                  </button>
                  <button
                    className={clases('interruptor', auto && 'encendido')}
                    role="switch"
                    aria-checked={auto}
                    onClick={() => api.descargaAutomatica(m.mangaId, !auto)}
                    title="Descargar solos los capítulos nuevos"
                  >
                    <span className="perilla" aria-hidden="true" />
                    Automático
                  </button>
                  <button
                    className="boton-texto peligro"
                    onClick={() => {
                      if (confirm(`¿Borrar los ${caps.length} capítulos descargados de «${m.tituloManga}»? También se apaga su descarga automática.`))
                        void api.borrarManga(m.mangaId)
                    }}
                  >
                    <IcoBasura tam={16} /> Borrar todo
                  </button>
                </div>
                {estaAbierto && (
                  <ul className="descargado-capitulos">
                    {caps.map((c) => (
                      <li key={c.capituloId}>
                        <span>{c.etiqueta}</span>
                        <span className="cola-meta">{formatoBytes(c.bytes)}</span>
                        <button className="boton-icono peligro" onClick={() => api.borrarDescarga(c.capituloId)} aria-label={`Borrar ${c.etiqueta}`} title="Borrar">
                          <IcoBasura tam={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
