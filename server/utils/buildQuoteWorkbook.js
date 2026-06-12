const ExcelJS = require('exceljs')

const ITEM_START_ROW = 17
const ITEM_TEMPLATE_ROW = 17
const LOWER_SECTION_START_ROW = 33
const AVAILABLE_ITEM_ROWS = LOWER_SECTION_START_ROW - ITEM_START_ROW - 1
const MONEY_FORMAT = '"$"#,##0'
const PRINT_LAST_COLUMN = 'H'
const PRINT_LAST_COLUMN_INDEX = 8
const A4_USABLE_PAGE_HEIGHT_POINTS = 800
const MAX_EXCEL_ROW_HEIGHT = 408
const COLUMN_WIDTHS = {
  A: 6.5,
  B: 22,
  C: 15,
  D: 15,
  E: 11,
  F: 10,
  G: 10,
  H: 13.5,
}

const cloneStyle = (style = {}) => JSON.parse(JSON.stringify(style))

const getNumber = (value) => Number(value) || 0

const getText = (value) => String(value ?? '').trim()

const safeUnmerge = (worksheet, range) => {
  try {
    worksheet.unMergeCells(range)
  } catch (_) {
    // Si no estaba combinado, no hacemos nada.
  }
}

const safeMerge = (worksheet, range) => {
  try {
    worksheet.mergeCells(range)
  } catch (_) {
    // Si ya estaba combinado, no hacemos nada.
  }
}

const parseMergeRange = (range) => {
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)

  if (!match) {
    return null
  }

  return {
    startColumn: match[1],
    startRow: Number(match[2]),
    endColumn: match[3],
    endRow: Number(match[4]),
  }
}

const stringifyMergeRange = (range) =>
  `${range.startColumn}${range.startRow}:${range.endColumn}${range.endRow}`

const shiftMergeRangeRows = (range, rowOffset) =>
  stringifyMergeRange({
    ...range,
    startRow: range.startRow + rowOffset,
    endRow: range.endRow + rowOffset,
  })

const getMergeRangesFromRow = (worksheet, firstRow) =>
  Object.values(worksheet._merges || {})
    .map((merge) => parseMergeRange(merge.range))
    .filter((range) => range && range.startRow >= firstRow)
    .map(stringifyMergeRange)

const safeUnmergeRanges = (worksheet, ranges) => {
  ranges.forEach((range) => safeUnmerge(worksheet, range))
}

const safeMergeRanges = (worksheet, ranges) => {
  ranges.forEach((range) => safeMerge(worksheet, range))
}

const insertRowsBeforeLowerSection = (worksheet, extraRowsNeeded) => {
  if (extraRowsNeeded <= 0) {
    return 0
  }

  const lowerSectionMergeRanges = getMergeRangesFromRow(worksheet, LOWER_SECTION_START_ROW)
  const shiftedLowerSectionMergeRanges = lowerSectionMergeRanges
    .map(parseMergeRange)
    .filter(Boolean)
    .map((range) => shiftMergeRangeRows(range, extraRowsNeeded))

  safeUnmergeRanges(worksheet, lowerSectionMergeRanges)
  worksheet.spliceRows(
    LOWER_SECTION_START_ROW,
    0,
    ...Array.from({ length: extraRowsNeeded }, () => []),
  )
  safeMergeRanges(worksheet, shiftedLowerSectionMergeRanges)

  return extraRowsNeeded
}

const copyRowStyle = (worksheet, sourceRowNumber, targetRowNumber) => {
  const sourceRow = worksheet.getRow(sourceRowNumber)
  const targetRow = worksheet.getRow(targetRowNumber)

  targetRow.height = sourceRow.height

  for (let col = 1; col <= 8; col += 1) {
    const sourceCell = sourceRow.getCell(col)
    const targetCell = targetRow.getCell(col)

    targetCell.style = cloneStyle(sourceCell.style)
    targetCell.numFmt = sourceCell.numFmt
    targetCell.alignment = cloneStyle(sourceCell.alignment)
    targetCell.border = cloneStyle(sourceCell.border)
    targetCell.fill = cloneStyle(sourceCell.fill)
    targetCell.font = cloneStyle(sourceCell.font)
  }
}

const clearItemRow = (worksheet, rowNumber) => {
  safeUnmerge(worksheet, `B${rowNumber}:D${rowNumber}`)
  safeUnmerge(worksheet, `F${rowNumber}:G${rowNumber}`)

  worksheet.getCell(`A${rowNumber}`).value = null
  worksheet.getCell(`B${rowNumber}`).value = null
  worksheet.getCell(`E${rowNumber}`).value = null
  worksheet.getCell(`F${rowNumber}`).value = null
  worksheet.getCell(`H${rowNumber}`).value = null

  safeMerge(worksheet, `B${rowNumber}:D${rowNumber}`)
  safeMerge(worksheet, `F${rowNumber}:G${rowNumber}`)
}

