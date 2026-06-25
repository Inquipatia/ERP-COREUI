const cors = require('cors')
const express = require('express')
const tenderAnalyzerRoutes = require('./routes/tenderAnalyzerRoutes')

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
const productRoutes = require('./routes/productRoutes')
const materialRoutes = require('./routes/materialRoutes')
const userRoutes = require('./routes/userRoutes')
const devRoutes = require('./routes/devRoutes')
const pdfRoutes = require('./routes/pdfRoutes')
const { attachUser, requireAuth } = require('./middleware/authMiddleware')
const dataAdapter = require('./services/dataAdapter')

const PORT = process.env.PORT || process.env.API_PORT || 4300

const allowedOrigins = [
  'https://erp.rubikcreaciones.com',
  'http://localhost:5173',
  'http://localhost:4300',
]

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [
    'Content-Disposition',
    'Content-Type',
    'Content-Length',
    'X-Rubik-Pdf-Fallback',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
}

const app = express()

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use(express.json({ limit: '25mb' }))
app.use(attachUser)

app.get('/', (_request, response) => {
  response.json({ status: 'ok', service: 'rubik-erp-api', message: 'Use /api endpoints.' })
})

app.get('/health', (_request, response) => {
  const adapterStatus = dataAdapter.getAdapterStatus()

  response.json({
    status: 'ok',
    service: 'rubik-erp-api',
    mode: adapterStatus.mode,
    db: adapterStatus.db,
    warning: adapterStatus.fallbackReason,
  })
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'rubik-api' })
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
app.use('/api/products', productRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/users', userRoutes)
app.use('/api/dev', devRoutes)
app.use('/api', pdfRoutes)
console.log('PDF ROUTES MONTADAS EN /api')
console.log('PDF ROUTE ACTIVA /api/export/pdf')
app.use('/api/tender-analyzer', tenderAnalyzerRoutes)

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found' })
})

app.use((request, response) => {
  response.status(404).json({ error: `Route not found: ${request.method} ${request.path}` })
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
