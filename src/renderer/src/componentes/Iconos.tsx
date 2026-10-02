// Íconos de trazo (estilo Lucide), dibujados a mano para no depender de una librería.
import type { ReactNode, SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & { tam?: number }

function icono(contenido: ReactNode) {
  return function Icono({ tam = 20, ...resto }: Props) {
    return (
      <svg
        width={tam}
        height={tam}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...resto}
      >
        {contenido}
      </svg>
    )
  }
}

export const IcoBuscar = icono(<><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.3-4.3" /></>)
export const IcoExplorar = icono(<><circle cx="12" cy="12" r="9.5" /><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z" /></>)
export const IcoBiblioteca = icono(<><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></>)
export const IcoDescarga = icono(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>)
export const IcoAjustes = icono(
  <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" /></>
)
export const IcoAtras = icono(<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>)
export const IcoCheck = icono(<path d="M20 6 9 17l-5-5" />)
export const IcoCerrar = icono(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>)
export const IcoBasura = icono(
  <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>
)
export const IcoOjo = icono(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>)
export const IcoPantalla = icono(
  <><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></>
)
export const IcoIzq = icono(<path d="m15 18-6-6 6-6" />)
export const IcoDer = icono(<path d="m9 18 6-6-6-6" />)
export const IcoSinRed = icono(
  <><path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5c4-.4 8.1.9 11.3 3.8M16.9 11.3a10 10 0 0 1 2.2 1.6M5 13a10 10 0 0 1 5.2-2.8" /><path d="m2 2 20 20" /></>
)
export const IcoRefrescar = icono(
  <><path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16" /><path d="M8 16H3v5" /></>
)
export const IcoMas = icono(<><path d="M5 12h14" /><path d="M12 5v14" /></>)
export const IcoMarcador = icono(<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />)
export const IcoMarcadorOk = icono(<><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><path d="m9 10 2 2 4-4" /></>)
export const IcoLibro = icono(
  <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>
)
export const IcoVertical = icono(<><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M5 9h14M5 15h14" /></>)
export const IcoPaginas = icono(<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M12 4v16" /></>)
export const IcoDireccion = icono(<><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>)
export const IcoCarpeta = icono(
  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
)
export const IcoOrden = icono(<><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></>)
export const IcoExterno = icono(
  <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>
)
