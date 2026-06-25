const RUBIK_COMPANY = {
  businessName: 'Rubik Creaciones SPA',
  rut: '77.589.233-1',
  phone: '93535395',
  email: 'contacto@rubikcreaciones.cl',
  address: 'Rubik Creaciones SPA',
  tagline: 'El equipo que concreta tus ideas',
}

const escapeHtml = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getNumberValue = (value) => {
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
  new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Math.round(getNumberValue(value)))

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

const getQuoteNumber = (quote = {}) =>
  quote.quoteNumber || quote.numeroCotizacion || quote.numero || quote.number || 'sin-numero'

const getItems = (quote = {}) => {
  if (Array.isArray(quote.items)) return quote.items
  if (Array.isArray(quote.quoteItems)) return quote.quoteItems
  return []
}

const getItemQuantity = (item = {}) =>
  getNumberValue(item.quantity ?? item.cantidad ?? item.qty)

const getItemUnitValue = (item = {}) =>
  getNumberValue(item.unitValue ?? item.valorUnitario ?? item.unitPrice ?? item.price)

const getItemTotal = (item = {}) => {
  const explicitTotal = item.total ?? item.totalValue ?? item.valorTotal
  if (explicitTotal !== undefined && explicitTotal !== null && explicitTotal !== '') {
    return getNumberValue(explicitTotal)
  }

  return getItemQuantity(item) * getItemUnitValue(item)
}

const getItemDescription = (item = {}) =>
  item.description || item.descripcion || item.technicalDescription || item.name || ''

const getComputedTotals = (quote = {}) => {
  const items = getItems(quote)
  const calculatedNet = items.reduce((sum, item) => sum + getItemTotal(item), 0)
  const netAmount = getNumberValue(quote.netAmount ?? quote.neto ?? quote.amounts?.net ?? calculatedNet)
  const taxAmount = getNumberValue(quote.taxAmount ?? quote.iva ?? quote.amounts?.iva ?? Math.round(netAmount * 0.19))
  const totalAmount = getNumberValue(quote.totalAmount ?? quote.total ?? quote.amounts?.total ?? netAmount + taxAmount)

  return { netAmount, taxAmount, totalAmount }
}

const renderInfoRow = (label, value) => `
  <div class="info-row">
    <span class="info-label">${escapeHtml(label)}</span>
    <span class="info-value">${escapeHtml(value || '-')}</span>
  </div>
`

const renderItems = (items) => {
  if (!items.length) {
    return `
      <tr>
        <td colspan="4" class="empty-row">Sin items ingresados.</td>
      </tr>
    `
  }

  return items
    .map(
      (item) => `
        <tr>
          <td class="qty">${escapeHtml(getItemQuantity(item) || '')}</td>
          <td class="description">${escapeHtml(getItemDescription(item))}</td>
          <td class="money">${escapeHtml(formatCurrency(getItemUnitValue(item)))}</td>
          <td class="money">${escapeHtml(formatCurrency(getItemTotal(item)))}</td>
        </tr>
      `,
    )
    .join('')
}

