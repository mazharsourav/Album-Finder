import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const SUGGESTIONS = [
  'Radiohead',
  'Kendrick Lamar',
  'Fleetwood Mac',
  'Daft Punk',
  'Taylor Swift',
  'Tyler, The Creator',
]

const GROUP_OPTIONS = [
  { value: 'album', label: 'Albums' },
  { value: 'single', label: 'Singles & EPs' },
  { value: 'compilation', label: 'Compilations' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title A–Z' },
]

const DEFAULT_GROUPS = ['album', 'single']

const AUTHOR_NAME = 'Mazhar Sourav'
const GITHUB_URL = 'https://github.com/mazharsourav'
const PORTFOLIO_URL = 'https://mazharsourav.me'

function formatDuration(ms) {
  if (!ms) return ''
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function formatYear(date) {
  return (date || '').slice(0, 4)
}

const THEME_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

/**
 * Light/dark theme. Follows the OS setting until the user clicks the toggle;
 * after that their choice is saved and wins. index.html applies a saved
 * choice before first paint, so this hook only mirrors it into state.
 */
function useTheme() {
  const [saved, setSaved] = useState(readSavedTheme)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme = saved ?? (systemDark ? 'dark' : 'light')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage unavailable (private mode); the choice just won't persist.
    }
    setSaved(next)
  }

  return [theme, toggleTheme]
}

function VinylIcon(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
    </svg>
  )
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.75.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArtistBanner({ artist, albumCount }) {
  return (
    <div className="artist">
      {artist.image && <img className="artist__photo" src={artist.image} alt="" />}
      <div className="artist__body">
        <h2 className="artist__name">{artist.name}</h2>
        <p className="artist__stats">
          {albumCount} {albumCount === 1 ? 'release' : 'releases'}
        </p>
      </div>
      {artist.url && (
        <a className="artist__link" href={artist.url} target="_blank" rel="noreferrer">
          Open on Spotify
        </a>
      )}
    </div>
  )
}

