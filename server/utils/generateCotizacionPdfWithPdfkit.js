const fs = require('node:fs')
const path = require('node:path')
const PDFDocument = require('pdfkit')

const COLORS = {
  blue: '#201579',
  border: '#6D5CFF',
  header: '#E80F7A',
  lightPink: '#FCE8F4',
  text: '#182033',
  muted: '#5F53CF',
  softGray: '#F7F7FB',
  white: '#FFFFFF',
}

const COMPANY = {
  address: 'Rubik Creaciones SPA',
  phone: '93535395',
  email: 'e.rubikcreaciones@gmail.com',
  rut: '77.589.233-1',
  bank: 'Banco BCI - CTA. CORRIENTE 63730588',
  transferContact: 'RUT 77.589.233-1 - contacto@rubikcreaciones.cl',
  website: 'www.rubikcreaciones.cl',
}

const projectRoot = path.join(__dirname, '..', '..')

const logoCandidates = [
  path.join(projectRoot, 'public', 'templates', 'rubik-logo.png'),
  path.join(projectRoot, 'public', 'logo.png'),
  path.join(projectRoot, 'src', 'assets', 'brand', 'rubik-logo.png'),
]

const safeText = (value = '') => String(value ?? '').trim()

const numberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0

  const parsed = Number(
    String(value)
      .replace(/\s/g, '')
      .replace(/\$/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  )

  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrency = (value) =>
  `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(numberValue(value)))}`

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return safeText(value)

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

const getQuoteNumber = (quote = {}) =>
  safeText(quote.quoteNumber || quote.numeroCotizacion || quote.numero || quote.number || 'sin-numero')

const getItems = (quote = {}) => {
  if (Array.isArray(quote.items)) return quote.items
  if (Array.isArray(quote.quoteItems)) return quote.quoteItems
  return []
}

const itemQuantity = (item = {}) => numberValue(item.quantity ?? item.cantidad ?? item.qty)

const itemUnitValue = (item = {}) =>
  numberValue(item.unitValue ?? item.valorUnitario ?? item.unitPrice ?? item.price)

const itemDescription = (item = {}) =>
  safeText(item.description || item.descripcion || item.technicalDescription || item.name || '')

const itemObservations = (item = {}) =>
  safeText(item.observations || item.observaciones || item.notes || '')

const itemTotal = (item = {}) => {
  const explicitTotal = item.total ?? item.totalValue ?? item.valorTotal
  if (explicitTotal !== undefined && explicitTotal !== null && explicitTotal !== '') {
    return numberValue(explicitTotal)
  }

  return itemQuantity(item) * itemUnitValue(item)
}

const getTotals = (quote = {}) => {
  const items = getItems(quote)
  const calculatedNet = items.reduce((sum, item) => sum + itemTotal(item), 0)

  const netAmount = numberValue(quote.netAmount ?? quote.neto ?? quote.amounts?.net ?? calculatedNet)
  const taxAmount = numberValue(quote.taxAmount ?? quote.iva ?? quote.amounts?.iva ?? Math.round(netAmount * 0.19))
  const totalAmount = numberValue(quote.totalAmount ?? quote.total ?? quote.amounts?.total ?? netAmount + taxAmount)

  return { netAmount, taxAmount, totalAmount }
}

const findLogoPath = () => logoCandidates.find((candidate) => fs.existsSync(candidate))

const rect = (doc, x, y, width, height, options = {}) => {
  doc.save()

  if (options.fill) {
    doc.rect(x, y, width, height).fill(options.fill)
  }

  if (options.stroke) {
    doc
      .lineWidth(options.lineWidth || 0.6)
      .strokeColor(options.stroke)
      .rect(x, y, width, height)
      .stroke()
  }

  doc.restore()
}

const text = (doc, value, x, y, options = {}) => {
  doc
    .fillColor(options.color || COLORS.text)
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 9)
    .text(safeText(value), x, y, {
      width: options.width,
      height: options.height,
      align: options.align || 'left',
      lineGap: options.lineGap || 0,
    })
}

const centerText = (doc, value, x, y, width, options = {}) =>
  text(doc, value, x, y, { ...options, align: 'center', width })

const rightText = (doc, value, x, y, width, options = {}) =>
  text(doc, value, x, y, { ...options, align: 'right', width })

