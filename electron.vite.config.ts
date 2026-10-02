import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const compartido = { '@compartido': resolve(__dirname, 'src/compartido') }

export default defineConfig({
  main: {
    resolve: { alias: compartido }
  },
  preload: {
    resolve: { alias: compartido }
  },
  renderer: {
    resolve: { alias: compartido },
    plugins: [react()]
  }
})
