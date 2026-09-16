const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API_BASE = 'https://api.spotify.com/v1'

let cachedToken = null // { value: string, expiresAt: number }

export class SpotifyError extends Error {
  constructor(message, { status, retryAfter } = {}) {
    super(message)
    this.name = 'SpotifyError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Copy .env.example to .env and fill them in.',
    )
  }
  return { clientId, clientSecret }
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value
  }

  const { clientId, clientSecret } = getCredentials()
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Spotify token request failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.value
}

async function spotifyGet(pathOrUrl, params = {}, { retriesLeft = 1 } = {}) {
  const token = await getAccessToken()
  const url = new URL(
    pathOrUrl.startsWith('http') ? pathOrUrl : API_BASE + pathOrUrl,
  )
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after')) || 1
    if (retriesLeft > 0 && retryAfter <= 8) {
      await sleep(retryAfter * 1000)
      return spotifyGet(pathOrUrl, params, { retriesLeft: retriesLeft - 1 })
    }
    throw new SpotifyError('Spotify is rate limiting requests. Try again in a moment.', {
      status: 429,
      retryAfter,
    })
  }

  if (!res.ok) {
    const detail = await res.text()
    throw new SpotifyError(`Spotify API error (${res.status}): ${detail}`, {
      status: res.status,
    })
  }
  return res.json()
}

/**
 * Walk a paginated Spotify list endpoint, following `next` links.
 *
 * We first try a single request with `limit=50`. Some Spotify tokens
 * (notably client-credentials) currently reject that with "Invalid limit";
 * when that happens we fall back to following the default-size `next` pages.
 * Fewer requests = far less chance of hitting the rate limiter.
 */
async function spotifyGetAll(path, params = {}, { maxItems = 100 } = {}) {
  try {
    const first = await spotifyGet(path, { ...params, limit: 50 })
    const items = [...(first.items ?? [])]
    let next = first.next
    while (next && items.length < maxItems) {
      await sleep(200)
      const page = await spotifyGet(next)
      items.push(...(page.items ?? []))
      next = page.next
    }
    return items.slice(0, maxItems)
  } catch (error) {
    const invalidLimit =
      error instanceof SpotifyError &&
      error.status === 400 &&
      /invalid limit/i.test(error.message)
    if (!invalidLimit) throw error
  }

  // Fallback: no explicit limit, follow default-size pages.
  const items = []
  let page = await spotifyGet(path, params)
  while (page) {
    items.push(...(page.items ?? []))
    if (!page.next || items.length >= maxItems) break
    await sleep(200)
    page = await spotifyGet(page.next)
  }
  return items.slice(0, maxItems)
}

function toAlbum(album) {
  return {
    id: album.id,
    name: album.name,
    releaseDate: album.release_date,
    totalTracks: album.total_tracks,
    albumType: album.album_group || album.album_type || 'album',
    image: album.images?.[0]?.url ?? null,
    url: album.external_urls?.spotify ?? null,
  }
}

function toTrack(track) {
  return {
    id: track.id,
    name: track.name,
    trackNumber: track.track_number,
    discNumber: track.disc_number,
    durationMs: track.duration_ms,
    explicit: Boolean(track.explicit),
    url: track.external_urls?.spotify ?? null,
    artists: (track.artists ?? []).map((a) => a.name),
  }
}

const VALID_GROUPS = ['album', 'single', 'compilation', 'appears_on']

function normalizeGroups(groups) {
  const list = (groups || 'album,single')
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter((g) => VALID_GROUPS.includes(g))
  return list.length ? [...new Set(list)] : ['album']
}

const resultCache = new Map() // key -> { data, expiresAt }
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * Find an artist by name, then return their releases (deduped, newest first).
 * Results are cached briefly to stay well under Spotify's rate limits.
 */
export async function searchArtistAlbums(
  query,
  { market = 'US', groups = 'album,single', maxItems = 120 } = {},
) {
  const includeGroups = normalizeGroups(groups)
  const includeParam = includeGroups.join(',')
  const cacheKey = `search:${market}:${includeParam}:${query.toLowerCase()}`
  const cached = resultCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const search = await spotifyGet('/search', {
    q: query,
    type: 'artist',
    limit: 1,
  })

  const artist = search.artists?.items?.[0]
  if (!artist) {
    return { artist: null, albums: [] }
  }

  const rawAlbums = await spotifyGetAll(
    `/artists/${artist.id}/albums`,
    { include_groups: includeParam, market },
    { maxItems },
  )

  const seen = new Set()
  const albums = rawAlbums
    .map(toAlbum)
    .filter((album) => {
      const key = `${album.albumType}:${album.name.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1))

  const data = {
    artist: {
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url ?? null,
      url: artist.external_urls?.spotify ?? null,
    },
    groups: includeGroups,
    albums,
  }

  resultCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}

/**
 * Full detail for one album, including the complete (paginated) tracklist.
 */
export async function getAlbum(id, { market = 'US' } = {}) {
  const cacheKey = `album:${market}:${id}`
  const cached = resultCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const album = await spotifyGet(`/albums/${id}`, { market })

  const tracks = (album.tracks?.items ?? []).map(toTrack)
  let nextUrl = album.tracks?.next
  while (nextUrl) {
    await sleep(120)
    const page = await spotifyGet(nextUrl)
    tracks.push(...(page.items ?? []).map(toTrack))
    nextUrl = page.next
  }

  const data = {
    id: album.id,
    name: album.name,
    image: album.images?.[0]?.url ?? null,
    url: album.external_urls?.spotify ?? null,
    releaseDate: album.release_date,
    albumType: album.album_type ?? 'album',
    totalTracks: album.total_tracks ?? tracks.length,
    label: album.label ?? null,
    artists: (album.artists ?? []).map((a) => ({
      name: a.name,
      url: a.external_urls?.spotify ?? null,
    })),
    tracks,
  }

  resultCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL })
  return data
}