const drawFallbackLogo = (doc, x, y, width) => {
  centerText(doc, 'R U B I K', x, y, width, {
    color: COLORS.header,
    size: 36,
    bold: true,
  })

  centerText(doc, 'C R E A C I O N E S', x, y + 38, width, {
    color: COLORS.blue,
    size: 14,
    bold: true,
  })

  centerText(doc, 'IMPRESIÓN - VOLUMÉTRICOS - STANDS - NEONFLEX Y MÁS', x, y + 62, width, {
    color: COLORS.header,
    size: 8,
    bold: true,
  })
}

const drawLabelValueRow = (doc, x, y, labelWidth, valueWidth, rowHeight, label, value) => {
  rect(doc, x, y, labelWidth, rowHeight, { fill: COLORS.softGray, stroke: COLORS.border })
  rect(doc, x + labelWidth, y, valueWidth, rowHeight, { fill: COLORS.white, stroke: COLORS.border })

  text(doc, label, x + 4, y + 6, {
    bold: true,
    color: COLORS.blue,
    size: 8,
    width: labelWidth - 8,
  })

  centerText(doc, value, x + labelWidth + 4, y + 6, valueWidth - 8, {
    color: COLORS.text,
    size: 8.5,
  })
}

const drawHeader = (doc, quote) => {
  const logoPath = findLogoPath()

  const leftX = 24
  const topY = 24
  const leftWidth = 426
  const rightX = 450
  const rightWidth = 368
  const rowHeight = 20

  if (logoPath) {
    try {
      doc.image(logoPath, leftX + 58, topY + 2, {
        fit: [280, 88],
        align: 'center',
        valign: 'center',
      })
    } catch (_error) {
      drawFallbackLogo(doc, leftX + 34, topY, 330)
    }
  } else {
    drawFallbackLogo(doc, leftX + 34, topY, 330)
  }

  rect(doc, rightX, topY, rightWidth, 72, {
    fill: COLORS.lightPink,
    stroke: COLORS.border,
    lineWidth: 0.8,
  })

  centerText(doc, 'COTIZACIÓN', rightX, topY + 18, rightWidth, {
    bold: true,
    color: COLORS.blue,
    size: 21,
  })

  centerText(doc, `RUT: ${COMPANY.rut}`, rightX, topY + 55, rightWidth, {
    bold: true,
    color: COLORS.blue,
    size: 13,
  })

  const leftLabel = 108
  const rightLabel = 88
  const valueLeft = leftWidth - leftLabel
  const valueRight = rightWidth - rightLabel
  const baseY = 124

  drawLabelValueRow(doc, leftX, baseY, leftLabel, valueLeft, rowHeight, 'DIRECCIÓN', COMPANY.address)
  drawLabelValueRow(doc, leftX, baseY + rowHeight, leftLabel, valueLeft, rowHeight, 'TELÉFONO', COMPANY.phone)
  drawLabelValueRow(doc, leftX, baseY + rowHeight * 2, leftLabel, valueLeft, rowHeight, 'EMAIL', COMPANY.email)
  drawLabelValueRow(doc, leftX, baseY + rowHeight * 3, leftLabel, valueLeft, rowHeight, 'CLIENTE', quote.client || quote.cliente)
  drawLabelValueRow(doc, leftX, baseY + rowHeight * 4, leftLabel, valueLeft, rowHeight, 'EMPRESA', quote.company || quote.empresa)
  drawLabelValueRow(doc, leftX, baseY + rowHeight * 5, leftLabel, valueLeft, rowHeight, 'ATENCIÓN', quote.contact || quote.atencion)
  drawLabelValueRow(doc, leftX, baseY + rowHeight * 6, leftLabel, valueLeft, rowHeight, 'TEMA', quote.subject || quote.tema)

  drawLabelValueRow(doc, rightX, baseY, rightLabel, valueRight, rowHeight, 'N° COTIZACIÓN', getQuoteNumber(quote))
  drawLabelValueRow(doc, rightX, baseY + rowHeight, rightLabel, valueRight, rowHeight, 'FECHA', formatDate(quote.date || quote.fecha))
  drawLabelValueRow(doc, rightX, baseY + rowHeight * 2, rightLabel, valueRight, rowHeight, 'VENDEDOR', quote.seller || quote.vendedor)
  drawLabelValueRow(doc, rightX, baseY + rowHeight * 3, rightLabel, valueRight, rowHeight, 'RUT CLIENTE', quote.rut || quote.rutCliente)
  drawLabelValueRow(doc, rightX, baseY + rowHeight * 4, rightLabel, valueRight, rowHeight, 'TELÉFONO', quote.phone || quote.telefono)
  drawLabelValueRow(doc, rightX, baseY + rowHeight * 5, rightLabel, valueRight, rowHeight, 'COMUNA', quote.commune || quote.comuna)
  drawLabelValueRow(doc, rightX, baseY + rowHeight * 6, rightLabel, valueRight, rowHeight, 'CONDICIÓN', quote.condition || quote.condicion)

  rect(doc, leftX, baseY + rowHeight * 7, leftWidth + rightWidth, 48, {
    fill: COLORS.lightPink,
    stroke: COLORS.border,
  })

  centerText(doc, 'Cotización según solicitud', leftX, baseY + rowHeight * 7 + 16, leftWidth + rightWidth, {
    bold: true,
    color: COLORS.blue,
    size: 15,
  })
}

