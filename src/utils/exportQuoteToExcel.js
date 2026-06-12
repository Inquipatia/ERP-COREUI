import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const TEMPLATE_ITEM_START_ROW = 17
const TEMPLATE_ITEM_END_ROW = 31
const TEMPLATE_ITEM_ROW_COUNT = TEMPLATE_ITEM_END_ROW - TEMPLATE_ITEM_START_ROW + 1
const LOWER_ZONE_START_ROW = TEMPLATE_ITEM_END_ROW + 1

const TOTAL_LABELS = {
  net: 'NETO',
  iva: 'IVA 19%',
  total: 'TOTAL',
}

const CLP_FORMAT = '"$"#,##0'

const clone = (value) => (value ? JSON.parse(JSON.stringify(value)) : value)

const getNumberValue = (value) => Number(value) || 0

const getItemTotal = (item) => getNumberValue(item.quantity) * getNumberValue(item.unitValue)

const parseInputDate = (date) => {
  if (!date) return ''

  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [day, month, year] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const parseMergeRange = (range) => {
  const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)

  if (!match) return null

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

const unmergeRanges = (worksheet, ranges) => {
  ranges.forEach((range) => {
    try {
      worksheet.unMergeCells(range)
    } catch {
      // Mantiene exportación si la plantilla cambia.
    }
  })
}

const mergeRanges = (worksheet, ranges) => {
  ranges.forEach((range) => {
    try {
      worksheet.mergeCells(range)
    } catch {
      // Mantiene exportación si la plantilla cambia.
    }
  })
}

const copyRowStyle = (worksheet, sourceRowNumber, targetRowNumber) => {
  const sourceRow = worksheet.getRow(sourceRowNumber)
  const targetRow = worksheet.getRow(targetRowNumber)

  targetRow.height = sourceRow.height

  for (let column = 1; column <= 8; column += 1) {
    const sourceCell = sourceRow.getCell(column)
    const targetCell = targetRow.getCell(column)

    targetCell.style = clone(sourceCell.style)
    targetCell.numFmt = sourceCell.numFmt
  }
}

const mergeItemRow = (worksheet, rowNumber) => {
  try {
    worksheet.unMergeCells(`B${rowNumber}:D${rowNumber}`)
  } catch {
    // Puede no existir merge previo.
  }

  try {
    worksheet.unMergeCells(`F${rowNumber}:G${rowNumber}`)
  } catch {
    // Puede no existir merge previo.
  }

  worksheet.mergeCells(`B${rowNumber}:D${rowNumber}`)
  worksheet.mergeCells(`F${rowNumber}:G${rowNumber}`)
}

const estimateDescriptionRowHeight = (description, baseHeight = 42) => {
  const text = description || ''
  const visualLines = text
    .split(/\r\n|\n|\r/)
    .reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 70)), 0)

  return Math.max(baseHeight, Math.min(240, visualLines * 18 + 18))
}

const normalizeItemRows = (worksheet, itemCount) => {
  const extraRows = Math.max(0, itemCount - TEMPLATE_ITEM_ROW_COUNT)

  if (extraRows === 0) return 0

  const lowerZoneMergeRanges = getMergeRangesFromRow(worksheet, LOWER_ZONE_START_ROW)
  const shiftedLowerZoneMergeRanges = lowerZoneMergeRanges
    .map(parseMergeRange)
    .filter(Boolean)
    .map((range) => shiftMergeRangeRows(range, extraRows))
  const rows = Array.from({ length: extraRows }, () => [])

  unmergeRanges(worksheet, lowerZoneMergeRanges)
  worksheet.spliceRows(LOWER_ZONE_START_ROW, 0, ...rows)
  mergeRanges(worksheet, shiftedLowerZoneMergeRanges)

  return extraRows
}

const writeCell = (worksheet, address, value) => {
  worksheet.getCell(address).value = value ?? ''
}

const setCellAlignment = (cell, options = {}) => {
  cell.alignment = {
    ...clone(cell.alignment),
    horizontal: options.horizontal || 'center',
    vertical: options.vertical || 'middle',
    wrapText: options.wrapText ?? true,
  }
}

const setWrapText = (cell) => {
  cell.alignment = {
    ...clone(cell.alignment),
    vertical: 'top',
    wrapText: true,
  }
}

