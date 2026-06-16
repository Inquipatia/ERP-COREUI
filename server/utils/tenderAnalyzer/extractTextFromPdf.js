let pdfjsPromise

const getPdfjs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
  }

  return pdfjsPromise
}

const extractTextFromPdf = async (file) => {
  const warnings = []
  let loadingTask
  let pdfDocument

  try {
    const { getDocument } = await getPdfjs()
    const data = new Uint8Array(file.buffer)

    loadingTask = getDocument({
      data,
      disableFontFace: true,
      disableWorker: true,
      useSystemFonts: true,
    })
    pdfDocument = await loadingTask.promise

    const pageTexts = []

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)

      try {
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str || '').join(' ')

        pageTexts.push(`--- ${file.originalname} | pagina ${pageNumber} ---\n${pageText}`)
      } finally {
        if (page && typeof page.cleanup === 'function') {
          page.cleanup()
        }
      }
    }

    return { text: pageTexts.join('\n\n'), warnings }
  } catch (error) {
    warnings.push(`No se pudo extraer texto del PDF "${file.originalname}": ${error.message}`)
    return { text: '', warnings }
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === 'function') {
      pdfDocument.destroy()
    } else if (loadingTask && typeof loadingTask.destroy === 'function') {
      loadingTask.destroy()
    }
  }
}

module.exports = { extractTextFromPdf }