const findRowByLabel = (worksheet, label) => {
  const normalizedLabel = label.toLowerCase()

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)

    for (let col = 1; col <= 8; col += 1) {
      const value = getText(row.getCell(col).value).toLowerCase()

      if (value === normalizedLabel) {
        return rowNumber
      }
    }
  }

  return null
}

const hasPrintableCellValue = (cell) => {
  const value = cell.value

  if (value === null || value === undefined || value === '') {
    return false
  }

  if (typeof value === 'object') {
    if (value.formula || value.result || value.text || value.hyperlink) {
      return true
    }

    if (Array.isArray(value.richText)) {
      return value.richText.some((textPart) => getText(textPart.text))
    }
  }

  return getText(cell.text || value).length > 0
}

const findLastContentRow = (worksheet) => {
  for (let rowNumber = worksheet.rowCount; rowNumber >= 1; rowNumber -= 1) {
    const row = worksheet.getRow(rowNumber)

    for (let col = 1; col <= PRINT_LAST_COLUMN_INDEX; col += 1) {
      if (hasPrintableCellValue(row.getCell(col))) {
        return rowNumber
      }
    }
  }

  return worksheet.rowCount
}

const estimateWrappedLines = (text, charactersPerLine) => {
  const normalizedText = getText(text)

  if (!normalizedText) {
    return 1
  }

  return normalizedText
    .split(/\r\n|\n|\r/)
    .reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0)
}

const estimateItemRowHeight = (item, baseHeight = 22) => {
  const descriptionLines = estimateWrappedLines(item.description, 58)
  const observationLines = estimateWrappedLines(item.observations, 20)
  const estimatedLines = Math.max(1, descriptionLines, observationLines)

  return Math.max(baseHeight, Math.min(MAX_EXCEL_ROW_HEIGHT, estimatedLines * 14 + 10))
}

const getRowHeight = (worksheet, rowNumber) =>
  worksheet.getRow(rowNumber).height || worksheet.properties.defaultRowHeight || 15

const sumRowHeights = (worksheet, startRow, endRow) => {
  let total = 0

  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    total += getRowHeight(worksheet, rowNumber)
  }

  return total
}

const addPageBreaks = (worksheet, lowerSectionRow, lastContentRow) => {
  worksheet.rowBreaks = []

  let currentPageHeight = 0

  for (let rowNumber = 1; rowNumber <= lastContentRow; rowNumber += 1) {
    const rowHeight = getRowHeight(worksheet, rowNumber)

    if (rowNumber === lowerSectionRow) {
      const lowerSectionHeight = sumRowHeights(worksheet, lowerSectionRow, lastContentRow)

      if (
        currentPageHeight > 0 &&
        currentPageHeight + lowerSectionHeight > A4_USABLE_PAGE_HEIGHT_POINTS
      ) {
        worksheet.getRow(rowNumber - 1).addPageBreak(1, PRINT_LAST_COLUMN_INDEX)
        currentPageHeight = 0
      }
    }

    if (
      rowNumber > ITEM_START_ROW &&
      rowNumber < lowerSectionRow &&
      currentPageHeight + rowHeight > A4_USABLE_PAGE_HEIGHT_POINTS
    ) {
      worksheet.getRow(rowNumber - 1).addPageBreak(1, PRINT_LAST_COLUMN_INDEX)
      currentPageHeight = 0
    }

    currentPageHeight += rowHeight
  }
}

const writeMoney = (cell, value) => {
  cell.value = Math.round(getNumber(value))
  cell.numFmt = MONEY_FORMAT
}
const applyCenteredCellStyle = (cell, options = {}) => {
  cell.alignment = {
    ...(cell.alignment || {}),
    horizontal: options.horizontal || 'center',
    vertical: options.vertical || 'middle',
    wrapText: options.wrapText ?? true,
    shrinkToFit: false,
  }

  cell.font = {
    ...(cell.font || {}),
    name: options.fontName || 'Arial',
    size: options.fontSize || cell.font?.size || 10,
    bold: options.bold ?? cell.font?.bold ?? false,
  }
}

const applyHeaderSectionStyles = (worksheet) => {
  const centeredCells = [
    // Datos Rubik / cliente / cotización
    'C6',
    'C7',
    'C8',
    'C9',
    'C10',
    'C11',

    // Nº cotización / fecha / vendedor / datos cliente
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
  ]

  centeredCells.forEach((address) => {
    applyCenteredCellStyle(worksheet.getCell(address), {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
      fontName: 'Arial',
      fontSize: 10,
    })
  })

    // Estos son los campos que más se notaban desalineados en PDF:
    // cliente, atención, RUT, teléfono, comuna y condición.
    ;['C9', 'F9', 'F10', 'F11', 'F12'].forEach((address) => {
      applyCenteredCellStyle(worksheet.getCell(address), {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        fontName: 'Arial',
        fontSize: 10,
      })
    })
}

