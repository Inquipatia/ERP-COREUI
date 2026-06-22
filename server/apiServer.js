const cors = require('cors')
const express = require('express')
require('dotenv').config({ quiet: true })
const authRoutes = require('./routes/authRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const clientRoutes = require('./routes/clientRoutes')
const quoteRoutes = require('./routes/quoteRoutes')
const documentRoutes = require('./routes/documentRoutes')
const tenderRoutes = require('./routes/tenderRoutes')
const workOrderRoutes = require('./routes/workOrderRoutes')
const financeRoutes = require('./routes/financeRoutes')
const supplierRoutes = require('./routes/supplierRoutes')
const userRoutes = require('./routes/userRoutes')
const devRoutes = require('./routes/devRoutes')
const { attachUser, requireAuth } = require('./middleware/authMiddleware')

const PORT = Number(process.env.API_PORT || 4300)

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origen no permitido por CORS.'))
    },
  }),
)

app.use(express.json({ limit: '25mb' }))
app.use(attachUser)

app.get('/', (_request, response) => {
  response.send('Rubik ERP API server running. Use GET /health or /api/* endpoints.')
})

app.get('/health', (_request, response) => {
  const usingPostgres = process.env.RUBIK_DATA_ADAPTER === 'postgres'
  response.json({
    status: 'ok',
    service: 'rubik-erp-api',
    database: usingPostgres ? 'postgresql' : 'json-file',
    warning:
      usingPostgres && !process.env.DATABASE_URL
        ? 'DATABASE_URL no existe. Configura PostgreSQL en .env antes de usar RUBIK_DATA_ADAPTER=postgres.'
        : undefined,
  })
})

app.use('/api/auth', authRoutes)
app.get('/api/me', requireAuth, (request, response) => {
  response.json({ user: request.currentUser })
})
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/quotes', quoteRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/tenders', tenderRoutes)
app.use('/api/work-orders', workOrderRoutes)
app.use('/api/finance', financeRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dev', devRoutes)

app.use((request, response) => {
  response.status(404).json({ error: `Ruta no encontrada: ${request.method} ${request.path}` })
})

app.use((error, _request, response, _next) => {
  console.error('API server error:', error)
  response.status(error.statusCode || 500).json({
    error: error.message || 'Error interno del API.',
  })
})

const server = app.listen(PORT, () => {
  console.log(`Rubik ERP API server running on http://localhost:${PORT}`)
})

server.on('error', (error) => {
  console.error('API server listen error:', error)
})
