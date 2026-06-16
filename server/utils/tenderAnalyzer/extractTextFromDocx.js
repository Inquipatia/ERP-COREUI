const mammoth = require('mammoth')

const extractTextFromDocx = async (file) => {
  const extractionWarnings = []

  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer })

    if (result.messages?.length > 0) {
      extractionWarnings.push(
        ...result.messages.map(
          (message) => `Advertencia DOCX "${file.originalname}": ${message.message}`,
        ),
      )
    }

    const paragraphs = String(result.value || '')
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)

    return {
      fileName: file.originalname,
      fileType:
        file.mimetype || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: `--- ${file.originalname} | documento DOCX ---\n${result.value || ''}`,
      extractionMethod: 'mammoth',
      extractionWarnings,
      segments: paragraphs.map((paragraph, index) => ({
        text: paragraph,
        row: index + 1,
      })),
    }
  } catch (error) {
    extractionWarnings.push(
      `No se pudo extraer texto del DOCX "${file.originalname}": ${error.message}`,
    )
    return {
      fileName: file.originalname,
      fileType:
        file.mimetype || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedText: '',
      extractionMethod: 'mammoth',
      extractionWarnings,
      segments: [],
    }
  }
}

module.exports = { extractTextFromDocx }
