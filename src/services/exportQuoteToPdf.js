import { exportQuotePayloadPdf } from './documentExportApi'

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
  const totalAmount =
    getNumberValue(quote.totalAmount ?? quote.total ?? quote.amounts?.total) || netAmount + taxAmount

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

export const exportQuoteToPdf = async (quote) => {
  const payload = normalizeQuoteForPdf(quote)

  try {
    return exportQuotePayloadPdf(payload)
  } catch (error) {
    console.error('Error exportando PDF de cotizacion:', error)
    throw new Error(error.message || 'No se pudo generar el PDF de cotizacion.')
  }
}

export default exportQuoteToPdf
