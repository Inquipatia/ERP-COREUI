const PDF_API_URL =
  import.meta.env.VITE_RUBIK_PDF_API_URL ||
  (!import.meta.env.PROD ? 'http://localhost:4000/export-pdf' : '')

const PRINT_FALLBACK_MESSAGE =
  'Servicio PDF no disponible. Se abrio una version imprimible para guardar como PDF.'

const PDF_REQUEST_TIMEOUT_MS = 12000

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    currency: 'CLP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(Number(value) || 0)

const escapeHtml = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getFileName = (quoteData) => {
  const quoteNumber =
    quoteData?.quote?.quoteNumber ||
    quoteData?.quoteData?.quoteNumber ||
    quoteData?.quoteNumber ||
    '8103'

  return `Cotizacion-Rubik-${quoteNumber}.pdf`
}

const getItemQuantity = (item) => Number(item?.quantity ?? item?.cantidad ?? 0) || 0

const getItemUnitValue = (item) =>
  Number(item?.unitValue ?? item?.unitPrice ?? item?.valorUnitario ?? item?.price ?? 0) || 0

const getItemTotal = (item) =>
  Number(item?.total ?? item?.totalValue ?? item?.valorTotal ?? getItemQuantity(item) * getItemUnitValue(item)) || 0

const getQuoteItems = (quoteData) =>
  Array.isArray(quoteData?.quoteItems)
    ? quoteData.quoteItems
    : Array.isArray(quoteData?.items)
      ? quoteData.items
      : []

const getQuoteAmounts = (quoteData) => {
  const items = getQuoteItems(quoteData)
  const net = Number(quoteData?.amounts?.net ?? quoteData?.net ?? items.reduce((sum, item) => sum + getItemTotal(item), 0)) || 0
  const iva =
    Number(quoteData?.amounts?.iva ?? quoteData?.iva ?? quoteData?.taxAmount) ||
    net * (Number(quoteData?.quote?.ivaRate ?? 19) / 100)
  const total = Number(quoteData?.amounts?.total ?? quoteData?.total ?? quoteData?.totalAmount) || net + iva

  return { iva, net, total }
}

const getItemDescription = (item) =>
  item?.description || item?.descripcion || item?.technicalDescription || item?.name || ''

const getItemObservations = (item) => item?.observations || item?.observaciones || item?.notes || ''

