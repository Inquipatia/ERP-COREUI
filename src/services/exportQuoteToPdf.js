const API_BASE_URL =
  import.meta.env.VITE_RUBIK_API_URL ||
  (import.meta.env.PROD ? 'https://api.rubikcreaciones.com/api' : 'http://localhost:4300/api')

const PDF_ENDPOINT = `${API_BASE_URL.replace(/\/$/, '')}/export/pdf`
const PDF_REQUEST_TIMEOUT_MS = 60000

const getQuoteNumber = (quote = {}) =>
  quote.quoteNumber ||
  quote.numeroCotizacion ||
  quote.numero ||
  quote.quote?.quoteNumber ||
  quote.quoteData?.quoteNumber ||
  'sin-numero'

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

const getItems = (quote = {}) => {
  if (Array.isArray(quote.items)) return quote.items
  if (Array.isArray(quote.quoteItems)) return quote.quoteItems
  return []
}

const getItemQuantity = (item = {}) => getNumberValue(item.quantity ?? item.cantidad ?? item.qty)
const getItemUnitValue = (item = {}) =>
  getNumberValue(item.unitValue ?? item.valorUnitario ?? item.unitPrice ?? item.price)
const getItemTotal = (item = {}) => {
  const explicitTotal = item.total ?? item.totalValue ?? item.valorTotal
  if (explicitTotal !== undefined && explicitTotal !== null && explicitTotal !== '') {
    return getNumberValue(explicitTotal)
  }
  return getItemQuantity(item) * getItemUnitValue(item)
}

const normalizeQuoteForPdf = (quote = {}) => {
  const client = quote.client || {}
  const seller = quote.seller || {}
  const quoteInfo = quote.quote || quote.quoteData || {}
  const items = getItems(quote)
  const netAmount =
    getNumberValue(quote.netAmount ?? quote.neto ?? quote.amounts?.net) ||
    items.reduce((sum, item) => sum + getItemTotal(item), 0)
  const taxAmount =
    getNumberValue(quote.taxAmount ?? quote.iva ?? quote.amounts?.iva) || Math.round(netAmount * 0.19)
  const totalAmount = getNumberValue(quote.totalAmount ?? quote.total ?? quote.amounts?.total) || netAmount + taxAmount

  return {
    ...quote,
    quoteNumber: getQuoteNumber(quote),
    date: quote.date || quote.fecha || quoteInfo.date || quoteInfo.fecha || '',
    client: quote.clientName || quote.cliente || client.client || client.cliente || client.contact || '',
    company: quote.companyName || quote.empresa || client.company || client.empresa || '',
    rut: quote.rut || quote.rutCliente || client.rut || '',
    phone: quote.phone || quote.telefono || client.phone || client.telefono || '',
    commune: quote.commune || quote.comuna || client.commune || client.comuna || '',
    contact: quote.contact || quote.atencion || client.attention || client.atencion || '',
    seller: quote.sellerName || quote.vendedor || seller.name || '',
    subject: quote.subject || quote.tema || quoteInfo.subject || quoteInfo.tema || '',
    condition: quote.condition || quote.condicion || quoteInfo.condition || quoteInfo.condicion || '',
    observations: quote.observations || quote.observaciones || quoteInfo.observaciones || '',
    items: items.map((item) => ({
      quantity: getItemQuantity(item),
      description: item.description || item.descripcion || item.technicalDescription || item.name || '',
      unitValue: getItemUnitValue(item),
      total: getItemTotal(item),
    })),
    netAmount,
    taxAmount,
    totalAmount,
  }
}

const getFileNameFromContentDisposition = (contentDisposition = '') => {
  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1].replace(/"/g, '').trim())

  const match = contentDisposition.match(/filename="?([^";]+)"?/i)
  return match?.[1]?.trim() || ''
}

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const exportQuoteToPdf = async (quote) => {
  const payload = normalizeQuoteForPdf(quote)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), PDF_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(PDF_ENDPOINT, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    })

    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      const errorPayload = contentType.includes('application/json')
        ? await response.clone().json().catch(() => null)
        : null
      throw new Error(errorPayload?.error || `No se pudo generar el PDF. Estado ${response.status}.`)
    }

    if (!contentType.toLowerCase().includes('application/pdf')) {
      throw new Error(`La API no devolvió un PDF. Content-Type: ${contentType || 'sin tipo'}.`)
    }

    const blob = await response.blob()
    if (!blob || blob.size === 0) throw new Error('La API devolvió un PDF vacío.')

    const headerFileName = getFileNameFromContentDisposition(response.headers.get('content-disposition') || '')
    const fileName = headerFileName || `cotizacion-${payload.quoteNumber}.pdf`

    downloadBlob(blob, fileName)

    return { fileName, ok: true }
  } catch (error) {
    console.error('Error exportando PDF de cotización:', error)
    throw new Error(error.message || 'No se pudo generar el PDF de cotización.')
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export default exportQuoteToPdf
