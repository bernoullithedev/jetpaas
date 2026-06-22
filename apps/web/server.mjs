import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import startServer from './dist/server/server.js'
import { serve } from 'srvx/node'
import { serveStatic } from 'srvx/static'

const rootDir = dirname(fileURLToPath(import.meta.url))
const clientDir = join(rootDir, 'dist/client')

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 3000)

const fetchHandler = startServer.fetch.bind(startServer)

serve({
  hostname: host,
  port,
  middleware: [serveStatic({ dir: clientDir })],
  fetch: fetchHandler,
})
