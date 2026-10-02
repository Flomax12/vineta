import { useCallback, useMemo, useState } from 'react'
import { ContextoNav, ProveedorGlobal, useGlobal, type Navegacion, type Ruta } from './contexto'
import { IcoAjustes, IcoBiblioteca, IcoDescarga, IcoExplorar } from './componentes/Iconos'
import { clases } from './util'
import Explorar from './vistas/Explorar'
import Ficha from './vistas/Ficha'
import Lector from './vistas/Lector'
import Biblioteca from './vistas/Biblioteca'
import Descargas from './vistas/Descargas'
import AjustesVista from './vistas/Ajustes'

const SECCIONES = [
  { vista: 'explorar', nombre: 'Explorar', Icono: IcoExplorar },
  { vista: 'biblioteca', nombre: 'Biblioteca', Icono: IcoBiblioteca },
  { vista: 'descargas', nombre: 'Descargas', Icono: IcoDescarga },
  { vista: 'ajustes', nombre: 'Ajustes', Icono: IcoAjustes }
] as const

export default function App() {
  return (
    <ProveedorGlobal>
      <Interfaz />
    </ProveedorGlobal>
  )
}

function Interfaz() {
  const { enLinea, descargas } = useGlobal()
  // Sin internet se parte en la biblioteca, que funciona con lo guardado.
  const [pila, setPila] = useState<Ruta[]>(() => [{ vista: navigator.onLine ? 'explorar' : 'biblioteca' }])
  const ruta = pila[pila.length - 1]

  const nav: Navegacion = useMemo(
    () => ({
      ruta,
      ir: (r) => setPila((p) => [...p, r]),
      reemplazar: (r) => setPila((p) => [...p.slice(0, -1), r]),
      volver: () => setPila((p) => (p.length > 1 ? p.slice(0, -1) : p)),
      seccion: (r) => setPila([r])
    }),
    [ruta]
  )

  const raiz = pila[0].vista
  const activas = descargas.cola.filter((d) => d.estado !== 'error').length
  const irSeccion = useCallback((vista: (typeof SECCIONES)[number]['vista']) => nav.seccion({ vista } as Ruta), [nav])

  // Lo que se ve bajo el lector (que es una capa encima).
  const base = [...pila].reverse().find((r) => r.vista !== 'lector') ?? pila[0]

  return (
    <ContextoNav.Provider value={nav}>
      <div className="app">
        <nav className="barra-lateral" aria-label="Secciones">
          <div className="marca">
            <span className="marca-sello" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="marca-nombre">Viñeta</span>
          </div>
          <ul>
            {SECCIONES.map(({ vista, nombre, Icono }) => (
              <li key={vista}>
                <button
                  className={clases('enlace', raiz === vista && 'activo')}
                  aria-current={raiz === vista ? 'page' : undefined}
                  onClick={() => irSeccion(vista)}
                >
                  <Icono />
                  <span>{nombre}</span>
                  {vista === 'descargas' && activas > 0 && <span className="contador">{activas}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className={clases('estado-red', !enLinea && 'sin-red')} role="status">
            <span className="punto" />
            {enLinea ? 'En línea' : 'Sin conexión'}
          </div>
        </nav>
        <main className="contenido">
          {/* Explorar queda montado para no perder la búsqueda al volver. */}
          <div hidden={base.vista !== 'explorar'} className="vista-contenedor">
            <Explorar />
          </div>
          {base.vista === 'ficha' && <Ficha key={base.id} id={base.id} />}
          {base.vista === 'biblioteca' && <Biblioteca />}
          {base.vista === 'descargas' && <Descargas />}
          {base.vista === 'ajustes' && <AjustesVista />}
        </main>
      </div>
      {ruta.vista === 'lector' && <Lector key={ruta.capituloId} {...ruta} />}
    </ContextoNav.Provider>
  )
}
