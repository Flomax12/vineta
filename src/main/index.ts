import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import * as almacen from './almacen'
import * as automatico from './automatico'
import * as descargas from './descargas'
import { registrarIpc } from './ipc'
import { manejarProtocolo, registrarEsquema } from './protocolo'

// Para pruebas: permite usar otra carpeta de datos sin tocar la real.
if (process.env['VINETA_DATOS']) app.setPath('userData', process.env['VINETA_DATOS'])

registrarEsquema()
app.setAppUserModelId('cl.flomac.vineta')

if (!app.requestSingleInstanceLock()) app.quit()

let ventana: BrowserWindow | null = null

function crearVentana(): void {
  ventana = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: 'Viñeta',
    backgroundColor: '#14120f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  ventana.once('ready-to-show', () => ventana?.show())

  // Nada de ventanas nuevas ni navegación fuera de la app.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://mangadex.org/')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  ventana.webContents.on('will-navigate', (e) => e.preventDefault())
  // Si la interfaz se cae (falta de memoria, error de la GPU), se recarga en vez de quedar en blanco.
  ventana.webContents.on('render-process-gone', (_e, d) => {
    if (d.reason !== 'clean-exit') ventana?.webContents.reload()
  })

  const dev = process.env['ELECTRON_RENDERER_URL']
  ventana.webContents.on('before-input-event', (_e, input) => {
    if (dev && input.type === 'keyDown' && input.key === 'F12') ventana?.webContents.toggleDevTools()
  })

  if (dev) void ventana.loadURL(dev)
  else void ventana.loadFile(join(__dirname, '../renderer/index.html'))
}

app.on('second-instance', () => {
  if (!ventana) return
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  await almacen.cargar()
  await descargas.indexar()
  manejarProtocolo()
  registrarIpc()
  crearVentana()
  automatico.iniciar()
})

app.on('window-all-closed', () => app.quit())
