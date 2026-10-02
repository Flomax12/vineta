import type { ReactNode } from 'react'
import type { MangaResumen } from '@compartido/tipos'
import { useNav } from '../contexto'
import { Portada } from './Portada'

export function TarjetaManga({ manga, insignia, pie }: { manga: MangaResumen; insignia?: ReactNode; pie?: ReactNode }) {
  const { ir } = useNav()
  return (
    <button className="tarjeta" onClick={() => ir({ vista: 'ficha', id: manga.id })} title={manga.titulo}>
      <div className="tarjeta-portada">
        <Portada manga={manga} />
        {insignia}
      </div>
      <span className="tarjeta-titulo">{manga.titulo}</span>
      <span className="tarjeta-pie">{pie ?? manga.autores[0] ?? ''}</span>
    </button>
  )
}

export function TarjetaFantasma() {
  return (
    <div className="tarjeta fantasma" aria-hidden="true">
      <div className="tarjeta-portada">
        <div className="portada" />
      </div>
      <span className="linea" />
      <span className="linea corta" />
    </div>
  )
}
