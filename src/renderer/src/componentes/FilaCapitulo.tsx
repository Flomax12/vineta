import type { CapituloDescargado, DescargaEnCurso, ProgresoCapitulo } from '@compartido/tipos'
import { IcoBasura, IcoCerrar, IcoCheck, IcoDescarga, IcoOjo, IcoRefrescar } from './Iconos'
import { clases, etiquetaCapitulo, haceCuanto, type GrupoCapitulo } from '../util'

interface Props {
  grupo: GrupoCapitulo
  progreso?: ProgresoCapitulo
  descargado?: CapituloDescargado
  enCola?: DescargaEnCurso
  sinRed: boolean
  onAbrir(): void
  onDescargar(): void
  onCancelar(): void
  onBorrar(): void
  onMarcar(leido: boolean): void
  onVersion(id: string): void
}

export function FilaCapitulo(p: Props) {
  const c = p.grupo.elegido
  const leido = p.progreso?.leido ?? false
  const aMedias = !leido && p.progreso && p.progreso.pagina > 0
  const noDisponible = p.sinRed && !p.descargado

  return (
    <li className={clases('capitulo', leido && 'leido', noDisponible && 'no-disponible')}>
      <button className="capitulo-principal" onClick={p.onAbrir} disabled={noDisponible}>
        <span className={clases('marca-lectura', !p.progreso && 'nuevo')} aria-hidden="true" />
        <span className="capitulo-texto">
          <span className="capitulo-titulo">
            {etiquetaCapitulo(c)}
            {c.titulo && <span className="capitulo-nombre"> · {c.titulo}</span>}
          </span>
          <span className="capitulo-meta">
            {c.grupos.join(', ') || 'Sin grupo'} · {haceCuanto(c.publicado)}
            {c.volumen && ` · Vol. ${c.volumen}`}
            {aMedias && ` · vas en la pág. ${p.progreso!.pagina + 1} de ${p.progreso!.total}`}
            {noDisponible && ' · no descargado'}
          </span>
        </span>
      </button>

      {p.grupo.versiones.length > 1 && (
        <select
          className="selector-version"
          value={c.id}
          onChange={(e) => p.onVersion(e.target.value)}
          aria-label="Elegir traducción"
          title="Hay varias traducciones de este capítulo"
        >
          {p.grupo.versiones.map((v) => (
            <option key={v.id} value={v.id}>
              {v.grupos[0] ?? 'Sin grupo'} ({v.idioma})
            </option>
          ))}
        </select>
      )}

      <button
        className={clases('boton-icono', leido && 'encendido')}
        onClick={() => p.onMarcar(!leido)}
        aria-label={leido ? 'Marcar como no leído' : 'Marcar como leído'}
        title={leido ? 'Marcar como no leído' : 'Marcar como leído'}
      >
        <IcoOjo tam={18} />
      </button>

      <EstadoDescarga {...p} />
    </li>
  )
}

function EstadoDescarga(p: Props) {
  if (p.descargado) {
    return (
      <span className="descarga-lista">
        <span className="ok" title="Descargado: se puede leer sin internet">
          <IcoCheck tam={16} />
        </span>
        <button className="boton-icono peligro" onClick={p.onBorrar} aria-label="Borrar descarga" title="Borrar descarga">
          <IcoBasura tam={16} />
        </button>
      </span>
    )
  }
  if (p.enCola?.estado === 'error') {
    return (
      <button className="boton-icono error" onClick={p.onDescargar} title={`${p.enCola.error}. Reintentar`}>
        <IcoRefrescar tam={18} />
      </button>
    )
  }
  if (p.enCola) {
    const pct = p.enCola.total ? Math.round((p.enCola.hechas / p.enCola.total) * 100) : 0
    return (
      <button
        className="anillo"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onClick={p.onCancelar}
        title={p.enCola.estado === 'en-cola' ? 'En cola. Clic para cancelar' : `Descargando ${pct}%. Clic para cancelar`}
        aria-label="Cancelar descarga"
      >
        <IcoCerrar tam={12} />
      </button>
    )
  }
  return (
    <button className="boton-icono" onClick={p.onDescargar} disabled={p.sinRed} aria-label="Descargar" title="Descargar para leer sin internet">
      <IcoDescarga tam={18} />
    </button>
  )
}
