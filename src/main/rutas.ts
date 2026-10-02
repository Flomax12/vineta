import { app } from 'electron'
import { join } from 'node:path'

export const carpetaDatos = () => app.getPath('userData')
export const carpetaDescargas = () => join(carpetaDatos(), 'descargas')
export const carpetaPortadas = () => join(carpetaDatos(), 'portadas')
