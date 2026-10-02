// Genera build/icono.png (512x512) dibujando el logo en SVG con el propio Electron.
// Uso: npx electron build/generar-icono.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const papel = '#fbf3e6'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <g transform="rotate(-4 256 256)">
    <rect x="44" y="44" width="424" height="424" rx="92" fill="#e5533d"/>
    <rect x="112" y="112" width="130" height="288" rx="18" fill="${papel}"/>
    <rect x="266" y="112" width="134" height="132" rx="18" fill="${papel}"/>
    <rect x="266" y="268" width="134" height="132" rx="18" fill="${papel}"/>
  </g>
</svg>`

app.whenReady().then(async () => {
  const w = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  })
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`
  await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((r) => setTimeout(r, 400))
  let img = await w.webContents.capturePage()
  if (img.getSize().width !== 512) img = img.resize({ width: 512, height: 512, quality: 'best' })
  fs.writeFileSync(path.join(__dirname, 'icono.png'), img.toPNG())
  console.log('icono.png', img.getSize())
  app.quit()
})