const buildPrintableQuoteHtml = (quoteData) => {
  const company = quoteData?.company || {}
  const seller = quoteData?.seller || {}
  const client = quoteData?.client || {}
  const quote = quoteData?.quote || quoteData?.quoteData || {}
  const items = getQuoteItems(quoteData)
  const amounts = getQuoteAmounts(quoteData)
  const quoteNumber = quote.quoteNumber || quoteData?.quoteNumber || ''

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td class="number">${escapeHtml(getItemQuantity(item))}</td>
          <td>${escapeHtml(getItemDescription(item)).replace(/\n/g, '<br />')}</td>
          <td class="money">${formatCurrency(getItemUnitValue(item))}</td>
          <td class="money">${formatCurrency(getItemTotal(item))}</td>
          <td>${escapeHtml(getItemObservations(item)).replace(/\n/g, '<br />')}</td>
        </tr>
      `,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Cotizacion Rubik ${escapeHtml(quoteNumber)}</title>
    <style>
      @page { margin: 14mm; size: A4 portrait; }
      * { box-sizing: border-box; }
      body {
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
      }
      h1, h2, h3 { margin: 0; }
      .document { width: 100%; }
      .header {
        align-items: flex-start;
        border-bottom: 2px solid #111827;
        display: flex;
        justify-content: space-between;
        margin-bottom: 18px;
        padding-bottom: 12px;
        gap: 24px;
      }
      .brand { text-align: right; }
      .title { font-size: 22px; }
      .muted { color: #4b5563; }
      .grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-bottom: 18px;
      }
      .box {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 12px;
      }
      .box h3 {
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
        margin-bottom: 8px;
        padding-bottom: 6px;
      }
      .line { margin: 3px 0; }
      table {
        border-collapse: collapse;
        page-break-inside: auto;
        width: 100%;
      }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 7px;
        vertical-align: top;
      }
      th {
        background: #111827;
        color: #ffffff;
        font-size: 11px;
        text-align: left;
      }
      .number { text-align: center; width: 64px; }
      .money { text-align: right; white-space: nowrap; width: 110px; }
      .totals {
        display: flex;
        justify-content: flex-end;
        margin-top: 14px;
      }
      .totals table { max-width: 320px; }
      .totals td:first-child { font-weight: 700; }
      .footer {
        border-top: 1px solid #d1d5db;
        color: #4b5563;
        margin-top: 24px;
        padding-top: 10px;
      }
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <main class="document">
      <section class="header">
        <div>
          <h1 class="title">Cotizacion #${escapeHtml(quoteNumber)}</h1>
          <div class="muted">Fecha: ${escapeHtml(quote.date || quote.fecha || '')}</div>
          <div class="muted">Tema: ${escapeHtml(quote.subject || quote.tema || '')}</div>
          <div class="muted">Condicion: ${escapeHtml(quote.condition || quote.condicion || '')}</div>
        </div>
        <div class="brand">
          <h2>${escapeHtml(company.businessName || 'Rubik Creaciones SPA')}</h2>
          <div>RUT: ${escapeHtml(company.rut || '')}</div>
          <div>${escapeHtml(company.address || '')}</div>
          <div>${escapeHtml(company.email || '')}</div>
          <div>${escapeHtml(company.phone || '')}</div>
        </div>
      </section>

      <section class="grid">
        <div class="box">
          <h3>Cliente</h3>
          <div class="line"><strong>Cliente:</strong> ${escapeHtml(client.client || client.contact || '')}</div>
          <div class="line"><strong>Empresa:</strong> ${escapeHtml(client.company || '')}</div>
          <div class="line"><strong>Atencion:</strong> ${escapeHtml(client.attention || '')}</div>
          <div class="line"><strong>RUT:</strong> ${escapeHtml(client.rut || '')}</div>
          <div class="line"><strong>Telefono:</strong> ${escapeHtml(client.phone || '')}</div>
          <div class="line"><strong>Email:</strong> ${escapeHtml(client.email || '')}</div>
          <div class="line"><strong>Comuna:</strong> ${escapeHtml(client.comuna || client.commune || '')}</div>
          <div class="line"><strong>Direccion:</strong> ${escapeHtml(client.address || '')}</div>
        </div>
        <div class="box">
          <h3>Vendedor</h3>
          <div class="line"><strong>Nombre:</strong> ${escapeHtml(seller.name || '')}</div>
          <div class="line"><strong>Email:</strong> ${escapeHtml(seller.email || '')}</div>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Cantidad</th>
            <th>Descripcion tecnica del producto / servicio</th>
            <th>Valor unitario</th>
            <th>Valor total</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || '<tr><td colspan="5">Sin items.</td></tr>'}
        </tbody>
      </table>

      <section class="totals">
        <table>
          <tbody>
            <tr><td>Neto</td><td class="money">${formatCurrency(amounts.net)}</td></tr>
            <tr><td>IVA ${escapeHtml(quote.ivaRate || 19)}%</td><td class="money">${formatCurrency(amounts.iva)}</td></tr>
            <tr><td>Total</td><td class="money">${formatCurrency(amounts.total)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="footer">
        Documento generado desde ERP Rubik. Si el servicio PDF no esta disponible, use esta vista para guardar como PDF desde el navegador.
      </section>
    </main>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 250);
      });
    </script>
  </body>
</html>`
}

const openPrintableFallback = (quoteData) => {
  if (typeof window === 'undefined') {
    throw new Error(PRINT_FALLBACK_MESSAGE)
  }

  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error(`${PRINT_FALLBACK_MESSAGE} Permite ventanas emergentes para continuar.`)
  }

  printWindow.document.open()
  printWindow.document.write(buildPrintableQuoteHtml(quoteData))
  printWindow.document.close()

  return {
    fallback: 'print',
    message: PRINT_FALLBACK_MESSAGE,
    ok: true,
  }
}

const downloadPdfBlob = async (response, quoteData) => {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = getFileName(quoteData)
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(url)

  return { fallback: null, ok: true }
}

export const exportQuoteToPdf = async (quoteData) => {
  if (!PDF_API_URL) {
    return openPrintableFallback(quoteData)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), PDF_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(PDF_API_URL, {
      body: JSON.stringify(quoteData),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null)

      if (data?.fallback === 'print') {
        return openPrintableFallback(quoteData)
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'No se pudo exportar la cotizacion a PDF.')
      }
    }

    if (!response.ok) {
      throw new Error('No se pudo exportar la cotizacion a PDF.')
    }

    return downloadPdfBlob(response, quoteData)
  } catch (error) {
    console.error('PDF API unavailable, using printable fallback:', error)
    return openPrintableFallback(quoteData)
  } finally {
    window.clearTimeout(timeoutId)
  }
}
