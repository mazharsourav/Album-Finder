import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { loadEnv } from './load-env.js'
import { searchArtistAlbums, getAlbum, SpotifyError } from './spotify.js'

loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
const PORT = process.env.PORT || 3001

function sendSpotifyError(res, error, label) {
  console.error(`[${label}]`, error.message)

  if (error.message.includes('Missing SPOTIFY_')) {
    return res.status(500).json({ error: 'Server is not configured with Spotify credentials.' })
  }
  if (error instanceof SpotifyError && error.status === 429) {
    if (error.retryAfter) res.set('Retry-After', String(error.retryAfter))
    return res.status(429).json({
      error: 'Spotify is rate limiting requests right now. Give it a few seconds and retry.',
    })
  }
  res.status(502).json({ error: 'Failed to fetch from Spotify. Please try again.' })
}

app.get('/api/health', (req, res) => {
  const configured = Boolean(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET,
  )
  res.json({ ok: true, spotifyConfigured: configured })
})

app.get('/api/search', async (req, res) => {
  const query = (req.query.q ?? '').toString().trim()
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q".' })
  }

  const groups = (req.query.groups ?? '').toString()

  try {
    const result = await searchArtistAlbums(query, groups ? { groups } : undefined)
    res.json(result)
  } catch (error) {
    sendSpotifyError(res, error, 'search')
  }
})

app.get('/api/album/:id', async (req, res) => {
  const { id } = req.params
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid album id.' })
  }

  try {
    const album = await getAlbum(id)
    res.json(album)
  } catch (error) {
    if (error instanceof SpotifyError && error.status === 404) {
      return res.status(404).json({ error: 'Album not found.' })
    }
    sendSpotifyError(res, error, 'album')
  }
})

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
