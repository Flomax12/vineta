import type { Capitulo } from './tipos'

/**
 * Deja una sola versión (traducción) por número de capítulo, prefiriendo
 * los grupos indicados (p. ej. los de capítulos ya descargados).
 */
export function unaVersionPorCapitulo(capitulos: Capitulo[], gruposPreferidos: string[] = []): Capitulo[] {
  const porNumero = new Map<string, Capitulo[]>()
  for (const c of capitulos) {
    const clave = c.numero ?? `sin-numero-${c.id}`
    porNumero.set(clave, [...(porNumero.get(clave) ?? []), c])
  }
  const elegidos: Capitulo[] = []
  for (const versiones of porNumero.values()) {
    const preferida = gruposPreferidos
      .map((g) => versiones.find((v) => v.grupos.includes(g)))
      .find(Boolean)
    elegidos.push(preferida ?? versiones[0])
  }
  return elegidos
}

/** Grupos ordenados por cuántas veces aparecen (el más usado primero). */
export function gruposMasUsados(capitulos: Capitulo[]): string[] {
  const cuenta = new Map<string, number>()
  for (const c of capitulos) for (const g of c.grupos) cuenta.set(g, (cuenta.get(g) ?? 0) + 1)
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
}
