import type { ApiVineta } from '../compartido/tipos'

declare global {
  interface Window {
    vineta: ApiVineta
  }
}
