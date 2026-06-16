const ExcelJS = require('exceljs')

const formatCellValue = (value) => {
  if (value == null) return ''

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'object') {
    if (value.text) return String(value.text)
    if (value.result != null) return String(value.result)
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('')
    if (value.hyperlink && value.text) return String(value.text)
  }

  return String(value)
}

const extractTextFromExcel = async (file) => {
  const extractionWarnings = []
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(file.buffer)

    const sheetTexts = []
    const segments = []

    workbook.eachSheet((worksheet) => {
      const rows = []

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = []

        row.eachCell({ includeEmpty: false }, (cell) => {
          const cellText = formatCellValue(cell.value).trim()

          if (cellText) {
            const cellAddress = cell.address

            values.push(`${cellAddress}: ${cellText}`)
            segments.push({
              text: cellText,
              sheet: worksheet.name,
              row: rowNumber,
              cell: cellAddress,
            })
          }
        })

        if (values.length > 0) {
          rows.push(`Fila ${rowNumber}: ${values.join(' | ')}`)
        }
      })

      if (rows.length > 0) {
        sheetTexts.push(`--- ${file.originalname} | hoja ${worksheet.name} ---\n${rows.join('\n')}`)
      }
    })

    return {
      fileName: file.originalname,
      fileType:
        file.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extractedText: sheetTexts.join('\n\n'),
      extractionMethod: 'exceljs',
      extractionWarnings,
      segments,
    }
  } catch (error) {
    extractionWarnings.push(
      `No se pudo extraer texto del Excel "${file.originalname}". Si es XLS antiguo, conviértelo a XLSX. Detalle: ${error.message}`,
    )
    return {
      fileName: file.originalname,
      fileType: file.mimetype || 'application/vnd.ms-excel',
      extractedText: '',
      extractionMethod: 'exceljs',
      extractionWarnings,
      segments: [],
    }
  }
}

module.exports = { extractTextFromExcel }