const table = {
  x: 24,
  y: 332,
  widths: [78, 394, 98, 114, 110],
  headerHeight: 24,
  minRowHeight: 22,
}

const tableWidth = table.widths.reduce((sum, width) => sum + width, 0)

const drawTableHeader = (doc, y) => {
  const headers = [
    'Cantidad',
    'Descripción técnica del producto / servicio',
    'Valor Unitario',
    'Valor Total',
    'Observaciones',
  ]

  let x = table.x

  headers.forEach((header, index) => {
    const width = table.widths[index]

    rect(doc, x, y, width, table.headerHeight, {
      fill: COLORS.header,
      stroke: COLORS.border,
    })

    centerText(doc, header, x + 4, y + 7, width - 8, {
      bold: true,
      color: COLORS.white,
      size: 8.5,
    })

    x += width
  })
}

const getItemRowHeight = (doc, item) => {
  const descriptionHeight = doc.heightOfString(itemDescription(item), {
    width: table.widths[1] - 10,
    lineGap: 1,
  })

  const observationsHeight = doc.heightOfString(itemObservations(item), {
    width: table.widths[4] - 10,
    lineGap: 1,
  })

  return Math.max(table.minRowHeight, descriptionHeight + 12, observationsHeight + 12)
}

const drawItemRow = (doc, item, y, height) => {
  const values = [
    { value: itemQuantity(item) || '', align: 'center' },
    { value: itemDescription(item), align: 'left' },
    { value: formatCurrency(itemUnitValue(item)), align: 'right' },
    { value: formatCurrency(itemTotal(item)), align: 'right' },
    { value: itemObservations(item), align: 'left' },
  ]

  let x = table.x

  values.forEach((cell, index) => {
    const width = table.widths[index]

    rect(doc, x, y, width, height, {
      fill: COLORS.white,
      stroke: COLORS.border,
    })

    text(doc, cell.value, x + 5, y + 5, {
      align: cell.align,
      color: COLORS.text,
      size: 8.3,
      width: width - 10,
      height: height - 8,
      lineGap: 1,
    })

    x += width
  })
}

const addContinuationPage = (doc) => {
  doc.addPage({ size: 'A4', layout: 'landscape', margin: 24 })
  drawTableHeader(doc, 34)
  return 34 + table.headerHeight
}

const drawItemsTable = (doc, quote) => {
  const items = getItems(quote)
  const bottomLimit = doc.page.height - 38
  let y = table.y

  drawTableHeader(doc, y)
  y += table.headerHeight

  if (!items.length) {
    rect(doc, table.x, y, tableWidth, 30, {
      fill: COLORS.white,
      stroke: COLORS.border,
    })

    centerText(doc, 'Sin ítems ingresados.', table.x, y + 9, tableWidth, {
      color: COLORS.text,
      size: 9,
    })

    return y + 30
  }

  items.forEach((item) => {
    const rowHeight = getItemRowHeight(doc, item)

    if (y + rowHeight > bottomLimit) {
      y = addContinuationPage(doc)
    }

    drawItemRow(doc, item, y, rowHeight)
    y += rowHeight
  })

  return y
}

const ensureSpace = (doc, y, neededHeight) => {
  if (y + neededHeight <= doc.page.height - 28) return y

  doc.addPage({ size: 'A4', layout: 'landscape', margin: 24 })
  return 34
}