const applyPrintSetup = (worksheet) => {
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    verticalCentered: false,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.15,
      footer: 0.15,
    },
  }

  worksheet.properties.defaultRowHeight = 20

  // Mejora vista de impresión para que no se vea chico.
  worksheet.views = [
    {
      state: 'normal',
      showGridLines: false,
      zoomScale: 100,
    },
  ]

  // Columnas A:H según la plantilla actual.
  worksheet.getColumn('A').width = 10
  worksheet.getColumn('B').width = 22
  worksheet.getColumn('C').width = 22
  worksheet.getColumn('D').width = 22
  worksheet.getColumn('E').width = 16
  worksheet.getColumn('F').width = 16
  worksheet.getColumn('G').width = 16
  worksheet.getColumn('H').width = 28

  // Área estimada. Excel ajustará a una página de ancho.
  worksheet.pageSetup.printArea = `A1:H${Math.max(45, worksheet.rowCount)}`
}

const applyHeaderAlignment = (worksheet) => {
  // Primera sección de datos principales.
  // Estos campos son los que actualmente escribes en C9:C11 y F6:F12.
  const centeredCells = [
    'C6',
    'C7',
    'C8',
    'C9',
    'C10',
    'C11',
    'F6',
    'F7',
    'F8',
    'F9',
    'F10',
    'F11',
    'F12',
  ]

  centeredCells.forEach((address) => {
    const cell = worksheet.getCell(address)

    setCellAlignment(cell, {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    })

    cell.font = {
      ...clone(cell.font),
      name: 'Arial',
      size: cell.font?.size || 10,
    }
  })
}

const writeCompanyClientAndQuoteData = (worksheet, quotePayload) => {
  const { company, seller, client, quote } = quotePayload

  writeCell(worksheet, 'C6', company.address)
  writeCell(worksheet, 'C7', company.phone)
  writeCell(worksheet, 'C8', company.email)

  writeCell(worksheet, 'C9', client.client)
  writeCell(worksheet, 'C10', client.company)
  writeCell(worksheet, 'C11', quote.subject)

  writeCell(worksheet, 'F6', quote.quoteNumber)
  writeCell(worksheet, 'F7', parseInputDate(quote.date))
  worksheet.getCell('F7').numFmt = 'dd-mm-yyyy'
  writeCell(worksheet, 'F8', seller.name)
  writeCell(worksheet, 'F9', client.rut)
  writeCell(worksheet, 'F10', client.phone)
  writeCell(worksheet, 'F11', client.comuna)
  writeCell(worksheet, 'F12', quote.condition)

  applyHeaderAlignment(worksheet)
}

const writeItems = (worksheet, quoteItems) => {
  const templateRowHeight = worksheet.getRow(TEMPLATE_ITEM_START_ROW).height || 42

  quoteItems.forEach((item, index) => {
    const rowNumber = TEMPLATE_ITEM_START_ROW + index
    const row = worksheet.getRow(rowNumber)

    copyRowStyle(worksheet, TEMPLATE_ITEM_START_ROW, rowNumber)
    mergeItemRow(worksheet, rowNumber)

    row.height = estimateDescriptionRowHeight(item.description, templateRowHeight)

    worksheet.getCell(`A${rowNumber}`).value = getNumberValue(item.quantity)
    worksheet.getCell(`B${rowNumber}`).value = item.description
    worksheet.getCell(`E${rowNumber}`).value = getNumberValue(item.unitValue)
    worksheet.getCell(`F${rowNumber}`).value = getItemTotal(item)
    worksheet.getCell(`H${rowNumber}`).value = item.observations || ''

    setCellAlignment(worksheet.getCell(`A${rowNumber}`), {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    })
    setWrapText(worksheet.getCell(`B${rowNumber}`))
    setCellAlignment(worksheet.getCell(`E${rowNumber}`), {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
    })
    setCellAlignment(worksheet.getCell(`F${rowNumber}`), {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
    })
    setWrapText(worksheet.getCell(`H${rowNumber}`))

    worksheet.getCell(`E${rowNumber}`).numFmt = CLP_FORMAT
    worksheet.getCell(`F${rowNumber}`).numFmt = CLP_FORMAT
  })
}