const applyMoneyCellStyle = (cell) => {
  cell.alignment = {
    ...(cell.alignment || {}),
    horizontal: 'right',
    vertical: 'middle',
    wrapText: true,
    shrinkToFit: false,
  }

  cell.font = {
    ...(cell.font || {}),
    name: 'Arial',
  }
}

const normalizePayload = (quotePayload = {}) => {
  const company = quotePayload.company || quotePayload.rubikCompany || {}

  const seller =
    typeof quotePayload.seller === 'string'
      ? { name: quotePayload.seller }
      : quotePayload.seller || quotePayload.selectedSeller || {}

  const client = quotePayload.client || {}

  const quote = quotePayload.quote || quotePayload.quoteData || {}

  const rawItems = quotePayload.quoteItems || quotePayload.items || []

  const quoteItems = rawItems
    .filter((item) => {
      const description = getText(item.description)
      const hasUnitValue =
        item.unitValue !== '' && item.unitValue !== null && item.unitValue !== undefined
      const hasQuantity = getNumber(item.quantity) > 0

      return description || hasUnitValue || hasQuantity
    })
    .map((item) => {
      const quantity = getNumber(item.quantity)
      const unitValue = getNumber(item.unitValue)

      return {
        quantity,
        description: getText(item.description),
        unitValue,
        total: quantity * unitValue,
        observations: getText(item.observations),
      }
    })

  const net = quoteItems.reduce((sum, item) => sum + item.total, 0)
  const iva = net * 0.19
  const total = net + iva

  return {
    company: {
      businessName: 'Rubik Creaciones SPA',
      phone: '93535395',
      email: 'contacto@rubikcreaciones.cl',
      rut: '77.589.233-1',
      address: 'Rubik Creaciones SPA',
      ...company,
    },
    seller,
    client,
    quote: {
      quoteNumber: '8103',
      date: '',
      subject: '',
      condition: '',
      ...quote,
    },
    quoteItems,
    amounts: {
      net,
      iva,
      total,
      ...(quotePayload.amounts || {}),
    },
  }
}

const applyPrintSettings = (worksheet, rows) => {
  const { items, extraRowsInserted, netRow, ivaRow, totalRow, lowerSectionRow } = rows
  const lastContentRow = findLastContentRow(worksheet)
  const printArea = `A1:${PRINT_LAST_COLUMN}${lastContentRow}`

  Object.entries(COLUMN_WIDTHS).forEach(([column, width]) => {
    worksheet.getColumn(column).width = width
  })

  // El printArea ya limita A:H, pero ocultar columnas posteriores evita
  // que LibreOffice tome celdas residuales a la derecha como parte útil.
  for (let col = PRINT_LAST_COLUMN_INDEX + 1; col <= 30; col += 1) {
    worksheet.getColumn(col).hidden = true
  }

  worksheet.pageSetup = {
    ...worksheet.pageSetup,
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    verticalCentered: false,
    printArea,
    printTitlesRow: '16:16',
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0,
      footer: 0,
    },
  }
  worksheet.properties.defaultRowHeight = 18

  addPageBreaks(worksheet, lowerSectionRow || lastContentRow + 1, lastContentRow)

  worksheet.views = [
    {
      showGridLines: false,
    },
  ]

  console.log('[Cotizador 5000 PDF] itemCount:', items.length)
  console.log('[Cotizador 5000 PDF] extraRowsInserted:', extraRowsInserted)
  console.log('[Cotizador 5000 PDF] lastContentRow:', lastContentRow)
  console.log('[Cotizador 5000 PDF] printArea:', printArea)
  console.log('[Cotizador 5000 PDF] totalRows:', {
    netRow,
    ivaRow,
    totalRow,
  })
}

