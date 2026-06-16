const extractTextFromImage = async (file) => ({
  text: '',
  warnings: [
    `OCR no configurado para "${file.originalname}". El backend acepta imágenes, pero para leer JPG/PNG se debe activar tesseract.js o un servicio OCR en una iteración posterior.`,
  ],
})

module.exports = { extractTextFromImage }
