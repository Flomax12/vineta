import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ApiVineta, EstadoDescargas } from '@compartido/tipos'

const llamar = ipcRenderer.invoke.bind(ipcRenderer)

const api: ApiVineta = {
  explorar: (c) => llamar('explorar', c),
  ficha: (id) => llamar('ficha', id),
  paginas: (id) => llamar('paginas', id),

  biblioteca: () => llamar('biblioteca'),
  agregarABiblioteca: (id) => llamar('biblioteca:agregar', id),
  quitarDeBiblioteca: (id) => llamar('biblioteca:quitar', id),
  actualizarBiblioteca: () => llamar('biblioteca:actualizar'),

  progreso: (id) => llamar('progreso', id),
  guardarProgreso: (m, c, p, t) => llamar('progreso:guardar', m, c, p, t),
  marcarLeidos: (m, ids, leido) => llamar('progreso:marcar', m, ids, leido),

  ajustes: () => llamar('ajustes'),
  guardarAjustes: (a) => llamar('ajustes:guardar', a),

  descargas: () => llamar('descargas'),
  descargar: (m, ids) => llamar('descargas:agregar', m, ids),
  cancelarDescarga: (id) => llamar('descargas:cancelar', id),
  borrarDescarga: (id) => llamar('descargas:borrar', id),
  alCambiarDescargas: (cb) => {
    const oyente = (_e: IpcRendererEvent, estado: EstadoDescargas) => cb(estado)
    ipcRenderer.on('descargas:cambio', oyente)
    return () => ipcRenderer.removeListener('descargas:cambio', oyente)
  },

  red: () => llamar('red'),
  alCambiarRed: (cb) => {
    const oyente = (_e: IpcRendererEvent, v: boolean) => cb(v)
    ipcRenderer.on('red:cambio', oyente)
    return () => ipcRenderer.removeListener('red:cambio', oyente)
  },

  abrirEnNavegador: (url) => llamar('abrir:navegador', url),
  abrirCarpetaDatos: () => llamar('abrir:datos'),
  vaciarCache: () => llamar('cache:vaciar')
}

contextBridge.exposeInMainWorld('vineta', api)
