import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { loadEnv } from './load-env.js'
import { createApp } from './app.js'

loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = createApp()
const PORT = process.env.PORT || 3001

// Serve the built client (npm run build → dist/) and let it handle any
// non-API route, so the app works as a single deployable service. In dev,
// Vite serves the client separately and proxies /api/* here instead.
app.use(express.static(distDir))
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.warn('⚠  SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set — /api/search will fail.')
  }
})