const buildQuoteWorkbook = async (templatePath, quotePayload) => {
  const data = normalizePayload(quotePayload)

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(templatePath)

  const worksheet =
    workbook.getWorksheet('Cotizacion Rubik') ||
    workbook.getWorksheet('Cotización Rubik') ||
    workbook.worksheets[0]

  if (!worksheet) {
    throw new Error('No se encontró una hoja válida en la plantilla Excel.')
  }

  const items = data.quoteItems

  if (!items.length) {
    throw new Error('Agrega al menos un ítem válido antes de exportar.')
  }

  const extraRowsNeeded = Math.max(0, items.length - AVAILABLE_ITEM_ROWS)
  const extraRowsInserted = insertRowsBeforeLowerSection(worksheet, extraRowsNeeded)

  const totalItemRows = AVAILABLE_ITEM_ROWS + extraRowsNeeded

  for (let index = 0; index < totalItemRows; index += 1) {
    const rowNumber = ITEM_START_ROW + index

    copyRowStyle(worksheet, ITEM_TEMPLATE_ROW, rowNumber)
    clearItemRow(worksheet, rowNumber)
  }
  /*desde acá se empiezan a insertar los items para los documentos*/

  worksheet.getCell('C6').value = data.company.address || data.company.businessName
  worksheet.getCell('C7').value = data.company.phone
  worksheet.getCell('C8').value = data.company.email
  worksheet.getCell('C9').value = data.client.client || data.client.name || ''
  worksheet.getCell('C10').value = data.client.company || ''
  worksheet.getCell('C11').value = data.quote.subject || data.quote.tema || ''

  worksheet.getCell('F6').value = data.quote.quoteNumber
  worksheet.getCell('F7').value = data.quote.date
  worksheet.getCell('F8').value = data.seller.name || ''
  worksheet.getCell('F9').value = data.client.rut || data.client.clientRut || ''
  worksheet.getCell('F10').value = data.client.phone || data.client.clientPhone || ''
  worksheet.getCell('F11').value = data.client.commune || data.client.comuna || ''
  worksheet.getCell('F12').value = data.quote.condition || data.quote.condicion || ''

  applyHeaderSectionStyles(worksheet)

  items.forEach((item, index) => {
    const rowNumber = ITEM_START_ROW + index

    safeUnmerge(worksheet, `B${rowNumber}:D${rowNumber}`)
    safeUnmerge(worksheet, `F${rowNumber}:G${rowNumber}`)

    safeMerge(worksheet, `B${rowNumber}:D${rowNumber}`)
    safeMerge(worksheet, `F${rowNumber}:G${rowNumber}`)

    worksheet.getCell(`A${rowNumber}`).value = item.quantity
    worksheet.getCell(`B${rowNumber}`).value = item.description
    worksheet.getCell(`E${rowNumber}`).value = item.unitValue
    worksheet.getCell(`F${rowNumber}`).value = item.total
    worksheet.getCell(`H${rowNumber}`).value = item.observations

    worksheet.getCell(`A${rowNumber}`).alignment = {
      ...worksheet.getCell(`A${rowNumber}`).alignment,
      vertical: 'top',
      horizontal: 'center',
    }

    worksheet.getCell(`B${rowNumber}`).alignment = {
      ...worksheet.getCell(`B${rowNumber}`).alignment,
      wrapText: true,
      shrinkToFit: false,
      vertical: 'top',
    }

    worksheet.getCell(`E${rowNumber}`).numFmt = MONEY_FORMAT
    worksheet.getCell(`F${rowNumber}`).numFmt = MONEY_FORMAT

    worksheet.getCell(`E${rowNumber}`).alignment = {
      ...worksheet.getCell(`E${rowNumber}`).alignment,
      vertical: 'top',
      horizontal: 'right',
    }

    worksheet.getCell(`F${rowNumber}`).alignment = {
      ...worksheet.getCell(`F${rowNumber}`).alignment,
      vertical: 'top',
      horizontal: 'right',
    }

    worksheet.getCell(`H${rowNumber}`).alignment = {
      ...worksheet.getCell(`H${rowNumber}`).alignment,
      wrapText: true,
      shrinkToFit: false,
      vertical: 'top',
    }

    worksheet.getRow(rowNumber).height = estimateItemRowHeight(item)
  })

  const netRow = findRowByLabel(worksheet, 'NETO')
  const ivaRow = findRowByLabel(worksheet, 'IVA 19%')
  const totalRow = findRowByLabel(worksheet, 'TOTAL')
  const lowerSectionRow = findRowByLabel(worksheet, 'DATOS DE TRANSFERENCIA') || netRow

  if (netRow) {
    writeMoney(worksheet.getCell(`F${netRow}`), data.amounts.net)
    applyMoneyCellStyle(worksheet.getCell(`F${netRow}`))
  }

  if (ivaRow) {
    writeMoney(worksheet.getCell(`F${ivaRow}`), data.amounts.iva)
    applyMoneyCellStyle(worksheet.getCell(`F${ivaRow}`))
  }

  if (totalRow) {
    writeMoney(worksheet.getCell(`F${totalRow}`), data.amounts.total)
    applyMoneyCellStyle(worksheet.getCell(`F${totalRow}`))
  }

  applyPrintSettings(worksheet, {
    items,
    extraRowsInserted,
    netRow,
    ivaRow,
    totalRow,
    lowerSectionRow,
  })

  return workbook
}

module.exports = {
  buildQuoteWorkbook,
}