const renderCotizacionHTML = (quote = {}) => {
  const quoteNumber = getQuoteNumber(quote)
  const items = getItems(quote)
  const { netAmount, taxAmount, totalAmount } = getComputedTotals(quote)
  const observations = quote.observations || quote.observaciones || ''

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cotizacion Rubik ${escapeHtml(quoteNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    .document {
      width: 100%;
    }

    .header {
      align-items: flex-start;
      border-bottom: 3px solid #1d4ed8;
      display: flex;
      justify-content: space-between;
      padding-bottom: 14px;
    }

    .brand {
      max-width: 58%;
    }

    .logo-text {
      color: #111827;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
      line-height: 1;
      text-transform: uppercase;
    }

    .tagline {
      color: #6d28d9;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }

    .company-lines {
      color: #374151;
      margin-top: 10px;
    }

    .quote-box {
      border: 1px solid #c7d2fe;
      min-width: 210px;
      text-align: right;
    }

    .quote-title {
      background: #1d4ed8;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 9px 12px;
      text-transform: uppercase;
    }

    .quote-meta {
      padding: 10px 12px;
    }

    .quote-meta strong {
      display: inline-block;
      min-width: 64px;
    }

    .section {
      margin-top: 16px;
    }

    .section-title {
      background: #eef2ff;
      border-left: 5px solid #6d28d9;
      color: #111827;
      font-size: 12px;
      font-weight: 800;
      padding: 7px 10px;
      text-transform: uppercase;
    }

    .info-grid {
      border: 1px solid #d1d5db;
      border-top: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .info-row {
      border-top: 1px solid #e5e7eb;
      display: grid;
      grid-template-columns: 92px 1fr;
      min-height: 28px;
    }

    .info-row:nth-child(1),
    .info-row:nth-child(2) {
      border-top: 0;
    }

    .info-row:nth-child(odd) {
      border-right: 1px solid #e5e7eb;
    }

    .info-label {
      background: #f9fafb;
      color: #374151;
      font-weight: 700;
      padding: 7px 8px;
    }

    .info-value {
      padding: 7px 8px;
      word-break: break-word;
    }

    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      background: #111827;
      border: 1px solid #111827;
      color: #ffffff;
      font-size: 10px;
      padding: 8px 7px;
      text-align: left;
      text-transform: uppercase;
    }

    td {
      border: 1px solid #d1d5db;
      padding: 8px 7px;
      vertical-align: top;
    }

    .qty {
      text-align: center;
      width: 12%;
    }

    .description {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      width: 48%;
      word-break: break-word;
    }

    .money {
      text-align: right;
      white-space: nowrap;
      width: 20%;
    }

    .empty-row {
      color: #6b7280;
      padding: 14px;
      text-align: center;
    }

    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .totals {
      border: 1px solid #111827;
      min-width: 240px;
    }

    .total-row {
      display: grid;
      grid-template-columns: 1fr 110px;
    }

    .total-row span {
      border-bottom: 1px solid #d1d5db;
      padding: 8px 10px;
    }

    .total-row:last-child span {
      border-bottom: 0;
    }

    .total-label {
      background: #f9fafb;
      font-weight: 800;
      text-transform: uppercase;
    }

    .total-value {
      text-align: right;
    }

    .grand-total .total-label,
    .grand-total .total-value {
      background: #1d4ed8;
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }

    .note-box {
      border: 1px solid #d1d5db;
      min-height: 54px;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .transfer {
      border: 1px solid #d1d5db;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .transfer div {
      border-top: 1px solid #e5e7eb;
      padding: 7px 9px;
    }

    .transfer div:nth-child(1),
    .transfer div:nth-child(2) {
      border-top: 0;
    }

    .transfer div:nth-child(odd) {
      border-right: 1px solid #e5e7eb;
    }

    .commercial-notes {
      color: #374151;
      margin: 10px 0 0;
      padding-left: 17px;
    }

    .footer {
      border-top: 1px solid #d1d5db;
      color: #4b5563;
      font-size: 10px;
      margin-top: 18px;
      padding-top: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        <div class="logo-text">RUBIK CREACIONES</div>
        <div class="tagline">${escapeHtml(RUBIK_COMPANY.tagline)}</div>
        <div class="company-lines">
          <div>${escapeHtml(RUBIK_COMPANY.businessName)}</div>
          <div>RUT: ${escapeHtml(RUBIK_COMPANY.rut)}</div>
          <div>${escapeHtml(RUBIK_COMPANY.address)} · Tel: ${escapeHtml(RUBIK_COMPANY.phone)}</div>
          <div>${escapeHtml(RUBIK_COMPANY.email)}</div>
        </div>
      </div>

      <aside class="quote-box">
        <div class="quote-title">Cotización</div>
        <div class="quote-meta">
          <div><strong>N°:</strong> ${escapeHtml(quoteNumber)}</div>
          <div><strong>Fecha:</strong> ${escapeHtml(formatDate(quote.date || quote.fecha))}</div>
        </div>
      </aside>
    </header>

    <section class="section">
      <div class="section-title">Datos del cliente</div>
      <div class="info-grid">
        ${renderInfoRow('Cliente', quote.client || quote.cliente)}
        ${renderInfoRow('Empresa', quote.company || quote.empresa)}
        ${renderInfoRow('RUT', quote.rut || quote.rutCliente)}
        ${renderInfoRow('Teléfono', quote.phone || quote.telefono)}
        ${renderInfoRow('Comuna', quote.commune || quote.comuna)}
        ${renderInfoRow('Contacto', quote.contact || quote.atencion || quote.attention)}
        ${renderInfoRow('Condición', quote.condition || quote.condicion)}
        ${renderInfoRow('Vendedor', quote.seller || quote.vendedor)}
      </div>
    </section>

    <section class="section">
      <div class="section-title">Tema</div>
      <div class="note-box">${escapeHtml(quote.subject || quote.tema || '-')}</div>
    </section>

    <section class="section">
      <table>
        <thead>
          <tr>
            <th style="width: 12%; text-align: center;">Cantidad</th>
            <th style="width: 48%;">Descripción técnica del producto / servicio</th>
            <th style="width: 20%; text-align: right;">Valor unitario</th>
            <th style="width: 20%; text-align: right;">Valor total</th>
          </tr>
        </thead>
        <tbody>
          ${renderItems(items)}
        </tbody>
      </table>
    </section>

    <section class="totals-wrap">
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Neto</span>
          <span class="total-value">${escapeHtml(formatCurrency(netAmount))}</span>
        </div>
        <div class="total-row">
          <span class="total-label">IVA 19%</span>
          <span class="total-value">${escapeHtml(formatCurrency(taxAmount))}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">Total</span>
          <span class="total-value">${escapeHtml(formatCurrency(totalAmount))}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Observaciones</div>
      <div class="note-box">${escapeHtml(observations || 'Sin observaciones adicionales.')}</div>
    </section>

    <section class="section">
      <div class="section-title">Datos de transferencia</div>
      <div class="transfer">
        <div><strong>Titular:</strong> ${escapeHtml(RUBIK_COMPANY.businessName)}</div>
        <div><strong>RUT:</strong> ${escapeHtml(RUBIK_COMPANY.rut)}</div>
        <div><strong>Email:</strong> ${escapeHtml(RUBIK_COMPANY.email)}</div>
        <div><strong>Banco:</strong> Banco BCI</div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Notas comerciales</div>
      <ul class="commercial-notes">
        <li>Valores expresados en pesos chilenos.</li>
        <li>Validez de la cotización sujeta a disponibilidad de materiales y condiciones comerciales vigentes.</li>
        <li>Producción inicia una vez aprobada la cotización y confirmadas las condiciones de pago.</li>
      </ul>
    </section>

    <footer class="footer">
      ${escapeHtml(RUBIK_COMPANY.businessName)} · ${escapeHtml(RUBIK_COMPANY.email)} · ${escapeHtml(RUBIK_COMPANY.phone)}
    </footer>
  </main>
</body>
</html>`
}

module.exports = {
  renderCotizacionHTML,
}
