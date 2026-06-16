import { readStorage, STORAGE_KEYS } from './storage'

const WORK_ORDER_STORAGE_KEY = 'rubik.erp.workOrders'
const TENDER_STORAGE_KEY = 'rubik.erp.tenders'

const FINANCE_WORDS = [
  'finanza',
  'finanzas',
  'margen',
  'utilidad',
  'ganancia',
  'costo',
  'costos',
  'presupuesto',
  'valor',
  'precio',
  'neto',
  'iva',
  'total',
  'factura',
  'pago',
  'monto',
  'economico',
  'económico',
]

const SELLER_WORDS = [
  'quien vendio',
  'quién vendió',
  'quien vendió',
  'quién vendio',
  'vendio',
  'vendió',
  'vendedor',
  'vendieron',
  'comercial',
  'ejecutivo',
  'quien hizo',
  'quién hizo',
  'quien genero',
  'quién generó',
  'quien creo',
  'quién creó',
  'solicitante',
  'responsable comercial',
]

const QUOTE_WORDS = ['cotizacion', 'cotización', 'cotizaciones', 'oferta', 'presupuesto']
const DOCUMENT_WORDS = ['documento', 'documentos', 'archivo', 'archivos', 'anexo', 'anexos']
const ADMIN_WORDS = ['administrativo', 'administrativa', 'legal', 'declaracion', 'declaración', 'rut', 'certificado']
const ECONOMIC_WORDS = ['economico', 'económico', 'economica', 'económica', 'valor', 'precio', 'monto', 'pago']

const STOP_WORDS = [
  'quien',
  'quién',
  'vendio',
  'vendió',
  'vendieron',
  'vendedor',
  'comercial',
  'ejecutivo',
  'hizo',
  'genero',
  'generó',
  'creo',
  'creó',
  'solicito',
  'solicitó',
  'solicitante',
  'responsable',
  'diga',
  'decir',
  'mostrar',
  'muestre',
  'busca',
  'buscar',
  'para',
  'por',
  'con',
  'del',
  'desde',
  'hacia',
  'sobre',
  'de',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'que',
  'cual',
  'cuál',
  'cuantas',
  'cuántas',
  'cuantos',
  'cuántos',
  'cantidad',
  'total',
  'hay',
  'me',
]

export const normalizeAssistantText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const safeArray = (value) => (Array.isArray(value) ? value : [])

const stringifySafe = (value) => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(stringifySafe).join(' | ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const includesAny = (text, words) => {
  const normalized = normalizeAssistantText(text)
  return words.some((word) => normalized.includes(normalizeAssistantText(word)))
}

const getCollection = (key) => {
  const stored = readStorage(key, [])
  return Array.isArray(stored) ? stored : []
}

const buildSearchText = (record = {}) =>
  Object.entries(record)
    .filter(([, value]) => typeof value !== 'function')
    .map(([key, value]) => `${key}: ${stringifySafe(value)}`)
    .join(' ')

const getPrioritySearchText = (record = {}) =>
  [
    record.title,
    record.name,
    record.subject,
    record.tema,
    record.client,
    record.cliente,
    record.company,
    record.empresa,
    record.businessName,
    record.razonSocial,
    record.description,
    record.descripcion,
    record.requirements,
    record.deliverables,
    record.observations,
    stringifySafe(record.items),
    stringifySafe(record.technicalItems),
  ]
    .filter(Boolean)
    .join(' ')

const getRecordTitle = (record, fallback = 'Registro') =>
  record.title ||
  record.name ||
  record.quoteNumber ||
  record.numeroCotizacion ||
  record.tenderId ||
  record.client ||
  record.cliente ||
  record.company ||
  record.empresa ||
  record.email ||
  fallback

const getWordVariants = (word = '') => {
  const normalized = normalizeAssistantText(word)
  const variants = new Set([normalized])

  if (normalized.endsWith('es') && normalized.length > 4) {
    variants.add(normalized.slice(0, -2))
  }

  if (normalized.endsWith('s') && normalized.length > 3) {
    variants.add(normalized.slice(0, -1))
  }

  if (!normalized.endsWith('s')) {
    variants.add(`${normalized}s`)
  }

  return Array.from(variants).filter(Boolean)
}

