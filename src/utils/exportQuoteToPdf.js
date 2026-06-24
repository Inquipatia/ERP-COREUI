const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD
    ? 'https://api.rubikcreaciones.com/api'
    : 'http://localhost:4300/api')

const PDF_API_URL =
  import.meta.env.VITE_RUBIK_PDF_API_URL ||
  `${API_BASE_URL.replace(/\/$/, '')}/export/pdf`

const PRINT_FALLBACK_MESSAGE =
  'Servicio PDF no disponible. Se abrio una version imprimible para guardar como PDF.'

const PDF_REQUEST_TIMEOUT_MS = 12000
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PDF_CONTENT_TYPE = 'application/pdf'

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

const getFileName = (quoteData, extension = 'pdf') => {
  const quoteNumber =
    quoteData?.quote?.quoteNumber ||
    quoteData?.quoteData?.quoteNumber ||
    quoteData?.numero ||
    quoteData?.quoteNumber ||
    '8103'

  if (extension === 'pdf') {
    return `cotizacion-${quoteNumber}.pdf`
  }

  return `Cotizacion-Rubik-${quoteNumber}.${extension}`
}

const getFileExtensionFromContentType = (contentType = '') => {
  const normalizedContentType = contentType.toLowerCase()

  if (normalizedContentType.includes(XLSX_CONTENT_TYPE)) {
    return 'xlsx'
  }

  if (normalizedContentType.includes(PDF_CONTENT_TYPE)) {
    return 'pdf'
  }

  return 'xlsx'
}

const getFileNameFromContentDisposition = (contentDisposition = '') => {
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)

  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim())
  }

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)

  return match?.[1]?.trim() || ''
}

const ensureFileExtension = (fileName, extension) => {
  const safeExtension = extension.replace(/^\./, '')
  const normalizedFileName = String(fileName || '').trim()

  if (!normalizedFileName) {
    return ''
  }

  if (normalizedFileName.toLowerCase().endsWith(`.${safeExtension}`)) {
    return normalizedFileName
  }

  return normalizedFileName.replace(/\.(pdf|xlsx)$/i, '') + `.${safeExtension}`
}

const getDownloadFileName = (response, quoteData) => {
  const contentDisposition = response.headers.get('content-disposition') || ''
  const contentType = response.headers.get('content-type') || ''
  const headerFileName = getFileNameFromContentDisposition(contentDisposition)
  const extension = getFileExtensionFromContentType(contentType)

  if (headerFileName) {
    return ensureFileExtension(headerFileName, extension)
  }

  return getFileName(quoteData, extension)
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

const buildBackendPdfPayload = (quoteData) => {
  const company = quoteData?.company || {}
  const seller = quoteData?.seller || {}
  const client = quoteData?.client || {}
  const quote = quoteData?.quote || quoteData?.quoteData || {}
  const items = getQuoteItems(quoteData)
  const amounts = getQuoteAmounts(quoteData)
  const quoteNumber = quote.quoteNumber || quote.numero || quoteData?.numero || quoteData?.quoteNumber || '8103'

  return {
    ...quoteData,
    numero: quoteNumber,
    fecha: quote.date || quote.fecha || quoteData?.fecha || '',
    cliente: client.client || client.cliente || client.contact || quoteData?.cliente || '',
    rut: client.rut || client.rutCliente || quoteData?.rut || '',
    atencion: client.attention || client.atencion || quoteData?.atencion || '',
    telefono: client.phone || client.telefono || quoteData?.telefono || '',
    comuna: client.comuna || client.commune || quoteData?.comuna || '',
    condicion: quote.condition || quote.condicion || quoteData?.condicion || '',
    vendedor: seller.name || quote.vendedor || quoteData?.vendedor || '',
    observaciones: quote.observaciones || quoteData?.observaciones || '',
    items: items.map((item) => ({
      cantidad: getItemQuantity(item),
      descripcion: getItemDescription(item),
      valorUnitario: getItemUnitValue(item),
      total: getItemTotal(item),
      observaciones: getItemObservations(item),
    })),
    neto: amounts.net,
    iva: amounts.iva,
    total: amounts.total,
    company,
    seller,
    client,
    quote,
    quoteItems: items,
    amounts,
  }
}

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

const downloadQuoteBlob = async (response, quoteData) => {
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = getDownloadFileName(response, quoteData)
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.URL.revokeObjectURL(url)

  return {
    contentType: response.headers.get('content-type') || '',
    fallback: null,
    fileName: link.download,
    ok: true,
  }
}

export const exportQuoteToPdf = async (quoteData) => {
  const pdfPayload = buildBackendPdfPayload(quoteData)

  if (!PDF_API_URL) {
    return openPrintableFallback(pdfPayload)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), PDF_REQUEST_TIMEOUT_MS)

  try {
    console.log('PDF_API_URL USADA:', PDF_API_URL)
    console.log('PDF_PAYLOAD:', pdfPayload)

    const response = await fetch(PDF_API_URL, {
      body: JSON.stringify(pdfPayload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''

    if (response.ok) {
      return downloadQuoteBlob(response, pdfPayload)
    }

    if (contentType.includes('application/json')) {
      const data = await response.clone().json().catch(() => null)

      if (data?.fallback === 'print') {
        return openPrintableFallback(pdfPayload)
      }

      throw new Error(data?.message || data?.error || 'No se pudo exportar la cotizacion a PDF.')
    }

    throw new Error('No se pudo exportar la cotizacion a PDF.')
  } catch (error) {
    console.error('PDF API unavailable:', error)

    alert(
      `No se pudo conectar con el generador PDF.\n\nURL usada: ${PDF_API_URL}\n\nError: ${error.message}`
    )

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
