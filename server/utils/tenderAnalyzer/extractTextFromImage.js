const extractTextFromImage = async (file) => ({
  fileName: file.originalname,
  fileType: file.mimetype || 'image/*',
  extractedText: '',
  extractionMethod: 'ocr-pending',
  extractionWarnings: [
    `OCR no configurado para "${file.originalname}". El backend acepta imágenes, pero para leer JPG/PNG se debe activar tesseract.js o un servicio OCR en una iteración posterior.`,
  ],
  segments: [],
})

module.exports = { extractTextFromImage }
