const express = require('express')
const { generateCotizacionPdfWithPdfkit } = require('../utils/generateCotizacionPdfWithPdfkit')
const { renderCotizacionHTML } = require('../utils/renderCotizacionHTML')

const router = express.Router()

const sanitizeFilePart = (value = '') =>
  String(value || 'sin-numero')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)

const getQuoteNumber = (quote = {}) =>
  quote.quoteNumber || quote.numeroCotizacion || quote.numero || quote.number || 'sin-numero'

const hasBody = (body) => body && typeof body === 'object' && Object.keys(body).length > 0

router.get('/export/pdf-health', (_request, response) => {
  response.json({
    ok: true,
    engine: 'pdfkit',
    chromeRequired: false,
    libreOfficeRequired: false,
  })
})

router.post('/export/pdf-preview-html', (request, response) => {
  if (!hasBody(request.body)) {
    response.status(400).json({ error: 'No hay datos de cotización para previsualizar.' })
    return
  }

  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.send(renderCotizacionHTML(request.body))
})

router.post('/export/pdf', async (request, response) => {
  if (!hasBody(request.body)) {
    response.status(400).json({ error: 'No hay datos de cotización para generar PDF.' })
    return
  }

  try {
    const quoteNumber = sanitizeFilePart(getQuoteNumber(request.body))
    const pdfBuffer = await generateCotizacionPdfWithPdfkit(request.body)

    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `attachment; filename="cotizacion-${quoteNumber}.pdf"`)
    response.setHeader('Content-Length', pdfBuffer.length)
    response.send(pdfBuffer)
  } catch (error) {
    console.error('Error generating quote PDF:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    response.status(500).json({ error: 'No se pudo generar el PDF.' })
  }
})

module.exports = router
