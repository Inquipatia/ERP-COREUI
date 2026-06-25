const { renderCotizacionHTML } = require('./renderCotizacionHTML')

const getPuppeteer = () => {
  try {
    return require('puppeteer')
  } catch (error) {
    const dependencyError = new Error('Puppeteer no está instalado o no está disponible en el servidor.')
    dependencyError.cause = error
    throw dependencyError
  }
}

const generateCotizacionPdfWithPuppeteer = async (quote = {}) => {
  const puppeteer = getPuppeteer()
  const html = renderCotizacionHTML(quote)
  let browser

  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'new',
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        bottom: '12mm',
        left: '12mm',
        right: '12mm',
        top: '12mm',
      },
      printBackground: true,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}

module.exports = {
  generateCotizacionPdfWithPuppeteer,
}
