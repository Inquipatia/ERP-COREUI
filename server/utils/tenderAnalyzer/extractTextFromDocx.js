const mammoth = require('mammoth')

const extractTextFromDocx = async (file) => {
  const warnings = []

  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer })

    if (result.messages?.length > 0) {
      warnings.push(
        ...result.messages.map(
          (message) => `Advertencia DOCX "${file.originalname}": ${message.message}`,
        ),
      )
    }

    return {
      text: `--- ${file.originalname} | documento DOCX ---\n${result.value || ''}`,
      warnings,
    }
  } catch (error) {
    warnings.push(`No se pudo extraer texto del DOCX "${file.originalname}": ${error.message}`)
    return { text: '', warnings }
  }
}

module.exports = { extractTextFromDocx }
