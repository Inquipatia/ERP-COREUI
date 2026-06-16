const cors = require('cors')
const express = require('express')
const multer = require('multer')
const path = require('node:path')
const { analyzeTenderContent } = require('./utils/tenderAnalyzer/analyzeTenderContent')
const { extractTextFromDocx } = require('./utils/tenderAnalyzer/extractTextFromDocx')
const { extractTextFromExcel } = require('./utils/tenderAnalyzer/extractTextFromExcel')
const { extractTextFromImage } = require('./utils/tenderAnalyzer/extractTextFromImage')
const { extractTextFromPdf } = require('./utils/tenderAnalyzer/extractTextFromPdf')

const PORT = 4100
const MAX_FILE_SIZE_MB = 35
const MAX_FILES = 30

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_FILES,
  },
})

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === 'http://localhost:3000' ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        callback(null, true)
        return
      }

      callback(new Error('Origen no permitido por CORS.'))
    },
  }),
)

app.use(express.json({ limit: '2mb' }))

app.get('/health', (request, response) => {
  response.json({ status: 'ok', service: 'tender-analyzer-server' })
})

const getExtension = (file) => path.extname(file.originalname || '').toLowerCase()

const extractTextFromTxt = async (file) => ({
  text: `--- ${file.originalname} | texto TXT ---\n${file.buffer.toString('utf8')}`,
  warnings: [],
})

const extractTextFromFile = async (file) => {
  const extension = getExtension(file)
  const mimeType = String(file.mimetype || '').toLowerCase()

  if (extension === '.pdf' || mimeType.includes('pdf')) {
    return extractTextFromPdf(file)
  }

  if (['.xlsx', '.xls'].includes(extension) || mimeType.includes('spreadsheet')) {
    return extractTextFromExcel(file)
  }

  if (extension === '.docx' || mimeType.includes('wordprocessingml.document')) {
    return extractTextFromDocx(file)
  }

  if (extension === '.txt' || mimeType.startsWith('text/')) {
    return extractTextFromTxt(file)
  }

  if (['.jpg', '.jpeg', '.png'].includes(extension) || mimeType.startsWith('image/')) {
    return extractTextFromImage(file)
  }

  return {
    text: '',
    warnings: [`Formato no soportado para "${file.originalname}".`],
  }
}

app.post(
  '/analyze-tender-documents',
  upload.array('documents', MAX_FILES),
  async (request, response) => {
    try {
      const files = request.files || []
      const manualText = String(request.body?.sourceText || '')

      if (files.length === 0 && !manualText.trim()) {
        response.status(400).json({
          error: 'Sube documentos o envía texto manual para analizar la licitación.',
        })
        return
      }

      console.log(`Received POST /analyze-tender-documents with ${files.length} files`)

      const sources = []
      const warnings = []

      for (const file of files) {
        const extracted = await extractTextFromFile(file)

        warnings.push(...(extracted.warnings || []))
        sources.push({
          fileName: file.originalname,
          fileType: file.mimetype || getExtension(file),
          text: extracted.text || '',
          warnings: extracted.warnings || [],
        })
      }

      const analysis = analyzeTenderContent({ sources, manualText })

      response.json({
        ...analysis,
        sourceFiles: sources.map((source) => ({
          name: source.fileName,
          type: source.fileType,
          warnings: source.warnings,
        })),
        warnings,
      })
    } catch (error) {
      console.error('Error en /analyze-tender-documents:', error)
      response.status(500).json({
        error: error.message || 'No se pudieron analizar los documentos de licitación.',
      })
    }
  },
)

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      error: `Error subiendo archivos: ${error.message}`,
    })
    return
  }

  next(error)
})

app.listen(PORT, () => {
  console.log(`Tender analyzer server running on http://localhost:${PORT}`)
})
