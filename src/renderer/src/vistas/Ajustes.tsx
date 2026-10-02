import { useState, type ReactNode } from 'react'
import type { Calidad, Idioma } from '@compartido/tipos'
import { useGlobal } from '../contexto'
import { IcoCarpeta } from '../componentes/Iconos'
import { api, clases } from '../util'

const IDIOMAS: { valor: Idioma; nombre: string }[] = [
  { valor: 'es-la', nombre: 'Español latino' },
  { valor: 'es', nombre: 'Español de España' },
  { valor: 'en', nombre: 'Inglés' }
]

function Opciones<T extends string>({ valor, opciones, onCambio }: { valor: T; opciones: { valor: T; nombre: string }[]; onCambio(v: T): void }) {
  return (
    <div className="segmentado" role="radiogroup">
      {opciones.map((o) => (
        <button key={o.valor} role="radio" aria-checked={valor === o.valor} className={clases(valor === o.valor && 'activo')} onClick={() => onCambio(o.valor)}>
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

function Fila({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="ajuste">
      <div className="ajuste-texto">
        <span className="ajuste-titulo">{titulo}</span>
        {ayuda && <span className="ajuste-ayuda">{ayuda}</span>}
      </div>
      <div className="ajuste-control">{children}</div>
    </div>
  )
}

const CALIDADES: { valor: Calidad; nombre: string }[] = [
  { valor: 'alta', nombre: 'Alta' },
  { valor: 'ahorro', nombre: 'Ahorro' }
]

export default function Ajustes() {
  const { ajustes, cambiarAjustes } = useGlobal()
  const [cacheVaciada, setCacheVaciada] = useState(false)
  if (!ajustes) return null

  const alternarIdioma = (i: Idioma) => {
    const tiene = ajustes.idiomas.includes(i)
    if (tiene && ajustes.idiomas.length === 1) return // al menos uno
    void cambiarAjustes({ idiomas: tiene ? ajustes.idiomas.filter((x) => x !== i) : [...ajustes.idiomas, i] })
  }

  return (
    <section className="vista angosta">
      <header className="cabecera-vista">
        <h1 className="titulo-vista">Ajustes</h1>
      </header>

      <h2 className="subtitulo">Contenido</h2>
      <Fila titulo="Idiomas de los capítulos" ayuda="Solo se muestran mangas y capítulos traducidos a estos idiomas.">
        <div className="chips">
          {IDIOMAS.map((i) => (
            <button key={i.valor} className={clases('chip', ajustes.idiomas.includes(i.valor) && 'activo')} aria-pressed={ajustes.idiomas.includes(i.valor)} onClick={() => alternarIdioma(i.valor)}>
              {i.nombre}
            </button>
          ))}
        </div>
      </Fila>

      <h2 className="subtitulo">Calidad de imagen</h2>
      <Fila titulo="Al leer con internet" ayuda="«Ahorro» carga más rápido y gasta menos datos.">
        <Opciones valor={ajustes.calidadLectura} opciones={CALIDADES} onCambio={(v) => cambiarAjustes({ calidadLectura: v })} />
      </Fila>
      <Fila titulo="Al descargar" ayuda="Un capítulo pesa unos 2–3 MB en ahorro y 6–12 MB en alta.">
        <Opciones valor={ajustes.calidadDescarga} opciones={CALIDADES} onCambio={(v) => cambiarAjustes({ calidadDescarga: v })} />
      </Fila>

      <h2 className="subtitulo">Lector</h2>
      <Fila titulo="Modo de lectura" ayuda="Vertical es ideal para manhwa y webtoons; por páginas, para manga.">
        <Opciones
          valor={ajustes.modoLectura}
          opciones={[
            { valor: 'vertical', nombre: 'Vertical' },
            { valor: 'paginas', nombre: 'Por páginas' }
          ]}
          onCambio={(v) => cambiarAjustes({ modoLectura: v })}
        />
      </Fila>
      <Fila titulo="Dirección por páginas" ayuda="El manga japonés se lee de derecha a izquierda.">
        <Opciones
          valor={ajustes.direccion}
          opciones={[
            { valor: 'der-izq', nombre: 'Derecha → izquierda' },
            { valor: 'izq-der', nombre: 'Izquierda → derecha' }
          ]}
          onCambio={(v) => cambiarAjustes({ direccion: v })}
        />
      </Fila>
      <Fila titulo="Ancho en modo vertical" ayuda={`${ajustes.anchoVertical} px`}>
        <input
          type="range"
          min={400}
          max={1600}
          step={20}
          value={ajustes.anchoVertical}
          onChange={(e) => cambiarAjustes({ anchoVertical: Number(e.target.value) })}
          aria-label="Ancho en modo vertical"
        />
      </Fila>

      <h2 className="subtitulo">Datos</h2>
      <Fila titulo="Carpeta de datos" ayuda="Biblioteca, progreso, portadas y descargas.">
        <button className="boton secundario" onClick={() => api.abrirCarpetaDatos()}>
          <IcoCarpeta tam={16} /> Abrir carpeta
        </button>
      </Fila>
      <Fila titulo="Caché" ayuda="Borra imágenes temporales y portadas de mangas que no guardaste.">
        <button
          className="boton secundario"
          onClick={async () => {
            await api.vaciarCache()
            setCacheVaciada(true)
          }}
        >
          {cacheVaciada ? 'Listo' : 'Vaciar caché'}
        </button>
      </Fila>

      <p className="credito">
        Viñeta 0.1 · Los mangas, portadas y capítulos vienen de MangaDex. Las traducciones son de los grupos que aparecen en
        cada capítulo; si te gusta una obra, apoya su edición oficial.
      </p>
    </section>
  )
}
