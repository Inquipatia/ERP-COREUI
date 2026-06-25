const { randomUUID } = require('node:crypto')
const { getPrisma } = require('./prismaClient')
const {
  calculateFinanceMovement,
  getNumberValue,
  registerMovementPayment,
} = require('../utils/financeCalculations')

const sessions = new Map()

const PERMISSIONS = [
  'admin.all',
  'dashboard.view',
  'clients.view',
  'clients.manage',
  'quotes.view',
  'quotes.create',
  'quotes.edit',
  'documents.view',
  'documents.manage',
  'tenders.view',
  'workorders.view',
  'workorders.create',
  'users.view',
  'users.manage',
  'finance.view',
  'finance.manage',
  'finance.payments',
  'suppliers.view',
  'suppliers.manage',
  'ai.chat',
]

const OWNER_EMAILS = [
  'r.rojas@rubikcreaciones.cl',
  'brojas.romero@rubikcreaciones.cl',
  'contacto@rubikcreaciones.cl',
]

const MODEL_CONFIG = {
  users: { model: 'user', prefix: 'usr' },
  clients: { model: 'client', prefix: 'client' },
  quotes: { model: 'quote', prefix: 'quote' },
  documents: { model: 'document', prefix: 'doc' },
  tenders: { model: 'tender', prefix: 'tender' },
  workOrders: { model: 'workOrder', prefix: 'wo' },
  suppliers: { model: 'supplier', prefix: 'sup' },
  financeMovements: { model: 'financialMovement', prefix: 'fin' },
}

