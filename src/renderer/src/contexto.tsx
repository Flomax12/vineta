import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Ajustes, Capitulo, EstadoDescargas } from '@compartido/tipos'
import { api } from './util'

export type Ruta =
  | { vista: 'explorar' }
  | { vista: 'biblioteca' }
  | { vista: 'descargas' }
  | { vista: 'ajustes' }
  | { vista: 'ficha'; id: string }
  | { vista: 'lector'; mangaId: string; tituloManga: string; capituloId: string; lista: Capitulo[] }

export interface Navegacion {
  ruta: Ruta
  ir(r: Ruta): void
  reemplazar(r: Ruta): void
  volver(): void
  seccion(r: Ruta): void
}

export const ContextoNav = createContext<Navegacion | null>(null)
export const useNav = () => useContext(ContextoNav)!

interface Global {
  enLinea: boolean
  descargas: EstadoDescargas
  ajustes: Ajustes | null
  cambiarAjustes(a: Partial<Ajustes>): Promise<void>
}

const ContextoGlobal = createContext<Global | null>(null)
export const useGlobal = () => useContext(ContextoGlobal)!

const SIN_DESCARGAS: EstadoDescargas = { cola: [], descargados: {}, bytesTotales: 0, libreEnDisco: null }

export function ProveedorGlobal({ children }: { children: ReactNode }) {
  const [redWindows, setRedWindows] = useState(navigator.onLine)
  const [redMangaDex, setRedMangaDex] = useState(true)
  const enLinea = redWindows && redMangaDex
  const [descargas, setDescargas] = useState<EstadoDescargas>(SIN_DESCARGAS)
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)

  useEffect(() => {
    const on = () => setRedWindows(true)
    const off = () => setRedWindows(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    void api.descargas().then(setDescargas)
    void api.ajustes().then(setAjustes)
    void api.red().then(setRedMangaDex)
    const soltar = api.alCambiarDescargas(setDescargas)
    const soltarRed = api.alCambiarRed(setRedMangaDex)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      soltar()
      soltarRed()
    }
  }, [])

  const cambiarAjustes = async (a: Partial<Ajustes>) => setAjustes(await api.guardarAjustes(a))

  return (
    <ContextoGlobal.Provider value={{ enLinea, descargas, ajustes, cambiarAjustes }}>{children}</ContextoGlobal.Provider>
  )
}
