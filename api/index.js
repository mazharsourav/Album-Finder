import { loadEnv } from '../server/load-env.js'
import { createApp } from '../server/app.js'

// No-op in production (Vercel injects env vars directly); loads .env locally.
loadEnv()

// Vercel's Node runtime accepts an Express app as the default export and
// forwards requests to it directly — no extra adapter needed.
export default createApp()