const createId = (prefix) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`
const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const uniq = (values) => [...new Set((values || []).filter(Boolean))]

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getPermissionsForRole = (role = '', email = '') => {
  if (OWNER_EMAILS.includes(normalizeEmail(email))) return PERMISSIONS

  const normalizedRole = normalizeText(role)

  if (normalizedRole.includes('finanzas')) {
    return [
      'dashboard.view',
      'clients.view',
      'quotes.view',
      'documents.view',
      'tenders.view',
      'workorders.view',
      'finance.view',
      'finance.manage',
      'finance.payments',
      'suppliers.view',
      'suppliers.manage',
      'ai.chat',
    ]
  }

  if (normalizedRole.includes('venta') || normalizedRole.includes('licitaciones')) {
    return [
      'dashboard.view',
      'clients.view',
      'clients.manage',
      'quotes.view',
      'quotes.create',
      'quotes.edit',
      'documents.view',
      'documents.manage',
      'tenders.view',
      'workorders.view',
      'workorders.create',
      'ai.chat',
    ]
  }

  if (normalizedRole.includes('taller') || normalizedRole.includes('produccion')) {
    return ['dashboard.view', 'documents.view', 'workorders.view', 'workorders.create', 'ai.chat']
  }

  return ['dashboard.view', 'documents.view', 'workorders.view', 'ai.chat']
}

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const toJson = (value, fallbackValue = null) => {
  if (value === undefined) return fallbackValue
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (_error) {
      return value
    }
  }
  return value
}

const serializeValue = (value) => {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber()
  if (Array.isArray(value)) return value.map(serializeValue)
  if (typeof value === 'object') {
    return Object.entries(value).reduce((payload, [key, itemValue]) => {
      payload[key] = serializeValue(itemValue)
      return payload
    }, {})
  }
  return value
}

const serializeItem = (item) => serializeValue(item)

const sanitizeUser = (user = {}) => {
  const { password, ...safeUser } = serializeItem(user)
  return safeUser
}

const getDelegate = (key) => {
  const config = MODEL_CONFIG[key]
  if (!config) {
    const error = new Error(`Colección no soportada: ${key}`)
    error.statusCode = 400
    throw error
  }

  return getPrisma()[config.model]
}

const withDatabaseError = async (operation) => {
  try {
    return await operation()
  } catch (error) {
    if (error.statusCode) throw error

    const dbError = new Error('No se pudo conectar con la base de datos.')
    dbError.statusCode = 503
    dbError.code = error.code
    dbError.cause = error
    throw dbError
  }
}

const normalizeUser = (payload = {}, existing = {}) => {
  const email = normalizeEmail(payload.email || existing.email)
  const role = payload.role || existing.role || payload.position || existing.position || 'Usuario'

  return {
    id: payload.id || existing.id || createId('usr'),
    name: payload.name || existing.name || email,
    email,
    password: payload.password ?? existing.password ?? process.env.INITIAL_USER_PASSWORD ?? '123456',
    role,
    status: payload.status || existing.status || 'Activo',
    position: payload.position || payload.cargo || existing.position || role,
    area: payload.area || existing.area || '',
    permissions: uniq(payload.permissions || existing.permissions || getPermissionsForRole(role, email)),
    payload: payload.payload || existing.payload || null,
  }
}

const normalizeClient = (payload = {}, existing = {}) => ({
  id: payload.id || existing.id || createId('client'),
  contactName: payload.contactName || payload.contact || payload.cliente || existing.contactName || '',
  contact: payload.contact || payload.contactName || payload.cliente || existing.contact || '',
  company: payload.company || payload.empresa || existing.company || '',
  rut: payload.rut || existing.rut || '',
  phone: payload.phone || payload.telefono || existing.phone || '',
  email: payload.email || existing.email || '',
  commune: payload.commune || payload.comuna || existing.commune || '',
  address: payload.address || payload.direccion || existing.address || '',
  status: payload.status || payload.estado || existing.status || 'Activo',
  observations: payload.observations || payload.observaciones || existing.observations || '',
  payload: payload.payload || existing.payload || null,
})

const normalizeQuote = (payload = {}, existing = {}) => {
  const netAmount = getNumberValue(payload.netAmount ?? payload.neto ?? existing.netAmount)
  const taxAmount = getNumberValue(payload.taxAmount ?? payload.iva ?? existing.taxAmount)
  const totalAmount = getNumberValue(payload.totalAmount ?? payload.total ?? existing.totalAmount)

  return {
    id: payload.id || existing.id || createId('quote'),
    quoteNumber: String(payload.quoteNumber || payload.numeroCotizacion || payload.numero || existing.quoteNumber || Date.now()),
    date: toDate(payload.date || payload.fecha || existing.date),
    client: payload.client || payload.cliente || existing.client || '',
    company: payload.company || payload.empresa || existing.company || '',
    seller: payload.seller || payload.vendedor || existing.seller || '',
    subject: payload.subject || payload.tema || existing.subject || '',
    condition: payload.condition || payload.condicion || existing.condition || '',
    status: payload.status || payload.estado || existing.status || 'Borrador',
    netAmount,
    taxAmount,
    totalAmount: totalAmount || netAmount + taxAmount,
    items: toJson(payload.items || payload.quoteItems || existing.items, []),
    payload: payload.payload || existing.payload || null,
  }
}

const normalizeDocument = (payload = {}, existing = {}) => ({
  id: payload.id || existing.id || createId('doc'),
  type: payload.type || payload.tipoDocumento || existing.type || 'Documento',
  documentNumber:
    payload.documentNumber || payload.numeroDocumento || payload.quoteNumber || existing.documentNumber || String(Date.now()),
  date: toDate(payload.date || payload.fecha || existing.date),
  client: payload.client || payload.cliente || existing.client || '',
  company: payload.company || payload.empresa || existing.company || '',
  seller: payload.seller || payload.vendedor || existing.seller || '',
  netAmount: getNumberValue(payload.netAmount ?? payload.montoNeto ?? existing.netAmount),
  taxAmount: getNumberValue(payload.taxAmount ?? payload.iva ?? existing.taxAmount),
  totalAmount: getNumberValue(payload.totalAmount ?? payload.total ?? existing.totalAmount),
  status: payload.status || payload.estado || existing.status || 'Borrador',
  origin: payload.origin || payload.origen || existing.origin || '',
  tags: toJson(payload.tags || existing.tags, []),
  observations: payload.observations || payload.observaciones || existing.observations || '',
  filePdfUrl: payload.filePdfUrl || payload.archivoPdfUrl || existing.filePdfUrl || '',
  fileExcelUrl: payload.fileExcelUrl || payload.archivoExcelUrl || existing.fileExcelUrl || '',
  items: toJson(payload.items || existing.items, []),
  payload: payload.payload || existing.payload || null,
})

const normalizeTender = (payload = {}, existing = {}) => ({
  id: payload.id || existing.id || createId('tender'),
  tenderId: payload.tenderId || existing.tenderId || null,
  title: payload.title || payload.nombre || existing.title || 'Licitación sin título',
  buyer: payload.buyer || payload.comprador || existing.buyer || '',
  buyerRut: payload.buyerRut || existing.buyerRut || '',
  budget: payload.budget !== undefined || existing.budget !== undefined ? getNumberValue(payload.budget ?? existing.budget) : null,
  closingDate: toDate(payload.closingDate || existing.closingDate),
  openingDate: toDate(payload.openingDate || existing.openingDate),
  adjudicationDate: toDate(payload.adjudicationDate || existing.adjudicationDate),
  contractSignDate: toDate(payload.contractSignDate || existing.contractSignDate),
  status: payload.status || existing.status || 'Borrador',
  riskLevel: payload.riskLevel || existing.riskLevel || 'Medio',
  object: payload.object || existing.object || '',
  summary: payload.summary || existing.summary || '',
  administrativeRequirements: toJson(payload.administrativeRequirements || existing.administrativeRequirements, []),
  technicalRequirements: toJson(payload.technicalRequirements || existing.technicalRequirements, []),
  economicRequirements: toJson(payload.economicRequirements || existing.economicRequirements, []),
  requiredDocuments: toJson(payload.requiredDocuments || existing.requiredDocuments, []),
  essentialDocuments: toJson(payload.essentialDocuments || existing.essentialDocuments, []),
  evaluationCriteria: toJson(payload.evaluationCriteria || existing.evaluationCriteria, []),
  guarantees: toJson(payload.guarantees || existing.guarantees, []),
  paymentTerms: payload.paymentTerms || existing.paymentTerms || '',
  penalties: toJson(payload.penalties || existing.penalties, []),
  risks: toJson(payload.risks || existing.risks, []),
  suggestedQuestions: toJson(payload.suggestedQuestions || existing.suggestedQuestions, []),
  technicalItems: toJson(payload.technicalItems || existing.technicalItems, []),
  observations: payload.observations || existing.observations || '',
  sourceText: payload.sourceText || existing.sourceText || '',
  sourceFiles: toJson(payload.sourceFiles || existing.sourceFiles, []),
  fieldSources: toJson(payload.fieldSources || existing.fieldSources, {}),
  diagnostics: toJson(payload.diagnostics || existing.diagnostics, []),
  payload: payload.payload || existing.payload || null,
})

const normalizeWorkOrder = (payload = {}, existing = {}) => ({
  id: payload.id || existing.id || createId('wo'),
  title: payload.title || existing.title || 'Orden de trabajo',
  type: payload.type || existing.type || 'Otro',
  client: payload.client || existing.client || '',
  company: payload.company || existing.company || '',
  quoteNumber: payload.quoteNumber || existing.quoteNumber || '',
  requesterName: payload.requesterName || payload.requestedBy || existing.requesterName || '',
  requesterEmail: payload.requesterEmail || existing.requesterEmail || '',
  requesterRole: payload.requesterRole || existing.requesterRole || '',
  assigneeName: payload.assigneeName || payload.assignedTo || existing.assigneeName || '',
  assigneeEmail: payload.assigneeEmail || existing.assigneeEmail || '',
  assigneeRole: payload.assigneeRole || existing.assigneeRole || '',
  sourceArea: payload.sourceArea || existing.sourceArea || '',
  targetArea: payload.targetArea || existing.targetArea || '',
  priority: payload.priority || existing.priority || 'Media',
  status: payload.status || existing.status || 'Pendiente',
  dueDate: toDate(payload.dueDate || existing.dueDate),
  description: payload.description || existing.description || '',
  requirements: payload.requirements || existing.requirements || '',
  deliverables: payload.deliverables || existing.deliverables || '',
  observations: payload.observations || existing.observations || '',
  comments: toJson(payload.comments || existing.comments, []),
  movements: toJson(payload.movements || existing.movements, []),
  payload: payload.payload || existing.payload || null,
})

const normalizeSupplier = (payload = {}, existing = {}) => ({
  id: payload.id || existing.id || createId('sup'),
  name: payload.name || payload.nombre || existing.name || 'Proveedor',
  rut: payload.rut || existing.rut || '',
  contactName: payload.contactName || payload.contacto || existing.contactName || '',
  phone: payload.phone || payload.telefono || existing.phone || '',
  email: payload.email || existing.email || '',
  category: payload.category || payload.categoria || existing.category || '',
  paymentTerms: payload.paymentTerms || existing.paymentTerms || '',
  bankName: payload.bankName || existing.bankName || '',
  bankAccountType: payload.bankAccountType || existing.bankAccountType || '',
  bankAccountNumber: payload.bankAccountNumber || existing.bankAccountNumber || '',
  bankAccountEmail: payload.bankAccountEmail || existing.bankAccountEmail || '',
  status: payload.status || existing.status || 'Activo',
  observations: payload.observations || payload.observaciones || existing.observations || '',
  payload: payload.payload || existing.payload || null,
})

const normalizeFinanceMovement = (payload = {}, existing = {}) => {
  const calculated = calculateFinanceMovement({
    ...existing,
    ...payload,
    netAmount: payload.netAmount ?? existing.netAmount,
    paidAmount: payload.paidAmount ?? existing.paidAmount,
  })

  return {
    id: payload.id || existing.id || createId('fin'),
    type: calculated.type || 'Ingreso',
    category: calculated.category || '',
    documentType: calculated.documentType || '',
    documentNumber: calculated.documentNumber || '',
    client: calculated.client || '',
    company: calculated.company || '',
    supplierId: calculated.supplierId || null,
    supplierName: calculated.supplierName || '',
    quoteId: calculated.quoteId || null,
    quoteNumber: calculated.quoteNumber || '',
    tenderId: calculated.tenderId || '',
    workOrderId: calculated.workOrderId || '',
    description: calculated.description || '',
    netAmount: getNumberValue(calculated.netAmount),
    taxRate: getNumberValue(calculated.taxRate),
    taxAmount: getNumberValue(calculated.taxAmount),
    isTaxExempt: Boolean(calculated.isTaxExempt),
    totalAmount: getNumberValue(calculated.totalAmount),
    paidAmount: getNumberValue(calculated.paidAmount),
    pendingAmount: getNumberValue(calculated.pendingAmount),
    issueDate: toDate(calculated.issueDate),
    dueDate: toDate(calculated.dueDate),
    paymentDate: toDate(calculated.paymentDate),
    status: calculated.status || 'Sin pagar',
    paymentMethod: calculated.paymentMethod || '',
    paymentTerms: calculated.paymentTerms || '',
    responsibleName: calculated.responsibleName || '',
    responsibleEmail: calculated.responsibleEmail || '',
    observations: calculated.observations || '',
    sourceType: calculated.sourceType || '',
    quoteSourceLocked: Boolean(calculated.quoteSourceLocked),
    isAdditionalMovement: Boolean(calculated.isAdditionalMovement),
    auditLog: toJson(calculated.auditLog, []),
    payload: calculated.payload || null,
  }
}

const normalizers = {
  users: normalizeUser,
  clients: normalizeClient,
  quotes: normalizeQuote,
  documents: normalizeDocument,
  tenders: normalizeTender,
  workOrders: normalizeWorkOrder,
  suppliers: normalizeSupplier,
  financeMovements: normalizeFinanceMovement,
}

const list = async (key) =>
  withDatabaseError(async () => {
    const items = await getDelegate(key).findMany({ orderBy: { createdAt: 'desc' } })
    return items.map(serializeItem)
  })

const findById = async (key, id) =>
  withDatabaseError(async () => {
    const item = await getDelegate(key).findUnique({ where: { id } })

    if (!item) {
      const error = new Error('Registro no encontrado.')
      error.statusCode = 404
      throw error
    }

    return serializeItem(item)
  })

const create = async (key, prefix, payload) =>
  withDatabaseError(async () => {
    const normalize = normalizers[key]
    const data = normalize(payload, { id: payload.id || createId(prefix || MODEL_CONFIG[key].prefix) })
    const item = await getDelegate(key).create({ data })
    return serializeItem(item)
  })

const update = async (key, id, payload) =>
  withDatabaseError(async () => {
    const currentItem = await findById(key, id)
    const normalize = normalizers[key]
    const data = normalize({ ...payload, id }, currentItem)
    delete data.createdAt
    delete data.updatedAt

    const item = await getDelegate(key).update({ where: { id }, data })
    return serializeItem(item)
  })

const remove = async (key, id) =>
  withDatabaseError(async () => {
    await findById(key, id)
    await getDelegate(key).delete({ where: { id } })
    return { id, deleted: true }
  })

const getBusinessWhere = (key, item = {}) => {
  if (key === 'users' && item.email) return { email: normalizeEmail(item.email) }
  if (key === 'quotes' && item.quoteNumber) return { quoteNumber: String(item.quoteNumber) }
  if (key === 'tenders' && item.tenderId) return { tenderId: item.tenderId }
  if (key === 'suppliers' && item.rut) return { rut: item.rut }
  return item.id ? { id: item.id } : null
}

const upsertMany = async (key, items = []) =>
  withDatabaseError(async () => {
    const incomingItems = Array.isArray(items) ? items : []
    const delegate = getDelegate(key)
    const normalize = normalizers[key]
    let inserted = 0
    let updated = 0

    for (const item of incomingItems) {
      if (!item || typeof item !== 'object') continue

      const where = getBusinessWhere(key, item)
      const existing = where ? await delegate.findFirst({ where }) : null
      const existingPayload = existing ? serializeItem(existing) : {}
      const data = normalize(item, existingPayload)

      if (!existing) {
        await delegate.create({ data })
        inserted += 1
        continue
      }

      delete data.createdAt
      delete data.updatedAt
      await delegate.update({ where: { id: existing.id }, data })
      updated += 1
    }

    return { inserted, updated }
  })

const login = async ({ email, password }) =>
  withDatabaseError(async () => {
    const user = await getPrisma().user.findUnique({ where: { email: normalizeEmail(email) } })

    if (!user || user.status !== 'Activo' || String(user.password || '') !== String(password || '')) {
      const error = new Error('Credenciales inválidas.')
      error.statusCode = 401
      throw error
    }

    const token = `rubik-token-${randomUUID()}`
    const safeUser = sanitizeUser(user)
    sessions.set(token, safeUser)

    return { token, user: safeUser }
  })

const getUserByToken = (token) => sessions.get(token) || null

const getDashboard = async (user = {}) =>
  withDatabaseError(async () => {
    const canViewFinance =
      Array.isArray(user.permissions) &&
      (user.permissions.includes('finance.view') || user.permissions.includes('admin.all'))
    const [quotes, documents, tenders, workOrders, clients, latestDocuments, latestWorkOrders] = await Promise.all([
      getPrisma().quote.findMany(),
      getPrisma().document.findMany(),
      getPrisma().tender.findMany(),
      getPrisma().workOrder.findMany(),
      getPrisma().client.findMany(),
      getPrisma().document.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      getPrisma().workOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ])
    const financeMovements = canViewFinance ? await getPrisma().financialMovement.findMany() : []
    const totalQuoted = quotes.reduce((sum, quote) => sum + getNumberValue(serializeItem(quote).totalAmount), 0)
    const pendingFinance = financeMovements.reduce(
      (sum, movement) => sum + getNumberValue(serializeItem(movement).pendingAmount),
      0,
    )

    return {
      quotes: quotes.length,
      documents: documents.length,
      tenders: tenders.length,
      workOrders: workOrders.length,
      clients: clients.length,
      totalQuoted: canViewFinance ? totalQuoted : null,
      pendingFinance: canViewFinance ? pendingFinance : null,
      latestDocuments: latestDocuments.map(serializeItem),
      latestWorkOrders: latestWorkOrders.map(serializeItem),
    }
  })

const createReceivableFromQuote = async (quoteId, user = {}) =>
  withDatabaseError(async () => {
    const quote = await getPrisma().quote.findUnique({ where: { id: quoteId } })

    if (!quote) {
      const error = new Error('Registro no encontrado.')
      error.statusCode = 404
      throw error
    }

    const quoteData = serializeItem(quote)
    const duplicated = await getPrisma().financialMovement.findFirst({
      where: {
        quoteNumber: quoteData.quoteNumber,
        isAdditionalMovement: false,
      },
    })

    if (duplicated) {
      const error = new Error('La cotizacion ya tiene una cuenta por cobrar.')
      error.statusCode = 409
      throw error
    }

    return create('financeMovements', 'fin', {
      type: 'Ingreso',
      category: 'Venta',
      documentType: 'Sin documento',
      documentNumber: `COT-${quoteData.quoteNumber}`,
      client: quoteData.client,
      company: quoteData.company,
      quoteId: quoteData.id,
      quoteNumber: quoteData.quoteNumber,
      description: quoteData.subject || `Cuenta por cobrar cotizacion ${quoteData.quoteNumber}`,
      netAmount: quoteData.netAmount,
      taxRate: quoteData.netAmount ? (getNumberValue(quoteData.taxAmount) / getNumberValue(quoteData.netAmount)) * 100 : 19,
      paidAmount: 0,
      issueDate: quoteData.date,
      dueDate: quoteData.date,
      paymentMethod: 'Transferencia',
      responsibleName: quoteData.seller || user.name,
      responsibleEmail: user.email,
      sourceType: 'quote',
      quoteSourceLocked: true,
      auditLog: [
        {
          action: 'Cuenta por cobrar desde cotizacion',
          userEmail: user.email,
          createdAt: new Date().toISOString(),
        },
      ],
    })
  })

const getFinanceSummary = async () =>
  withDatabaseError(async () => {
    const movements = (await list('financeMovements')).map(calculateFinanceMovement)
    return movements.reduce(
      (summary, movement) => {
        if (movement.type === 'Ingreso') summary.receivable += movement.pendingAmount
        if (movement.type === 'Egreso') summary.payable += movement.pendingAmount
        summary.totalPending += movement.pendingAmount
        summary.totalPaid += movement.paidAmount
        if (movement.status === 'Vencido') summary.overdue += 1
        return summary
      },
      { receivable: 0, payable: 0, totalPending: 0, totalPaid: 0, overdue: 0 },
    )
  })

const registerPayment = async (movementId, payment, user) =>
  withDatabaseError(async () => {
    const movement = await findById('financeMovements', movementId)
    const nextMovement = registerMovementPayment(movement, payment, user)

    await getPrisma().payment.create({
      data: {
        id: createId('pay'),
        financialMovementId: movementId,
        amount: getNumberValue(payment.amount),
        paymentDate: toDate(payment.paymentDate) || new Date(),
        paymentMethod: payment.paymentMethod || nextMovement.paymentMethod || '',
        reference: payment.reference || '',
        responsibleName: user.name || '',
        responsibleEmail: user.email || '',
        observations: payment.observations || '',
        auditLog: nextMovement.auditLog || [],
      },
    })

    return update('financeMovements', movementId, nextMovement)
  })

const parseMaybeJson = (value, fallbackValue = []) => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return fallbackValue

  try {
    const parsedValue = JSON.parse(value)
    return Array.isArray(parsedValue) ? parsedValue : fallbackValue
  } catch (_error) {
    return fallbackValue
  }
}

const readImportCollection = (payload = {}, key, storageKeys = []) => {
  if (Array.isArray(payload[key])) return payload[key]

  const localStorageDump = payload.localStorage || payload.storage || payload
  const candidates = [key, ...storageKeys]

  for (const candidate of candidates) {
    const value = localStorageDump?.[candidate]
    const parsedValue = parseMaybeJson(value, null)
    if (Array.isArray(parsedValue)) return parsedValue
  }

  return []
}

const importLocalStorage = async (payload = {}) => {
  const importMap = [
    ['clients', ['rubik.erp.clients']],
    ['quotes', ['rubik.erp.quotes']],
    ['documents', ['rubik.erp.documents']],
    ['tenders', ['rubik.erp.tenders']],
    ['workOrders', ['rubik.erp.workOrders']],
    ['financeMovements', ['rubik.erp.finance.movements']],
    ['suppliers', ['rubik.erp.finance.suppliers']],
  ]

  const result = {}

  for (const [key, storageKeys] of importMap) {
    const items = readImportCollection(payload, key, storageKeys)
    result[key] = await upsertMany(key, items)
  }

  return {
    importedAt: new Date().toISOString(),
    counts: await getCounts(),
    result,
  }
}

const getCounts = async () =>
  withDatabaseError(async () => ({
    users: await getPrisma().user.count(),
    clients: await getPrisma().client.count(),
    quotes: await getPrisma().quote.count(),
    documents: await getPrisma().document.count(),
    tenders: await getPrisma().tender.count(),
    workOrders: await getPrisma().workOrder.count(),
    financeMovements: await getPrisma().financialMovement.count(),
    suppliers: await getPrisma().supplier.count(),
  }))

module.exports = {
  login,
  getUserByToken,
  list,
  create,
  update,
  remove,
  findById,
  getDashboard,
  createReceivableFromQuote,
  getFinanceSummary,
  registerPayment,
  importLocalStorage,
  getCounts,
  upsertMany,
}
