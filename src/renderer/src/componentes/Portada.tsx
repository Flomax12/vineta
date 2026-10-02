import { useState } from 'react'
import type { MangaResumen } from '@compartido/tipos'
import { clases, urlPortada } from '../util'

/** Portada 2:3 con respaldo tipográfico si no hay imagen o no carga. */
export function Portada({ manga, className }: { manga: Pick<MangaResumen, 'id' | 'portada' | 'titulo'>; className?: string }) {
  const [fallo, setFallo] = useState(false)
  const url = urlPortada(manga)
  return (
    <div className={clases('portada', className)}>
      {url && !fallo ? (
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFallo(true)} />
      ) : (
        <span className="portada-respaldo">{manga.titulo.slice(0, 1)}</span>
      )}
    </div>
  )
}