const textContainsWordVariant = (text = '', word = '') => {
  const normalizedText = normalizeAssistantText(text)
  return getWordVariants(word).some((variant) => normalizedText.includes(variant))
}

const getImportantWords = (question = '') =>
  normalizeAssistantText(question)
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)
    .filter((word) => !STOP_WORDS.includes(word))

const isSellerQuestion = (question = '') => includesAny(question, SELLER_WORDS)

const getEntityFromQuestion = (question = '') => {
  const normalized = normalizeAssistantText(question)

  const explicitPatterns = [
    /para\s+(.+)$/,
    /cliente\s+(.+)$/,
    /empresa\s+(.+)$/,
    /comprador\s+(.+)$/,
    /de\s+(.+)$/,
  ]

  for (const pattern of explicitPatterns) {
    const match = normalized.match(pattern)
    if (match?.[1]) {
      const cleaned = match[1]
        .split(' ')
        .filter((word) => !STOP_WORDS.includes(word))
        .join(' ')
        .trim()

      if (cleaned) return cleaned
    }
  }

  return getImportantWords(question).join(' ')
}

const scoreEntityRecord = (record, entity) => {
  const words = getImportantWords(entity || '')
  const fullText = buildSearchText(record)
  const priorityText = getPrioritySearchText(record)

  if (!words.length) return 0

  return words.reduce((score, word) => {
    if (textContainsWordVariant(priorityText, word)) return score + 4
    if (textContainsWordVariant(fullText, word)) return score + 1
    return score
  }, 0)
}

const scoreSellerRecord = ({ record, question, module }) => {
  const subjectWords = getImportantWords(question)
  const priorityText = getPrioritySearchText(record)
  const fullText = buildSearchText(record)

  if (!subjectWords.length) return 0

  const matchedSubjectWords = subjectWords.filter(
    (word) => textContainsWordVariant(priorityText, word) || textContainsWordVariant(fullText, word),
  )

  if (!matchedSubjectWords.length) return 0

  let score = matchedSubjectWords.reduce((sum, word) => {
    if (textContainsWordVariant(priorityText, word)) return sum + 5
    if (textContainsWordVariant(fullText, word)) return sum + 2
    return sum
  }, 0)

  if (module === 'Cotizaciones') score += 5
  if (module === 'Órdenes de trabajo') score += 4
  if (module === 'Documentos') score += 1

  return score
}

const getIntent = (question = '') => {
  const text = normalizeAssistantText(question)

  const wantsCount =
    text.includes('cuantas') ||
    text.includes('cuantos') ||
    text.includes('cantidad') ||
    text.includes('numero de') ||
    text.includes('total de')

  const wantsQuotes = includesAny(text, QUOTE_WORDS)
  const wantsDocuments = includesAny(text, DOCUMENT_WORDS)
  const wantsAdmin = includesAny(text, ADMIN_WORDS)
  const wantsEconomic = includesAny(text, ECONOMIC_WORDS)

  if (isSellerQuestion(question)) return 'seller_search'
  if (wantsCount && wantsQuotes) return 'count_quotes'
  if (wantsQuotes) return 'search_quotes'
  if (wantsDocuments && wantsAdmin) return 'admin_documents'
  if (wantsDocuments && wantsEconomic) return 'economic_documents'
  if (wantsDocuments) return 'documents'

  return 'general'
}

const getQuoteAmount = (quote = {}) =>
  Number(
    quote.total ||
      quote.totalAmount ||
      quote.grandTotal ||
      quote.amount ||
      quote.valorTotal ||
      quote.netTotal ||
      0,
  ) || 0

const getSellerFromRecord = (record = {}) => {
  const createdByObject = typeof record.createdBy === 'object' ? record.createdBy : null

  return (
    record.sellerName ||
    record.vendedor ||
    record.seller ||
    record.salesExecutive ||
    record.createdByName ||
    createdByObject?.name ||
    record.requesterName ||
    record.requestedBy ||
    record.userName ||
    record.assigneeName ||
    ''
  )
}

