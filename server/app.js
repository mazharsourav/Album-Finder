import express from 'express'
import { searchArtistAlbums, getAlbum, SpotifyError } from './spotify.js'

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

/**
 * Builds the Express app with just the API routes — no static file serving,
 * no app.listen(). Shared by the local/Render entry point (server/index.js)
 * and the Vercel serverless function (api/index.js).
 */
export function createApp() {
  const app = express()

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

  return app
}
