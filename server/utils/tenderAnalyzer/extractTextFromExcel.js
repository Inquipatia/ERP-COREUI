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
  const warnings = []
  const workbook = new ExcelJS.Workbook()

  try {
    await workbook.xlsx.load(file.buffer)

    const sheetTexts = []

    workbook.eachSheet((worksheet) => {
      const rows = []

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values = []

        row.eachCell({ includeEmpty: false }, (cell) => {
          const cellText = formatCellValue(cell.value).trim()

          if (cellText) {
            values.push(cellText)
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

    return { text: sheetTexts.join('\n\n'), warnings }
  } catch (error) {
    warnings.push(
      `No se pudo extraer texto del Excel "${file.originalname}". Si es XLS antiguo, conviértelo a XLSX. Detalle: ${error.message}`,
    )
    return { text: '', warnings }
  }
}

module.exports = { extractTextFromExcel }
