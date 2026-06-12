import {
  createLocalId,
  deleteCollectionItem,
  STORAGE_KEYS,
  upsertCollectionItem,
  useLocalStorageState,
} from './storage'

export const DOCUMENT_TYPES = [
  'Cotización',
  'Licitación',
  'Orden de trabajo',
  'Compra',
  'Factura / boleta futura',
]

export const DOCUMENT_STATUSES = [
  'Borrador',
  'Emitida',
  'Enviada',
  'Adjudicada',
  'Rechazada',
  'Cerrada',
]

export const getNumberValue = (value) => Number(value) || 0

export const parseDocumentDate = (value) => {
  if (!value) {
    return null
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [day, month, year] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export const normalizeDocument = (document) => {
  const now = new Date().toISOString()

  return {
    id: document.id || createLocalId('doc'),
    tipoDocumento: document.tipoDocumento || document.type || 'Cotización',
    numeroDocumento: String(
      document.numeroDocumento || document.quoteNumber || document.number || '',
    ),
    fecha: document.fecha || document.date || '',
    cliente: document.cliente || document.client || '',
    empresa: document.empresa || document.company || '',
    vendedor: document.vendedor || document.seller || '',
    montoNeto: getNumberValue(document.montoNeto ?? document.net),
    iva: getNumberValue(document.iva),
    total: getNumberValue(document.total),
    estado: document.estado || document.status || 'Borrador',
    origen: document.origen || document.origin || 'ERP Rubik',
    tags: normalizeTags(document.tags),
    observaciones: document.observaciones || document.observations || '',
    archivoPdfUrl: document.archivoPdfUrl || '',
    archivoExcelUrl: document.archivoExcelUrl || '',
    createdAt: document.createdAt || now,
    updatedAt: document.updatedAt || now,
    items: Array.isArray(document.items) ? document.items : [],
    payload: document.payload || null,
  }
}

export const getDocumentBusinessKey = (document) =>
  `${document.tipoDocumento || 'Cotización'}:${String(document.numeroDocumento || '')}`

const mergeDocumentRecords = (currentDocument, nextDocument) =>
  normalizeDocument({
    ...currentDocument,
    ...nextDocument,
    id: currentDocument.id || nextDocument.id,
    createdAt: currentDocument.createdAt || nextDocument.createdAt,
    archivoPdfUrl: nextDocument.archivoPdfUrl || currentDocument.archivoPdfUrl,
    archivoExcelUrl: nextDocument.archivoExcelUrl || currentDocument.archivoExcelUrl,
    updatedAt: nextDocument.updatedAt || new Date().toISOString(),
  })

export const upsertDocument = (documents, document) => {
  const normalizedDocuments = (Array.isArray(documents) ? documents : []).map(normalizeDocument)
  const nextDocument = normalizeDocument(document)
  const nextBusinessKey = getDocumentBusinessKey(nextDocument)
  let documentWasUpdated = false

  const nextDocuments = normalizedDocuments.map((currentDocument) => {
    const sameId = currentDocument.id && nextDocument.id && currentDocument.id === nextDocument.id
    const sameBusinessKey = getDocumentBusinessKey(currentDocument) === nextBusinessKey

    if (!sameId && !sameBusinessKey) {
      return currentDocument
    }

    documentWasUpdated = true
    return mergeDocumentRecords(currentDocument, nextDocument)
  })

  return documentWasUpdated ? nextDocuments : [...nextDocuments, nextDocument]
}

export const deleteDocument = (documents, documentId) =>
  deleteCollectionItem(documents, documentId, { normalizeItem: normalizeDocument })

export const createDocumentFromQuotePayload = (quotePayload, options = {}) => {
  const now = new Date().toISOString()
  const quoteNumber = quotePayload.quote?.quoteNumber || '8103'
  const subject = quotePayload.quote?.subject || ''
  const condition = quotePayload.quote?.condition || ''

  return normalizeDocument({
    id: options.id || createLocalId('doc'),
    tipoDocumento: 'Cotización',
    numeroDocumento: quoteNumber,
    fecha: quotePayload.quote?.date || '',
    cliente: quotePayload.client?.client || '',
    empresa: quotePayload.client?.company || '',
    vendedor: quotePayload.seller?.name || '',
    montoNeto: quotePayload.amounts?.net,
    iva: quotePayload.amounts?.iva,
    total: quotePayload.amounts?.total,
    estado: options.estado || 'Borrador',
    origen: 'Cotizador 5000',
    tags: ['cotizacion', 'cotizador-5000'].filter(Boolean),
    observaciones: [subject, condition].filter(Boolean).join(' | '),
    archivoPdfUrl: '',
    archivoExcelUrl: '',
    createdAt: now,
    updatedAt: now,
    items: quotePayload.quoteItems || [],
    payload: quotePayload,
  })
}

export const normalizeQuoteRecord = (quote) => ({
  ...quote,
  id: quote.id || createLocalId('quote'),
  quoteNumber: String(quote.quoteNumber || quote.numeroDocumento || quote.number || '8103'),
  date: quote.date || quote.fecha || '',
  client: quote.client || quote.cliente || '',
  company: quote.company || quote.empresa || '',
  seller: quote.seller || quote.vendedor || '',
  net: getNumberValue(quote.net ?? quote.montoNeto),
  iva: getNumberValue(quote.iva),
  total: getNumberValue(quote.total),
  status: quote.status || quote.estado || 'Borrador',
  items: Array.isArray(quote.items) ? quote.items : [],
  payload: quote.payload || null,
  createdAt: quote.createdAt || new Date().toISOString(),
  updatedAt: quote.updatedAt || new Date().toISOString(),
})

export const createQuoteRecordFromPayload = (quotePayload, options = {}) => {
  const now = new Date().toISOString()

  return normalizeQuoteRecord({
    id: options.id || createLocalId('quote'),
    quoteNumber: quotePayload.quote?.quoteNumber || '8103',
    date: quotePayload.quote?.date || '',
    client: quotePayload.client?.client || '',
    company: quotePayload.client?.company || '',
    seller: quotePayload.seller?.name || '',
    net: quotePayload.amounts?.net,
    iva: quotePayload.amounts?.iva,
    total: quotePayload.amounts?.total,
    status: options.status || 'Borrador',
    items: quotePayload.quoteItems || [],
    payload: quotePayload,
    createdAt: now,
    updatedAt: now,
  })
}

export const createQuoteRecordFromDocument = (document) =>
  normalizeQuoteRecord({
    quoteNumber: document.numeroDocumento,
    date: document.fecha,
    client: document.cliente,
    company: document.empresa,
    seller: document.vendedor,
    net: document.montoNeto,
    iva: document.iva,
    total: document.total,
    status: document.estado,
    items: document.items,
    payload: document.payload,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  })

export const getQuoteRecordKey = (quote) => String(quote.quoteNumber || '')

export const upsertQuoteRecord = (quotes, quote) =>
  upsertCollectionItem(quotes, quote, {
    getKey: getQuoteRecordKey,
    normalizeItem: normalizeQuoteRecord,
    mergeItems: (currentQuote, nextQuote) => ({
      ...currentQuote,
      ...nextQuote,
      id: currentQuote.id || nextQuote.id,
      createdAt: currentQuote.createdAt || nextQuote.createdAt,
      updatedAt: nextQuote.updatedAt || new Date().toISOString(),
    }),
  })

export const upsertQuoteFromDocument = (quotes, document) => {
  if (document.tipoDocumento !== 'Cotización') {
    return (Array.isArray(quotes) ? quotes : []).map(normalizeQuoteRecord)
  }

  return upsertQuoteRecord(quotes, createQuoteRecordFromDocument(document))
}

export const deleteQuoteByDocument = (quotes, document) => {
  if (document.tipoDocumento !== 'Cotización') {
    return (Array.isArray(quotes) ? quotes : []).map(normalizeQuoteRecord)
  }

  return deleteCollectionItem(quotes, document.numeroDocumento, {
    getKey: getQuoteRecordKey,
    normalizeItem: normalizeQuoteRecord,
  })
}

export const duplicateDocument = (document) => {
  const now = new Date().toISOString()

  return normalizeDocument({
    ...document,
    id: createLocalId('doc'),
    numeroDocumento: `${document.numeroDocumento}-COPIA`,
    estado: 'Borrador',
    createdAt: now,
    updatedAt: now,
  })
}

const includesSearch = (value, query) =>
  String(value || '')
    .toLowerCase()
    .includes(query)

export const documentMatchesFilters = (document, filters) => {
  const query = String(filters.search || '')
    .trim()
    .toLowerCase()
  const minAmount = filters.minAmount === '' ? null : getNumberValue(filters.minAmount)
  const maxAmount = filters.maxAmount === '' ? null : getNumberValue(filters.maxAmount)
  const documentDate = parseDocumentDate(document.fecha)
  const dateFrom = parseDocumentDate(filters.dateFrom)
  const dateTo = parseDocumentDate(filters.dateTo)

  if (dateTo) {
    dateTo.setHours(23, 59, 59, 999)
  }

  const itemText = document.items
    .map((item) =>
      [
        item.description,
        item.technicalDescription,
        item.observations,
        item.observaciones,
        item.unitValue,
        item.total,
      ]
        .filter(Boolean)
        .join(' '),
    )
    .join(' ')
  const haystack = [
    document.numeroDocumento,
    document.cliente,
    document.empresa,
    document.vendedor,
    document.tipoDocumento,
    document.estado,
    document.total,
    document.montoNeto,
    document.tags.join(' '),
    document.observaciones,
    itemText,
  ]

  const matchesSearch = !query || haystack.some((value) => includesSearch(value, query))
  const matchesType = !filters.tipoDocumento || document.tipoDocumento === filters.tipoDocumento
  const matchesStatus = !filters.estado || document.estado === filters.estado
  const matchesMinAmount = minAmount === null || document.total >= minAmount
  const matchesMaxAmount = maxAmount === null || document.total <= maxAmount
  const matchesDateFrom = !dateFrom || (documentDate && documentDate >= dateFrom)
  const matchesDateTo = !dateTo || (documentDate && documentDate <= dateTo)

  return (
    matchesSearch &&
    matchesType &&
    matchesStatus &&
    matchesMinAmount &&
    matchesMaxAmount &&
    matchesDateFrom &&
    matchesDateTo
  )
}

export const useDocumentStorage = (initialDocuments = []) => {
  const [documents, setDocuments] = useLocalStorageState(
    STORAGE_KEYS.documents,
    initialDocuments.map(normalizeDocument),
  )

  return [documents.map(normalizeDocument), setDocuments]
}
