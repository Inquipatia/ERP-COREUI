const cors = require('cors')
const express = require('express')
const fs = require('node:fs')
const fsPromises = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { execFile } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { promisify } = require('node:util')
const { pathToFileURL } = require('node:url')
const { buildQuoteWorkbook } = require('./utils/buildQuoteWorkbook')

const execFileAsync = promisify(execFile)

const PORT = 4000
const PROJECT_ROOT = path.resolve(__dirname, '..')
const TEMPLATE_PATH = path.join(PROJECT_ROOT, 'public', 'templates', 'cotizacion-rubik.xlsx')
const TEMP_ROOT = path.join(os.tmpdir(), 'rubik-cotizador-5000')
const LIBREOFFICE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'

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

app.use(express.json({ limit: '10mb' }))

app.get('/', (request, response) => {
  response.send('PDF server running. Use GET /health or POST /export-pdf.')
})

app.get('/health', (request, response) => {
  response.json({
    status: 'ok',
    service: 'pdf-server',
    templatePath: TEMPLATE_PATH,
    templateExists: fs.existsSync(TEMPLATE_PATH),
    libreOfficePath: LIBREOFFICE_PATH,
    libreOfficeExists: fs.existsSync(LIBREOFFICE_PATH),
  })
})

const safeFileName = (value) =>
  String(value || '8103')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')

const ensureRuntimeFiles = () => {
  console.log('PROJECT_ROOT:', PROJECT_ROOT)
  console.log('TEMPLATE_PATH:', TEMPLATE_PATH)
  console.log('Template exists:', fs.existsSync(TEMPLATE_PATH))
  console.log('LIBREOFFICE_PATH:', LIBREOFFICE_PATH)
  console.log('LibreOffice exists:', fs.existsSync(LIBREOFFICE_PATH))

  if (!fs.existsSync(LIBREOFFICE_PATH)) {
    const error = new Error(`No se encontró LibreOffice en ${LIBREOFFICE_PATH}`)
    error.statusCode = 500
    throw error
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    const error = new Error(`No se encontró la plantilla Excel en ${TEMPLATE_PATH}`)
    error.statusCode = 500
    throw error
  }
}

const convertXlsxToPdf = async (xlsxPath, outputDir) => {
  const libreOfficeProfileDir = path.join(outputDir, 'lo-profile')

  await fsPromises.mkdir(libreOfficeProfileDir, { recursive: true })

  const args = [
    `-env:UserInstallation=${pathToFileURL(libreOfficeProfileDir).href}`,
    '--headless',
    '--nologo',
    '--nofirststartwizard',
    '--norestore',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    xlsxPath,
  ]

  console.log('Running LibreOffice:', LIBREOFFICE_PATH, args.join(' '))

  const { stdout, stderr } = await execFileAsync(LIBREOFFICE_PATH, args, {
    timeout: 120000,
    windowsHide: true,
  })

  if (stdout) console.log('LibreOffice stdout:', stdout)
  if (stderr) console.error('LibreOffice stderr:', stderr)
}

const removeTempDir = async (dirPath) => {
  if (!dirPath) return
  await fsPromises.rm(dirPath, { force: true, recursive: true })
}

app.post('/export-pdf', async (request, response) => {
  let workDir

  try {
    console.log('Received POST /export-pdf')
    ensureRuntimeFiles()

    const quoteNumber = safeFileName(
      request.body?.quote?.quoteNumber ||
        request.body?.quoteData?.quoteNumber ||
        request.body?.quoteNumber ||
        '8103',
    )

    const baseFileName = `Cotizacion-Rubik-${quoteNumber}`

    workDir = path.join(TEMP_ROOT, randomUUID())
    await fsPromises.mkdir(workDir, { recursive: true })

    const xlsxPath = path.join(workDir, `${baseFileName}.xlsx`)
    const pdfPath = path.join(workDir, `${baseFileName}.pdf`)

    const workbook = await buildQuoteWorkbook(TEMPLATE_PATH, request.body)

    await workbook.xlsx.writeFile(xlsxPath)

    console.log('XLSX temporal creado:', xlsxPath)

    await convertXlsxToPdf(xlsxPath, workDir)

    console.log('PDF esperado:', pdfPath)
    console.log('PDF exists:', fs.existsSync(pdfPath))

    if (!fs.existsSync(pdfPath)) {
      throw new Error('LibreOffice no generó el PDF esperado.')
    }

    response.download(pdfPath, `${baseFileName}.pdf`, async (downloadError) => {
      try {
        await removeTempDir(workDir)
      } catch (cleanupError) {
        console.error('No se pudo limpiar carpeta temporal:', cleanupError)
      }

      if (downloadError) {
        console.error('Error enviando PDF:', downloadError)
      }
    })
  } catch (error) {
    console.error('Error en /export-pdf:', error)

    try {
      await removeTempDir(workDir)
    } catch (cleanupError) {
      console.error('No se pudo limpiar carpeta temporal:', cleanupError)
    }

    response.status(error.statusCode || 500).json({
      error: error.message || 'No se pudo exportar la cotización a PDF.',
    })
  }
})

app.listen(PORT, () => {
  console.log(`PDF server running on http://localhost:${PORT}`)
})