function Toolbar({ groups, onToggleGroup, sort, onSortChange }) {
  return (
    <div className="toolbar">
      <div className="toolbar__groups" role="group" aria-label="Release types">
        {GROUP_OPTIONS.map((option) => {
          const active = groups.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className={active ? 'chip chip--active' : 'chip'}
              aria-pressed={active}
              onClick={() => onToggleGroup(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <label className="toolbar__sort">
        <span>Sort</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function AlbumCard({ album, onSelect }) {
  return (
    <button type="button" className="album" onClick={() => onSelect(album.id)}>
      <div className="album__art">
        {album.image ? (
          <img src={album.image} alt="" loading="lazy" />
        ) : (
          <div className="album__art--empty" aria-hidden="true">
            ♪
          </div>
        )}
      </div>
      <div className="album__info">
        <span className="album__name">{album.name}</span>
        <span className="album__meta">
          {formatYear(album.releaseDate)}
          {album.totalTracks ? ` · ${album.totalTracks} tracks` : ''}
        </span>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="album album--skeleton" aria-hidden="true">
      <div className="album__art" />
      <div className="album__info">
        <span className="skeleton-line" />
        <span className="skeleton-line skeleton-line--short" />
      </div>
    </div>
  )
}

function AlbumModal({ albumId, onClose }) {
  const [album, setAlbum] = useState(null)
  const [status, setStatus] = useState('loading') // loading | done | error

  useEffect(() => {
    let active = true
    setStatus('loading')
    setAlbum(null)

    fetch(`/api/album/${albumId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Request failed')
        return data
      })
      .then((data) => {
        if (!active) return
        setAlbum(data)
        setStatus('done')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => {
      active = false
    }
  }, [albumId])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const multiDisc = album?.tracks?.some((track) => track.discNumber > 1)

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Album details"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {status === 'loading' && <p className="results__note">Loading tracklist…</p>}
        {status === 'error' && <p className="results__note">Couldn&rsquo;t load this album.</p>}

        {status === 'done' && album && (
          <>
            <div className="modal__head">
              {album.image && <img className="modal__cover" src={album.image} alt="" />}
              <div className="modal__headinfo">
                <p className="modal__type">{album.albumType}</p>
                <h2 className="modal__title">{album.name}</h2>
                <p className="modal__meta">
                  {album.artists.map((a) => a.name).join(', ')}
                  {' · '}
                  {formatYear(album.releaseDate)}
                  {' · '}
                  {album.totalTracks} tracks
                </p>
                {album.label && <p className="modal__label">{album.label}</p>}
                {album.url && (
                  <a
                    className="artist__link"
                    href={album.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>
            </div>

            <ol className="tracklist">
              {album.tracks.map((track) => (
                <li key={track.id} className="track">
                  <span className="track__num">
                    {multiDisc ? `${track.discNumber}.${track.trackNumber}` : track.trackNumber}
                  </span>
                  <span className="track__name">
                    {track.url ? (
                      <a href={track.url} target="_blank" rel="noreferrer">
                        {track.name}
                      </a>
                    ) : (
                      track.name
                    )}
                    {track.explicit && <span className="track__tag">E</span>}
                  </span>
                  <span className="track__dur">{formatDuration(track.durationMs)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [groups, setGroups] = useState(DEFAULT_GROUPS)
  const [sort, setSort] = useState('newest')
  const [selectedAlbumId, setSelectedAlbumId] = useState(null)
  const [theme, toggleTheme] = useTheme()

  const runSearch = useCallback(
    async (term, groupList) => {
      const q = term.trim()
      if (!q) return

      const activeGroups = groupList ?? DEFAULT_GROUPS

      const url = new URL(window.location)
      url.searchParams.set('q', q)
      window.history.replaceState({}, '', url)

      setStatus('loading')
      setError('')
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&groups=${activeGroups.join(',')}`,
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Request failed')
        setArtist(data.artist)
        setAlbums(data.albums)
        setStatus('done')
      } catch (err) {
        setArtist(null)
        setAlbums([])
        setError(err.message)
        setStatus('error')
      }
    },
    [],
  )

  // Run a search from the ?q= URL param on first load (shareable links).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q')
    if (initial) {
      setQuery(initial)
      runSearch(initial, DEFAULT_GROUPS)
    }
  }, [runSearch])

  function resetToHome() {
    const url = new URL(window.location)
    url.searchParams.delete('q')
    window.history.replaceState({}, '', url)
    setQuery('')
    setArtist(null)
    setAlbums([])
    setError('')
    setStatus('idle')
    setGroups(DEFAULT_GROUPS)
    setSort('newest')
    setSelectedAlbumId(null)
  }

  function onSubmit(event) {
    event.preventDefault()
    runSearch(query, groups)
  }

  function onSuggestion(name) {
    setQuery(name)
    runSearch(name, groups)
  }

  function toggleGroup(value) {
    const next = groups.includes(value)
      ? groups.filter((g) => g !== value)
      : [...groups, value]
    if (next.length === 0) return // keep at least one type selected
    setGroups(next)
    runSearch(query, next)
  }

  const sortedAlbums = useMemo(() => {
    const copy = [...albums]
    if (sort === 'oldest') {
      copy.sort((a, b) => (a.releaseDate > b.releaseDate ? 1 : -1))
    } else if (sort === 'az') {
      copy.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      copy.sort((a, b) => (a.releaseDate < b.releaseDate ? 1 : -1))
    }
    return copy
  }, [albums, sort])

  const searched = status !== 'idle'

  return (
    <div className="page">
      <div className="page__glow" aria-hidden="true" />

      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <SunIcon className="theme-toggle__icon" />
        ) : (
          <MoonIcon className="theme-toggle__icon" />
        )}
      </button>

      <header className={searched ? 'hero hero--compact' : 'hero'}>
        <button
          type="button"
          className="hero__brand"
          onClick={resetToHome}
          aria-label="Album Finder — back to start"
        >
          <VinylIcon className="hero__brand-icon" />
          Album Finder
        </button>

        {!searched && (
          <>
            <h1 className="hero__title">Explore any artist&rsquo;s discography</h1>
            <p className="hero__lede">
              Search a musician and browse every release &mdash; cover art, tracklists, and links
              straight to Spotify.
            </p>
          </>
        )}

        <form className="searchbar" onSubmit={onSubmit} role="search">
          <SearchIcon className="searchbar__icon" />
          <input
            type="search"
            placeholder="Search for an artist…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search for an artist"
            autoFocus
          />
          <button type="submit">Search</button>
        </form>

        {!searched && (
          <div className="suggestions">
            <span className="suggestions__label">Try</span>
            {SUGGESTIONS.map((name) => (
              <button key={name} type="button" className="chip" onClick={() => onSuggestion(name)}>
                {name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="results">
        {searched && (
          <button type="button" className="back" onClick={resetToHome}>
            <BackIcon className="back__icon" />
            Back
          </button>
        )}

        {status === 'loading' && (
          <div className="album-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="notice notice--error">
            <strong>Couldn&rsquo;t complete the search</strong>
            <span>{error}</span>
            <button type="button" className="chip" onClick={() => runSearch(query, groups)}>
              Retry
            </button>
          </div>
        )}

        {status === 'done' && albums.length === 0 && (
          <div className="notice">
            <strong>Nothing found for &ldquo;{query.trim()}&rdquo;</strong>
            <span>Try a different spelling, another artist, or another release type.</span>
          </div>
        )}

        {status === 'done' && albums.length > 0 && artist && (
          <>
            <ArtistBanner artist={artist} albumCount={albums.length} />
            <Toolbar
              groups={groups}
              onToggleGroup={toggleGroup}
              sort={sort}
              onSortChange={setSort}
            />
            <div className="album-grid">
              {sortedAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} onSelect={setSelectedAlbumId} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        <p className="foot__credit">
          Built by{' '}
          <a href={PORTFOLIO_URL || GITHUB_URL} target="_blank" rel="noreferrer">
            {AUTHOR_NAME}
          </a>
        </p>
        <nav className="foot__links">
          {PORTFOLIO_URL && (
            <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
              Portfolio
            </a>
          )}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="foot__link">
            <GitHubIcon className="foot__link-icon" />
            GitHub
          </a>
        </nav>
        <p className="foot__meta">Data from the Spotify Web API</p>
      </footer>

      {selectedAlbumId && (
        <AlbumModal albumId={selectedAlbumId} onClose={() => setSelectedAlbumId(null)} />
      )}
    </div>
  )
}
