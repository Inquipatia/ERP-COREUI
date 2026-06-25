const { generateCotizacionPdfWithPdfkit } = require('./generateCotizacionPdfWithPdfkit')

// Compatibilidad temporal:
// El flujo productivo ya no usa Puppeteer, Chrome ni LibreOffice.
module.exports = {
  generateCotizacionPdfWithPuppeteer: generateCotizacionPdfWithPdfkit,
}