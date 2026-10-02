// Tipos que comparten el proceso principal, el preload y la interfaz.

export type Idioma = 'es-la' | 'es' | 'en'
export type Calidad = 'alta' | 'ahorro'
export type ModoLectura = 'vertical' | 'paginas'
export type Direccion = 'der-izq' | 'izq-der'

export interface MangaResumen {
  id: string
  titulo: string
  /** Nombre del archivo de portada en MangaDex (sin URL). */
  portada: string | null
  autores: string[]
  estado: string | null
  anio: number | null
  descripcion: string
  etiquetas: string[]
  clasificacion: string
}

export interface Capitulo {
  id: string
  numero: string | null
  volumen: string | null
  titulo: string | null
  idioma: string
  paginas: number
  grupos: string[]
  publicado: string
}

/** Otro manga ligado a este (continuación, precuela, historia paralela…). */
export interface Relacionado {
  /** Tipo de relación ya traducido, p. ej. "Continuación". */
  relacion: string
  manga: MangaResumen
}

/** Ficha completa: resumen + lista de capítulos en los idiomas elegidos. */
export interface Ficha extends MangaResumen {
  capitulos: Capitulo[]
  /** Puede faltar en fichas guardadas por versiones anteriores. */
  relacionados?: Relacionado[]
  /** Momento (ms) en que se trajo desde internet. */
  actualizado: number
}

export interface ResultadoFicha {
  ficha: Ficha | null
  /** true si internet falló y se muestra la copia guardada. */
  sinConexion: boolean
  enBiblioteca: boolean
  /** Descarga automática: baja los capítulos nuevos apenas salen. */
  automatica: boolean
}

export interface ProgresoCapitulo {
  pagina: number
  total: number
  leido: boolean
  fecha: number
}

export interface ProgresoManga {
  capitulos: Record<string, ProgresoCapitulo>
  ultimo: string | null
}

export interface Ajustes {
  idiomas: Idioma[]
  calidadLectura: Calidad
  calidadDescarga: Calidad
  modoLectura: ModoLectura
  direccion: Direccion
  anchoVertical: number
  /** Carpeta elegida para las descargas; null = la carpeta de datos de la app. */
  carpetaDescargas: string | null
}

export const AJUSTES_INICIALES: Ajustes = {
  idiomas: ['es-la', 'es'],
  calidadLectura: 'alta',
  calidadDescarga: 'ahorro',
  modoLectura: 'vertical',
  direccion: 'der-izq',
  anchoVertical: 820,
  carpetaDescargas: null
}

export type OrdenExplorar = 'populares' | 'recientes' | 'nuevos'

export interface ConsultaExplorar {
  texto: string
  orden: OrdenExplorar
  desde: number
}

export interface ResultadoExplorar {
  items: MangaResumen[]
  total: number
}

export type EstadoDescarga = 'en-cola' | 'descargando' | 'error'

export interface DescargaEnCurso {
  capituloId: string
  mangaId: string
  tituloManga: string
  portada: string | null
  etiqueta: string
  estado: EstadoDescarga
  hechas: number
  total: number
  error?: string
}

export interface CapituloDescargado {
  capituloId: string
  mangaId: string
  tituloManga: string
  portada: string | null
  etiqueta: string
  archivos: string[]
  bytes: number
  fecha: number
}

export interface EstadoDescargas {
  cola: DescargaEnCurso[]
  descargados: Record<string, CapituloDescargado>
  bytesTotales: number
  libreEnDisco: number | null
  carpeta: string
  /** true si el usuario eligió una carpeta propia. */
  carpetaPersonalizada: boolean
  /** false si la carpeta no existe (p. ej. un pendrive desconectado). */
  carpetaDisponible: boolean
  /** Mangas con descarga automática de capítulos nuevos. */
  automaticos: string[]
}

export interface ResultadoCarpeta {
  ok: boolean
  carpeta?: string
  movidos?: number
  error?: string
}

export interface PaginasCapitulo {
  urls: string[]
  origen: 'local' | 'internet'
}

export interface EntradaBiblioteca {
  ficha: Ficha
  sinLeer: number
  descargados: number
  ultimoLeido: number
  automatica: boolean
}

/** API que el preload expone en window.vineta. */
export interface ApiVineta {
  explorar(c: ConsultaExplorar): Promise<ResultadoExplorar>
  ficha(id: string): Promise<ResultadoFicha>
  paginas(capituloId: string): Promise<PaginasCapitulo>

  biblioteca(): Promise<EntradaBiblioteca[]>
  agregarABiblioteca(mangaId: string): Promise<void>
  quitarDeBiblioteca(id: string): Promise<void>
  actualizarBiblioteca(): Promise<{ nuevos: number; fallidos: number }>

  progreso(mangaId: string): Promise<ProgresoManga>
  guardarProgreso(mangaId: string, capituloId: string, pagina: number, total: number): Promise<void>
  marcarLeidos(mangaId: string, capituloIds: string[], leido: boolean): Promise<ProgresoManga>

  ajustes(): Promise<Ajustes>
  guardarAjustes(a: Partial<Ajustes>): Promise<Ajustes>

  descargas(): Promise<EstadoDescargas>
  descargar(mangaId: string, capituloIds: string[]): Promise<void>
  cancelarDescarga(capituloId: string): Promise<void>
  borrarDescarga(capituloId: string): Promise<void>
  /** Baja todo lo que falta, agrega a la biblioteca y activa la descarga automática. */
  descargarManga(mangaId: string, capituloIds: string[]): Promise<void>
  descargaAutomatica(mangaId: string, activar: boolean): Promise<void>
  /** Borra todos los capítulos descargados del manga y apaga su descarga automática. */
  borrarManga(mangaId: string): Promise<void>
  elegirCarpetaDescargas(): Promise<ResultadoCarpeta>
  restablecerCarpetaDescargas(): Promise<ResultadoCarpeta>
  revisarCarpetaDescargas(): Promise<void>
  alCambiarDescargas(cb: (e: EstadoDescargas) => void): () => void

  red(): Promise<boolean>
  alCambiarRed(cb: (enLinea: boolean) => void): () => void

  abrirEnNavegador(url: string): Promise<void>
  abrirCarpetaDatos(): Promise<void>
  vaciarCache(): Promise<void>
}
