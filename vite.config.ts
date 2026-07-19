import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function shortenApiPlugin(): Plugin {
  return {
    name: 'shorten-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/shorten', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.end()
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
              url?: string
            }
            const url = typeof body.url === 'string' ? body.url.trim() : ''
            if (!url) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'url required' }))
              return
            }
            new URL(url)

            const endpoint = `https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`
            const response = await fetch(endpoint)
            const data = (await response.json()) as {
              shorturl?: string
              errormessage?: string
            }

            if (!data.shorturl) {
              res.statusCode = 502
              res.end(JSON.stringify({ error: data.errormessage || 'shorten failed' }))
              return
            }

            res.statusCode = 200
            res.end(JSON.stringify({ short: data.shorturl }))
          } catch {
            res.statusCode = 502
            res.end(JSON.stringify({ error: 'shorten failed' }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), shortenApiPlugin()],
})