const clearUnusedItemRows = (worksheet, itemCount) => {
  const firstUnusedRow = TEMPLATE_ITEM_START_ROW + itemCount

  if (firstUnusedRow > TEMPLATE_ITEM_END_ROW) return

  for (let rowNumber = firstUnusedRow; rowNumber <= TEMPLATE_ITEM_END_ROW; rowNumber += 1) {
    copyRowStyle(worksheet, TEMPLATE_ITEM_START_ROW, rowNumber)
    mergeItemRow(worksheet, rowNumber)

    worksheet.getRow(rowNumber).height = worksheet.getRow(TEMPLATE_ITEM_START_ROW).height
    worksheet.getCell(`A${rowNumber}`).value = null
    worksheet.getCell(`B${rowNumber}`).value = null
    worksheet.getCell(`E${rowNumber}`).value = null
    worksheet.getCell(`F${rowNumber}`).value = null
    worksheet.getCell(`H${rowNumber}`).value = null

    setWrapText(worksheet.getCell(`B${rowNumber}`))
    setWrapText(worksheet.getCell(`H${rowNumber}`))
  }
}

const findRowByColumnValue = (worksheet, column, value) => {
  const expectedValue = String(value).trim().toUpperCase()

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const cellValue = worksheet.getCell(`${column}${rowNumber}`).value

    if (
      String(cellValue || '')
        .trim()
        .toUpperCase() === expectedValue
    ) {
      return rowNumber
    }
  }

  return null
}

const writeTotalCell = (worksheet, rowNumber, value) => {
  if (!rowNumber) return

  worksheet.getCell(`F${rowNumber}`).value = value
  worksheet.getCell(`F${rowNumber}`).numFmt = CLP_FORMAT
  setCellAlignment(worksheet.getCell(`F${rowNumber}`), {
    horizontal: 'right',
    vertical: 'middle',
    wrapText: true,
  })
}

const writeTotals = (worksheet, quotePayload) => {
  const net =
    quotePayload.amounts?.net ??
    quotePayload.quoteItems.reduce((total, item) => total + getItemTotal(item), 0)
  const iva = quotePayload.amounts?.iva ?? net * 0.19
  const total = quotePayload.amounts?.total ?? net + iva

  const netRow = findRowByColumnValue(worksheet, 'E', TOTAL_LABELS.net)
  const ivaRow = findRowByColumnValue(worksheet, 'E', TOTAL_LABELS.iva)
  const totalRow = findRowByColumnValue(worksheet, 'E', TOTAL_LABELS.total)

  writeTotalCell(worksheet, netRow, net)
  writeTotalCell(worksheet, ivaRow, iva)
  writeTotalCell(worksheet, totalRow, total)
}

const getSafeQuoteNumber = (quoteNumber) =>
  String(quoteNumber || '8103')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')

export const populateQuoteWorkbook = (workbook, quotePayload) => {
  const worksheet = workbook.getWorksheet('Cotizacion Rubik') || workbook.worksheets[0]
  const quoteItems = quotePayload.quoteItems || []

  applyPrintSetup(worksheet)
  normalizeItemRows(worksheet, quoteItems.length)
  writeCompanyClientAndQuoteData(worksheet, quotePayload)
  writeItems(worksheet, quoteItems)
  clearUnusedItemRows(worksheet, quoteItems.length)
  writeTotals(worksheet, quotePayload)

  // Reaplicar después de insertar filas, para que el área de impresión quede bien.
  applyPrintSetup(worksheet)

  workbook.calcProperties.fullCalcOnLoad = true
}

export const exportQuoteToExcel = async (quotePayload) => {
  const response = await fetch('/templates/cotizacion-rubik.xlsx')

  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla Excel de cotización.')
  }

  const templateBuffer = await response.arrayBuffer()
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(templateBuffer)

  populateQuoteWorkbook(workbook, quotePayload)

  const outputBuffer = await workbook.xlsx.writeBuffer()
  const quoteNumber = getSafeQuoteNumber(quotePayload.quote.quoteNumber)
  const fileName = `Cotizacion-Rubik-${quoteNumber}.xlsx`

  saveAs(
    new Blob([outputBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName,
  )
}