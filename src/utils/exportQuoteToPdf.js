const LOCAL_PDF_API_URL = 'http://localhost:4300/api/export/pdf'
const PRODUCTION_PDF_API_URL = 'https://api.rubikcreaciones.com/api/export/pdf'

const PDF_API_URL =
  import.meta.env.VITE_RUBIK_PDF_API_URL ||
  (import.meta.env.DEV ? LOCAL_PDF_API_URL : PRODUCTION_PDF_API_URL)

const PDF_REQUEST_TIMEOUT_MS = 60000
const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PDF_CONTENT_TYPE = 'application/pdf'

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

  return 'pdf'
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

const getQuoteAmounts = (quoteData) => {
  const items = getQuoteItems(quoteData)
  const net =
    Number(
      quoteData?.amounts?.net ??
        quoteData?.net ??
        quoteData?.neto ??
        items.reduce((sum, item) => sum + getItemTotal(item), 0),
    ) || 0
  const iva =
    Number(quoteData?.amounts?.iva ?? quoteData?.iva ?? quoteData?.taxAmount) ||
    Math.round(net * 0.19)
  const total =
    Number(quoteData?.amounts?.total ?? quoteData?.total ?? quoteData?.totalAmount) ||
    net + iva

  return { iva, net, total }
}

const getItemDescription = (item) =>
  item?.description || item?.descripcion || item?.technicalDescription || item?.name || ''

const getItemObservations = (item) => item?.observations || item?.observaciones || item?.notes || ''

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
    empresa: client.company || client.empresa || quoteData?.empresa || '',
    rut: client.rut || client.rutCliente || quoteData?.rut || '',
    atencion: client.attention || client.atencion || quoteData?.atencion || '',
    telefono: client.phone || client.telefono || quoteData?.telefono || '',
    comuna: client.comuna || client.commune || quoteData?.comuna || '',
    condicion: quote.condition || quote.condicion || quoteData?.condicion || '',
    vendedor: seller.name || quote.vendedor || quoteData?.vendedor || '',
    tema: quote.subject || quote.tema || quoteData?.tema || 'Cotización según solicitud',
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

const downloadQuoteBlob = async (response, quoteData) => {
  const blob = await response.blob()

  if (!blob || blob.size === 0) {
    throw new Error('La API devolvió un PDF vacío.')
  }

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
    const error = new Error('No hay URL configurada para el generador PDF.')
    alert(`No se pudo conectar con el generador PDF.\n\nURL usada: ${PDF_API_URL}\n\nError: ${error.message}`)
    throw error
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

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const data = await response.clone().json().catch(() => null)
        throw new Error(
          data?.message ||
            data?.error ||
            `No se pudo exportar la cotización a PDF. Status ${response.status}`,
        )
      }

      throw new Error(`No se pudo exportar la cotización a PDF. Status ${response.status}`)
    }

    if (!contentType.toLowerCase().includes(PDF_CONTENT_TYPE)) {
      throw new Error(`La API respondió, pero no devolvió un PDF. Content-Type: ${contentType}`)
    }

    return downloadQuoteBlob(response, pdfPayload)
  } catch (error) {
    console.error('PDF API unavailable:', error)
    alert(`No se pudo conectar con el generador PDF.\n\nURL usada: ${PDF_API_URL}\n\nError: ${error.message}`)
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
