# Viñeta

Lector de manga para Windows. Busca y lee desde [MangaDex](https://mangadex.org) y descarga capítulos para leerlos sin internet.

## Qué hace

- **Explorar**: populares, actualizados y nuevos, o búsqueda por nombre. Solo muestra obras con capítulos en tus idiomas (español latino y de España por defecto; inglés opcional).
- **Ficha**: descripción, géneros, capítulos con lo que ya leíste, y selector cuando un capítulo tiene varias traducciones.
- **Lector**: modo vertical (manhwa/webtoon) o por páginas, con dirección japonesa (derecha → izquierda). Recuerda la página, precarga las siguientes y se maneja con teclado: flechas, espacio, `F` pantalla completa, `Esc` salir.
- **Descargas**: cola con progreso, reintentos y calidad «ahorro» (≈2–3 MB por capítulo) o «alta». Muestra el espacio libre en disco.
- **Sin conexión**: la biblioteca, las fichas guardadas y los capítulos descargados funcionan sin internet. El indicador de conexión se basa en si MangaDex responde y se reconecta solo.

## Comandos

```bash
npm install
npm run dev        # abre la app con recarga en vivo (F12 = herramientas de desarrollo)
npm run typecheck  # revisa tipos de los tres procesos
npm run dist       # arma el instalador en dist/
```

La primera vez, Electron descarga su ejecutable (~110 MB).

## Cómo está armado

| Carpeta | Qué hay |
|---|---|
| `src/main` | Proceso principal: API de MangaDex (con límites de uso), descargas, almacén JSON, protocolo `lector://` para imágenes |
| `src/preload` | Puente seguro (`window.vineta`) entre la ventana y el proceso principal |
| `src/renderer` | Interfaz en React |
| `src/compartido` | Tipos compartidos |

- La ventana nunca habla directo con internet: pide todo al proceso principal, que valida cada parámetro.
- Datos en `%APPDATA%/Viñeta`: `datos.json` (biblioteca, progreso, ajustes), `descargas/<manga>/<capítulo>/` y `portadas/`.
- Un capítulo se descarga a una carpeta `.parcial` y solo se da por listo cuando bajaron todas sus páginas.
- `VINETA_DATOS=<carpeta>` usa otra carpeta de datos (útil para pruebas).
- El ícono se genera con `npx electron build/generar-icono.cjs`.

## Uso de MangaDex

Se respetan sus [reglas de uso de la API](https://api.mangadex.org/docs/): identificación propia (User-Agent), máximo ~4 llamadas por segundo, 40 por minuto al servidor de imágenes, reporte de cada imagen a MangaDex@Home y crédito a los grupos de traducción. Es para uso personal: las traducciones son de grupos aficionados; si te gusta una obra, apoya su edición oficial.
