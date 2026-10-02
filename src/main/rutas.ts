import { app } from 'electron'
import { join } from 'node:path'
import * as almacen from './almacen'

export const carpetaDatos = () => app.getPath('userData')
export const carpetaDescargasInicial = () => join(carpetaDatos(), 'descargas')
export const carpetaDescargas = () => almacen.ajustes().carpetaDescargas ?? carpetaDescargasInicial()
export const carpetaPortadas = () => join(carpetaDatos(), 'portadas')
