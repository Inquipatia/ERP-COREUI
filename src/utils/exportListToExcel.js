import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const sanitizeFileName = (value) =>
  String(value || 'reporte')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')

const sanitizeSheetName = (value) =>
  String(value || 'Listado')
    .trim()
    .replace(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31)

const formatDateTime = () =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date())

const getColumnLetter = (columnNumber) => {
  let dividend = columnNumber
  let columnName = ''

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26
    columnName = String.fromCharCode(65 + modulo) + columnName
    dividend = Math.floor((dividend - modulo) / 26)
  }

  return columnName || 'A'
}

const getCellValue = (row, column) => {
  if (typeof column.value === 'function') {
    return column.value(row)
  }

  return row?.[column.key] ?? ''
}

export const exportListToExcel = async ({
  fileName = 'Listado-ERP',
  sheetName = 'Listado',
  title = 'Listado ERP',
  columns = [],
  rows = [],
  summary = [],
}) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName))
  const safeColumns = columns.length > 0 ? columns : [{ header: 'Dato', key: 'dato', width: 20 }]
  const lastColumn = getColumnLetter(safeColumns.length)

  workbook.creator = 'Rubik Creaciones'
  workbook.created = new Date()

  worksheet.mergeCells(`A1:${lastColumn}1`)
  worksheet.getCell('A1').value = title
  worksheet.getCell('A1').font = {
    bold: true,
    size: 16,
  }
  worksheet.getCell('A1').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }

  worksheet.mergeCells(`A2:${lastColumn}2`)
  worksheet.getCell('A2').value = `Generado: ${formatDateTime()}`
  worksheet.getCell('A2').alignment = {
    horizontal: 'center',
    vertical: 'middle',
  }

  let currentRow = 4

  if (summary.length > 0) {
    summary.forEach((item) => {
      worksheet.getCell(`A${currentRow}`).value = item.label
      worksheet.getCell(`A${currentRow}`).font = { bold: true }
      worksheet.getCell(`B${currentRow}`).value = item.value
      currentRow += 1
    })

    currentRow += 1
  }

  const headerRowNumber = currentRow
  const headerRow = worksheet.getRow(headerRowNumber)

  safeColumns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
  })

  headerRow.height = 24

  rows.forEach((row) => {
    const excelRow = worksheet.addRow(safeColumns.map((column) => getCellValue(row, column)))

    excelRow.eachCell((cell) => {
      cell.alignment = {
        vertical: 'top',
        wrapText: true,
      }
    })
  })

  safeColumns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1)
    excelColumn.width = column.width || 18

    if (column.numFmt) {
      excelColumn.numFmt = column.numFmt
    }
  })

  worksheet.autoFilter = {
    from: {
      row: headerRowNumber,
      column: 1,
    },
    to: {
      row: headerRowNumber,
      column: safeColumns.length,
    },
  }

  worksheet.views = [
    {
      state: 'frozen',
      ySplit: headerRowNumber,
      showGridLines: false,
    },
  ]

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  }

  const buffer = await workbook.xlsx.writeBuffer()

  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${sanitizeFileName(fileName)}.xlsx`,
  )
}