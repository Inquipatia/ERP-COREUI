const { generateCotizacionPdfWithPdfkit } = require('./generateCotizacionPdfWithPdfkit')

// Compatibilidad temporal: el flujo productivo ya no usa navegador ni Chrome.
module.exports = {
  generateCotizacionPdfWithPuppeteer: generateCotizacionPdfWithPdfkit,
}
