let pdfjsPromise

const getPdfjs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
  }

  return pdfjsPromise
}

const extractTextFromPdf = async (file) => {
  const extractionWarnings = []
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
    const segments = []

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)

      try {
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str || '').join(' ')

        if (pageText.trim().length < 40) {
          extractionWarnings.push(
            `Página ${pageNumber} de "${file.originalname}" tiene poco texto extraíble; puede ser PDF escaneado u OCR débil.`,
          )
        }

        pageTexts.push(`--- ${file.originalname} | pagina ${pageNumber} ---\n${pageText}`)
        segments.push({
          text: pageText,
          page: pageNumber,
        })
      } finally {
        if (page && typeof page.cleanup === 'function') {
          page.cleanup()
        }
      }
    }

    return {
      fileName: file.originalname,
      fileType: file.mimetype || 'application/pdf',
      extractedText: pageTexts.join('\n\n'),
      extractionMethod: 'pdfjs-dist',
      extractionWarnings,
      segments,
    }
  } catch (error) {
    extractionWarnings.push(
      `No se pudo extraer texto del PDF "${file.originalname}": ${error.message}`,
    )
    return {
      fileName: file.originalname,
      fileType: file.mimetype || 'application/pdf',
      extractedText: '',
      extractionMethod: 'pdfjs-dist',
      extractionWarnings,
      segments: [],
    }
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === 'function') {
      pdfDocument.destroy()
    } else if (loadingTask && typeof loadingTask.destroy === 'function') {
      loadingTask.destroy()
    }
  }
}

module.exports = { extractTextFromPdf }