const getSellerLabel = (record = {}) => {
  if (record.sellerName || record.vendedor || record.seller || record.salesExecutive) {
    return 'Vendedor detectado'
  }

  if (record.createdByName || record.createdBy) return 'Creado por'
  if (record.requesterName || record.requestedBy) return 'Solicitante detectado'
  if (record.assigneeName) return 'Responsable asignado'

  return 'Vendedor / solicitante'
}

const findByEntity = (items, entity) =>
  items
    .map((item) => ({ item, score: scoreEntityRecord(item, entity) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item)

const filterDocumentsByType = (documents, type) => {
  if (type === 'admin') {
    return documents.filter((document) =>
      includesAny(buildSearchText(document), [
        'administrativo',
        'administrativa',
        'legal',
        'declaracion jurada',
        'rut',
        'certificado',
        'representante legal',
        'anexo administrativo',
      ]),
    )
  }

  if (type === 'economic') {
    return documents.filter((document) =>
      includesAny(buildSearchText(document), [
        'economico',
        'economica',
        'oferta economica',
        'anexo economico',
        'valor unitario',
        'valor total',
        'cotizacion',
        'precio',
        'monto',
        'pago',
      ]),
    )
  }

  return documents
}

const buildSellerAnswer = ({ question, collections, canViewFinance }) => {
  const matches = collections
    .flatMap((collection) =>
      collection.items.map((record) => ({
        module: collection.label,
        record,
        score: scoreSellerRecord({ record, question, module: collection.label }),
      })),
    )
    .filter((match) => match.score >= 5)
    .sort((a, b) => b.score - a.score)

  if (!matches.length) {
    return {
      answer:
        'No encontré registros suficientemente relacionados para identificar quién vendió, creó o solicitó eso. Puede que falte guardar el campo vendedor en la cotización o que la palabra buscada no esté en el registro.',
      sources: [],
    }
  }

  const lines = matches.slice(0, 8).map((match, index) => {
    const record = match.record
    const seller = getSellerFromRecord(record)
    const amount = getQuoteAmount(record)

    return [
      `${index + 1}. ${getRecordTitle(record)}`,
      `Módulo: ${match.module}`,
      seller ? `${getSellerLabel(record)}: ${seller}` : 'Vendedor no registrado explícitamente',
      record.client || record.cliente ? `Cliente: ${record.client || record.cliente}` : '',
      record.company || record.empresa ? `Empresa: ${record.company || record.empresa}` : '',
      record.status ? `Estado: ${record.status}` : '',
      record.quoteNumber || record.numeroCotizacion
        ? `N° cotización: ${record.quoteNumber || record.numeroCotizacion}`
        : '',
      canViewFinance && amount ? `Total: ${formatCurrency(amount)}` : '',
      record.description || record.descripcion
        ? `Descripción: ${String(record.description || record.descripcion).slice(0, 260)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return {
    answer: `Busqué quién vendió, creó o solicitó registros relacionados con tu consulta.\n\n${lines.join(
      '\n\n',
    )}`,
    sources: matches.slice(0, 8).map((match) => ({
      module: match.module,
      title: getRecordTitle(match.record),
    })),
  }
}

const buildQuoteAnswer = ({ entity, quotes, documents, canViewFinance }) => {
  const totalAmount = quotes.reduce((sum, quote) => sum + getQuoteAmount(quote), 0)
  const adminDocuments = filterDocumentsByType(documents, 'admin')
  const economicDocuments = filterDocumentsByType(documents, 'economic')

  const quoteLines = quotes.slice(0, 12).map((quote, index) => {
    const amount = getQuoteAmount(quote)

    return [
      `${index + 1}. ${getRecordTitle(quote, 'Cotización')}`,
      quote.quoteNumber || quote.numeroCotizacion ? `N° ${quote.quoteNumber || quote.numeroCotizacion}` : '',
      quote.status ? `Estado: ${quote.status}` : '',
      quote.date || quote.fecha ? `Fecha: ${quote.date || quote.fecha}` : '',
      getSellerFromRecord(quote) ? `${getSellerLabel(quote)}: ${getSellerFromRecord(quote)}` : '',
      canViewFinance && amount ? `Total: ${formatCurrency(amount)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  })

  const documentLines = documents.slice(0, 12).map((document, index) =>
    [
      `${index + 1}. ${getRecordTitle(document, 'Documento')}`,
      document.type || document.documentType ? `Tipo: ${document.type || document.documentType}` : '',
      document.status ? `Estado: ${document.status}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  )

  return {
    answer: [
      `Encontré ${quotes.length} cotización${quotes.length === 1 ? '' : 'es'} relacionada${
        quotes.length === 1 ? '' : 's'
      } con "${entity}".`,
      canViewFinance
        ? `Monto total detectado: ${formatCurrency(totalAmount)}.`
        : 'No muestro montos porque tu perfil no tiene permiso financiero.',
      '',
      quotes.length ? `Cotizaciones encontradas:\n${quoteLines.join('\n')}` : 'No encontré cotizaciones asociadas.',
      '',
      documents.length
        ? `Documentos asociados:\n${documentLines.join('\n')}`
        : 'No encontré documentos asociados directamente.',
      '',
      `Documentos administrativos detectados: ${adminDocuments.length}.`,
      `Documentos económicos detectados: ${economicDocuments.length}.`,
      '',
      adminDocuments.length
        ? `Administrativos principales:\n${adminDocuments
            .slice(0, 6)
            .map((doc, index) => `${index + 1}. ${getRecordTitle(doc, 'Documento administrativo')}`)
            .join('\n')}`
        : 'No encontré documentos administrativos asociados.',
      '',
      economicDocuments.length
        ? `Económicos principales:\n${economicDocuments
            .slice(0, 6)
            .map((doc, index) => `${index + 1}. ${getRecordTitle(doc, 'Documento económico')}`)
            .join('\n')}`
        : 'No encontré documentos económicos asociados.',
    ]
      .filter(Boolean)
      .join('\n'),
    sources: [
      ...quotes.slice(0, 6).map((quote) => ({
        module: 'Cotizaciones',
        title: getRecordTitle(quote, 'Cotización'),
      })),
      ...documents.slice(0, 6).map((document) => ({
        module: 'Documentos',
        title: getRecordTitle(document, 'Documento'),
      })),
    ],
  }
}

const buildGeneralAnswer = ({ question, collections, canViewFinance }) => {
  const words = getImportantWords(question)

  const matches = collections
    .flatMap((collection) =>
      collection.items.map((record) => {
        const text = normalizeAssistantText(buildSearchText(record))
        const score = words.reduce(
          (sum, word) => (textContainsWordVariant(text, word) ? sum + 1 : sum),
          0,
        )

        return {
          module: collection.label,
          record,
          score,
        }
      }),
    )
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!matches.length) {
    return {
      answer:
        'No encontré información suficiente en los módulos permitidos. Prueba con otra forma de preguntar o revisa si la información está guardada.',
      sources: [],
    }
  }

  const lines = matches.slice(0, 8).map((match, index) => {
    const record = match.record
    const amount = getQuoteAmount(record)

    return [
      `${index + 1}. ${getRecordTitle(record)}`,
      `Módulo: ${match.module}`,
      record.status ? `Estado: ${record.status}` : '',
      record.client || record.cliente ? `Cliente: ${record.client || record.cliente}` : '',
      record.company || record.empresa ? `Empresa: ${record.company || record.empresa}` : '',
      record.buyer ? `Comprador: ${record.buyer}` : '',
      record.closingDate ? `Cierre: ${record.closingDate}` : '',
      canViewFinance && amount ? `Total: ${formatCurrency(amount)}` : '',
      record.summary ? `Resumen: ${String(record.summary).slice(0, 320)}` : '',
      record.description || record.descripcion
        ? `Descripción: ${String(record.description || record.descripcion).slice(0, 320)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  })

  return {
    answer: `Encontré estos resultados relacionados:\n\n${lines.join('\n\n')}`,
    sources: matches.slice(0, 8).map((match) => ({
      module: match.module,
      title: getRecordTitle(match.record),
    })),
  }
}

export const answerAssistantQuestion = ({ question, hasPermission, canViewFinance }) => {
  if (includesAny(question, FINANCE_WORDS) && !canViewFinance) {
    return {
      answer:
        'No tienes permiso para consultar información financiera, costos, márgenes, valores, pagos o presupuestos internos.',
      sources: [],
    }
  }

  const intent = getIntent(question)
  const entity = getEntityFromQuestion(question)

  const collections = []

  if (hasPermission('quotes.view')) {
    collections.push({
      scope: 'quotes',
      label: 'Cotizaciones',
      items: getCollection(STORAGE_KEYS.quotes),
    })
  }

  if (hasPermission('documents.view')) {
    collections.push({
      scope: 'documents',
      label: 'Documentos',
      items: getCollection(STORAGE_KEYS.documents),
    })
  }

  if (hasPermission('tenders.view')) {
    collections.push({
      scope: 'tenders',
      label: 'Licitaciones',
      items: getCollection(TENDER_STORAGE_KEY),
    })
  }

  if (hasPermission('workorders.view')) {
    collections.push({
      scope: 'workorders',
      label: 'Órdenes de trabajo',
      items: getCollection(WORK_ORDER_STORAGE_KEY),
    })
  }

  if (hasPermission('clients.view')) {
    collections.push({
      scope: 'clients',
      label: 'Clientes',
      items: getCollection(STORAGE_KEYS.clients),
    })
  }

  if (hasPermission('materials.view')) {
    collections.push({
      scope: 'materials',
      label: 'Materiales',
      items: getCollection(STORAGE_KEYS.materials),
    })
  }

  if (hasPermission('products.view')) {
    collections.push({
      scope: 'products',
      label: 'Productos / Servicios',
      items: getCollection(STORAGE_KEYS.products),
    })
  }

  const quotes = collections.find((collection) => collection.scope === 'quotes')?.items || []
  const documents = collections.find((collection) => collection.scope === 'documents')?.items || []

  if (intent === 'seller_search') {
    const sellerCollections = collections.filter((collection) =>
      ['Cotizaciones', 'Órdenes de trabajo', 'Documentos'].includes(collection.label),
    )

    return buildSellerAnswer({
      question,
      collections: sellerCollections,
      canViewFinance,
    })
  }

  if (intent === 'count_quotes' || intent === 'search_quotes') {
    if (!hasPermission('quotes.view')) {
      return {
        answer: 'No tienes permiso para consultar cotizaciones.',
        sources: [],
      }
    }

    const relatedQuotes = findByEntity(quotes, entity)
    const relatedDocuments = hasPermission('documents.view') ? findByEntity(documents, entity) : []

    return buildQuoteAnswer({
      entity: entity || question,
      quotes: relatedQuotes,
      documents: relatedDocuments,
      canViewFinance,
    })
  }

  if (intent === 'admin_documents' || intent === 'economic_documents' || intent === 'documents') {
    if (!hasPermission('documents.view')) {
      return {
        answer: 'No tienes permiso para consultar documentos.',
        sources: [],
      }
    }

    const relatedDocuments = findByEntity(documents, entity || question)

    const filteredDocuments =
      intent === 'admin_documents'
        ? filterDocumentsByType(relatedDocuments, 'admin')
        : intent === 'economic_documents'
          ? filterDocumentsByType(relatedDocuments, 'economic')
          : relatedDocuments

    if (!filteredDocuments.length) {
      return {
        answer: `No encontré documentos asociados a "${entity || question}" en los módulos permitidos.`,
        sources: [],
      }
    }

    return {
      answer: `Encontré ${filteredDocuments.length} documento${
        filteredDocuments.length === 1 ? '' : 's'
      } relacionado${filteredDocuments.length === 1 ? '' : 's'}:\n\n${filteredDocuments
        .slice(0, 12)
        .map((document, index) => `${index + 1}. ${getRecordTitle(document, 'Documento')}`)
        .join('\n')}`,
      sources: filteredDocuments.slice(0, 10).map((document) => ({
        module: 'Documentos',
        title: getRecordTitle(document, 'Documento'),
      })),
    }
  }

  return buildGeneralAnswer({
    question,
    collections,
    canViewFinance,
  })
}