const drawBottomBlocks = (doc, quote, startY) => {
  const { netAmount, taxAmount, totalAmount } = getTotals(quote)

  let y = ensureSpace(doc, Math.max(startY + 10, 412), 145)

  const x = 24
  const transferWidth = 432
  const totalsX = x + transferWidth
  const totalsWidth = tableWidth - transferWidth
  const rowHeight = 27

  rect(doc, x, y, tableWidth, 20, {
    fill: COLORS.lightPink,
    stroke: COLORS.border,
  })

  y += 20

  rect(doc, x, y, transferWidth, rowHeight * 4, {
    fill: COLORS.white,
    stroke: COLORS.border,
  })

  centerText(doc, 'DATOS DE TRANSFERENCIA', x, y + 11, transferWidth, {
    bold: true,
    color: COLORS.blue,
    size: 11,
  })

  centerText(doc, COMPANY.bank, x, y + 39, transferWidth, {
    color: COLORS.muted,
    size: 10,
  })

  centerText(doc, COMPANY.transferContact, x, y + 64, transferWidth, {
    color: COLORS.muted,
    size: 10,
  })

  centerText(doc, COMPANY.website, x, y + 89, transferWidth, {
    color: COLORS.muted,
    size: 10,
  })

  const totalRows = [
    ['NETO', formatCurrency(netAmount), false],
    ['IVA 19%', formatCurrency(taxAmount), false],
    ['TOTAL', formatCurrency(totalAmount), true],
  ]

  totalRows.forEach(([label, value, highlight], index) => {
    const rowY = y + index * rowHeight

    rect(doc, totalsX, rowY, 88, rowHeight, {
      fill: highlight ? COLORS.lightPink : COLORS.softGray,
      stroke: COLORS.border,
    })

    rect(doc, totalsX + 88, rowY, totalsWidth - 88, rowHeight, {
      fill: highlight ? COLORS.lightPink : COLORS.white,
      stroke: COLORS.border,
    })

    text(doc, label, totalsX + 5, rowY + 8, {
      bold: true,
      color: COLORS.blue,
      size: highlight ? 12 : 10.5,
      width: 78,
    })

    rightText(doc, value, totalsX + 94, rowY + 8, totalsWidth - 100, {
      bold: true,
      color: COLORS.blue,
      size: highlight ? 12 : 10.5,
    })
  })

  y += rowHeight * 4
  y = ensureSpace(doc, y + 10, 78)

  rect(doc, x, y, tableWidth, 28, {
    fill: COLORS.lightPink,
    stroke: COLORS.border,
  })

  text(doc, 'Notas comerciales', x + 5, y + 8, {
    bold: true,
    color: COLORS.blue,
    size: 11,
    width: tableWidth - 10,
  })

  rect(doc, x, y + 28, tableWidth, 48, {
    fill: COLORS.white,
    stroke: COLORS.border,
  })

  text(
    doc,
    '• Valores incluyen IVA, salvo indicación contraria. • Plazo de entrega sujeto a aprobación de arte y disponibilidad de materiales. • Instalación/despacho se considera solo si está indicado en la descripción.',
    x + 6,
    y + 38,
    {
      color: COLORS.text,
      size: 9,
      width: tableWidth - 12,
      lineGap: 2,
    },
  )

  const observations = safeText(quote.observations || quote.observaciones)

  if (observations) {
    const obsY = ensureSpace(doc, y + 88, 62)

    rect(doc, x, obsY, tableWidth, 22, {
      fill: COLORS.lightPink,
      stroke: COLORS.border,
    })

    text(doc, 'Observaciones', x + 5, obsY + 7, {
      bold: true,
      color: COLORS.blue,
      size: 10,
    })

    rect(doc, x, obsY + 22, tableWidth, 40, {
      fill: COLORS.white,
      stroke: COLORS.border,
    })

    text(doc, observations, x + 6, obsY + 30, {
      color: COLORS.text,
      size: 8.8,
      width: tableWidth - 12,
      lineGap: 1,
    })
  }
}

const generateCotizacionPdfWithPdfkit = async (quote = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 24,
      bufferPages: false,
    })

    const chunks = []

    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    try {
      drawHeader(doc, quote)
      const tableEndY = drawItemsTable(doc, quote)
      drawBottomBlocks(doc, quote, tableEndY)
      doc.end()
    } catch (error) {
      reject(error)
    }
  })

module.exports = {
  generateCotizacionPdfWithPdfkit,
}