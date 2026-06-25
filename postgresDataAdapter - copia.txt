const { randomUUID } = require('node:crypto')
const { calculateFinanceMovement, getNumberValue, registerMovementPayment } = require('../utils/financeCalculations')
const { getPrisma } = require('./prismaClient')

const TEMP_DEV_PASSWORD = '123456'
const sessions = new Map()

const modelByKey = {
  users: 'user',
  clients: 'client',
  quotes: 'quote',
  documents: 'document',
  tenders: 'tender',
  workOrders: 'workOrder',
  suppliers: 'supplier',
  financeMovements: 'financialMovement',
  payments: 'payment',
  auditLogs: 'auditLog',
}

const createId = (prefix) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`

const toDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const toDateOnly = (value) => {
  const date = toDate(value)
  return date ? date.toISOString().slice(0, 10) : ''
}

const toIso = (value) => {
  const date = toDate(value)
  return date ? date.toISOString() : ''
}

const toNumber = (value) => Number(value || 0)

const emptyToNull = (value) => (value === '' || value === undefined ? null : value)

const sanitizeUser = (user = {}) => {
  const { password, ...safeUser } = user
  return safeUser
}

const cleanPayload = (payload = {}) =>
  Object.entries(payload).reduce((result, [key, value]) => {
    if (value !== undefined) result[key] = value
    return result
  }, {})

const getModel = (key) => {
  const modelName = modelByKey[key]
  if (!modelName) throw new Error(`Modelo no soportado por PostgreSQL: ${key}`)
  return getPrisma()[modelName]
}

const serializeUser = (record = {}) => ({
  id: record.id,
  name: record.name,
  email: record.email,
  role: record.role,
  status: record.status,
  position: record.position || '',
  area: record.area || '',
  permissions: record.permissions || [],
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeClient = (record = {}) => ({
  id: record.id,
  contactName: record.contactName || record.contact || '',
  contact: record.contact || record.contactName || '',
  company: record.company || '',
  rut: record.rut || '',
  phone: record.phone || '',
  email: record.email || '',
  commune: record.commune || '',
  address: record.address || '',
  status: record.status || 'Activo',
  observations: record.observations || '',
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeQuote = (record = {}) => ({
  id: record.id,
  quoteNumber: record.quoteNumber,
  date: toDateOnly(record.date),
  client: record.client || '',
  company: record.company || '',
  seller: record.seller || '',
  subject: record.subject || '',
  condition: record.condition || '',
  status: record.status || 'Borrador',
  netAmount: toNumber(record.netAmount),
  taxAmount: toNumber(record.taxAmount),
  totalAmount: toNumber(record.totalAmount),
  net: toNumber(record.netAmount),
  iva: toNumber(record.taxAmount),
  total: toNumber(record.totalAmount),
  items: Array.isArray(record.items) ? record.items : [],
  payload: record.payload || null,
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeDocument = (record = {}) => ({
  id: record.id,
  type: record.type,
  tipoDocumento: record.type,
  documentNumber: record.documentNumber,
  numeroDocumento: record.documentNumber,
  date: toDateOnly(record.date),
  fecha: toDateOnly(record.date),
  client: record.client || '',
  cliente: record.client || '',
  company: record.company || '',
  empresa: record.company || '',
  seller: record.seller || '',
  vendedor: record.seller || '',
  netAmount: toNumber(record.netAmount),
  montoNeto: toNumber(record.netAmount),
  taxAmount: toNumber(record.taxAmount),
  iva: toNumber(record.taxAmount),
  totalAmount: toNumber(record.totalAmount),
  total: toNumber(record.totalAmount),
  status: record.status || 'Borrador',
  estado: record.status || 'Borrador',
  origin: record.origin || '',
  origen: record.origin || '',
  tags: Array.isArray(record.tags) ? record.tags : [],
  observations: record.observations || '',
  observaciones: record.observations || '',
  archivoPdfUrl: record.filePdfUrl || '',
  archivoExcelUrl: record.fileExcelUrl || '',
  items: Array.isArray(record.items) ? record.items : [],
  payload: record.payload || null,
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeTender = (record = {}) => ({
  ...record,
  budget: record.budget === null || record.budget === undefined ? null : toNumber(record.budget),
  closingDate: toDateOnly(record.closingDate),
  openingDate: toDateOnly(record.openingDate),
  adjudicationDate: toDateOnly(record.adjudicationDate),
  contractSignDate: toDateOnly(record.contractSignDate),
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeWorkOrder = (record = {}) => ({
  ...record,
  dueDate: toDateOnly(record.dueDate),
  comments: Array.isArray(record.comments) ? record.comments : [],
  movements: Array.isArray(record.movements) ? record.movements : [],
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeSupplier = (record = {}) => ({
  ...record,
  observations: record.observations || '',
  createdAt: toIso(record.createdAt),
  updatedAt: toIso(record.updatedAt),
})

const serializeFinancialMovement = (record = {}) =>
  calculateFinanceMovement({
    ...record,
    netAmount: toNumber(record.netAmount),
    taxRate: toNumber(record.taxRate),
    taxAmount: toNumber(record.taxAmount),
    totalAmount: toNumber(record.totalAmount),
    paidAmount: toNumber(record.paidAmount),
    pendingAmount: toNumber(record.pendingAmount),
    issueDate: toDateOnly(record.issueDate),
    dueDate: toDateOnly(record.dueDate),
    paymentDate: toDateOnly(record.paymentDate),
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  })

const serializerByKey = {
  users: serializeUser,
  clients: serializeClient,
  quotes: serializeQuote,
  documents: serializeDocument,
  tenders: serializeTender,
  workOrders: serializeWorkOrder,
  suppliers: serializeSupplier,
  financeMovements: serializeFinancialMovement,
}

const serialize = (key, record) => (serializerByKey[key] || ((item) => item))(record)

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''

const getNaturalUniqueWhere = (key, data = {}) => {
  if (key === 'users' && hasValue(data.email)) return { email: data.email }
  if (key === 'quotes' && hasValue(data.quoteNumber)) return { quoteNumber: data.quoteNumber }
  if (key === 'documents' && hasValue(data.type) && hasValue(data.documentNumber)) {
    return { type_documentNumber: { type: data.type, documentNumber: data.documentNumber } }
  }
  if (key === 'tenders' && hasValue(data.tenderId)) return { tenderId: data.tenderId }
  if (key === 'suppliers' && hasValue(data.rut)) return { rut: data.rut }
  return null
}

const getExistingForUpsert = async (model, key, data = {}) => {
  if (hasValue(data.id)) {
    const existingById = await model.findUnique({ where: { id: data.id } })
    if (existingById) return { record: existingById, where: { id: data.id }, matchedById: true }
  }

  const naturalWhere = getNaturalUniqueWhere(key, data)
  if (!naturalWhere) return { record: null, where: null, matchedById: false }

  const existingByNaturalKey = await model.findUnique({ where: naturalWhere })
  return { record: existingByNaturalKey, where: naturalWhere, matchedById: false }
}

const normalizeForPrisma = (key, payload = {}) => {
  const now = new Date()

  if (key === 'users') {
    return cleanPayload({
      id: payload.id || createId('usr'),
      name: payload.name || '',
      email: String(payload.email || '').trim().toLowerCase(),
      password: payload.password || TEMP_DEV_PASSWORD,
      role: payload.role || payload.position || 'Ventas',
      status: payload.status || 'Activo',
      position: payload.position || payload.role || '',
      area: payload.area || '',
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'clients') {
    return cleanPayload({
      id: payload.id || createId('client'),
      contactName: payload.contactName || payload.contact || payload.cliente || '',
      contact: payload.contact || payload.contactName || '',
      company: payload.company || payload.empresa || '',
      rut: payload.rut || '',
      phone: payload.phone || payload.telefono || '',
      email: payload.email || '',
      commune: payload.commune || payload.comuna || '',
      address: payload.address || payload.direccion || '',
      status: payload.status || payload.estado || 'Activo',
      observations: payload.observations || payload.observaciones || '',
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'quotes') {
    return cleanPayload({
      id: payload.id || createId('quote'),
      quoteNumber: String(payload.quoteNumber || payload.numeroDocumento || payload.number || Date.now()),
      date: toDate(payload.date || payload.fecha),
      client: payload.client || payload.cliente || '',
      company: payload.company || payload.empresa || '',
      seller: payload.seller || payload.vendedor || '',
      subject: payload.subject || payload.tema || '',
      condition: payload.condition || payload.condicion || '',
      status: payload.status || payload.estado || 'Borrador',
      netAmount: toNumber(payload.netAmount ?? payload.net ?? payload.montoNeto),
      taxAmount: toNumber(payload.taxAmount ?? payload.iva),
      totalAmount: toNumber(payload.totalAmount ?? payload.total),
      items: Array.isArray(payload.items) ? payload.items : [],
      payload: payload.payload || payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'documents') {
    return cleanPayload({
      id: payload.id || createId('doc'),
      type: payload.type || payload.tipoDocumento || 'Documento',
      documentNumber: String(payload.documentNumber || payload.numeroDocumento || payload.quoteNumber || Date.now()),
      date: toDate(payload.date || payload.fecha),
      client: payload.client || payload.cliente || '',
      company: payload.company || payload.empresa || '',
      seller: payload.seller || payload.vendedor || '',
      netAmount: toNumber(payload.netAmount ?? payload.montoNeto ?? payload.net),
      taxAmount: toNumber(payload.taxAmount ?? payload.iva),
      totalAmount: toNumber(payload.totalAmount ?? payload.total),
      status: payload.status || payload.estado || 'Borrador',
      origin: payload.origin || payload.origen || '',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      observations: payload.observations || payload.observaciones || '',
      filePdfUrl: payload.filePdfUrl || payload.archivoPdfUrl || '',
      fileExcelUrl: payload.fileExcelUrl || payload.archivoExcelUrl || '',
      items: Array.isArray(payload.items) ? payload.items : [],
      payload: payload.payload || payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'tenders') {
    return cleanPayload({
      id: payload.id || createId('tender'),
      tenderId: emptyToNull(payload.tenderId),
      title: payload.title || payload.name || 'Licitacion',
      buyer: payload.buyer || '',
      buyerRut: payload.buyerRut || '',
      budget: payload.budget === '' ? null : payload.budget,
      closingDate: toDate(payload.closingDate),
      openingDate: toDate(payload.openingDate),
      adjudicationDate: toDate(payload.adjudicationDate),
      contractSignDate: toDate(payload.contractSignDate),
      status: payload.status || 'Borrador',
      riskLevel: payload.riskLevel || 'Medio',
      object: payload.object || '',
      summary: payload.summary || '',
      administrativeRequirements: payload.administrativeRequirements || [],
      technicalRequirements: payload.technicalRequirements || [],
      economicRequirements: payload.economicRequirements || [],
      requiredDocuments: payload.requiredDocuments || [],
      essentialDocuments: payload.essentialDocuments || [],
      evaluationCriteria: payload.evaluationCriteria || [],
      guarantees: payload.guarantees || [],
      paymentTerms: payload.paymentTerms || '',
      penalties: payload.penalties || [],
      risks: payload.risks || [],
      suggestedQuestions: payload.suggestedQuestions || [],
      technicalItems: payload.technicalItems || [],
      observations: payload.observations || '',
      sourceText: payload.sourceText || '',
      sourceFiles: payload.sourceFiles || [],
      fieldSources: payload.fieldSources || {},
      diagnostics: payload.diagnostics || {},
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'workOrders') {
    return cleanPayload({
      id: payload.id || createId('wo'),
      title: payload.title || 'Orden de trabajo',
      type: payload.type || 'Administrativo',
      client: payload.client || '',
      company: payload.company || '',
      quoteNumber: payload.quoteNumber || '',
      requesterName: payload.requesterName || payload.requestedBy || '',
      requesterEmail: payload.requesterEmail || '',
      requesterRole: payload.requesterRole || '',
      assigneeName: payload.assigneeName || payload.assignedTo || '',
      assigneeEmail: payload.assigneeEmail || '',
      assigneeRole: payload.assigneeRole || '',
      sourceArea: payload.sourceArea || '',
      targetArea: payload.targetArea || '',
      priority: payload.priority || 'Media',
      status: payload.status || 'Pendiente',
      dueDate: toDate(payload.dueDate),
      description: payload.description || '',
      requirements: payload.requirements || '',
      deliverables: payload.deliverables || '',
      observations: payload.observations || '',
      comments: Array.isArray(payload.comments) ? payload.comments : [],
      movements: Array.isArray(payload.movements) ? payload.movements : [],
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'suppliers') {
    return cleanPayload({
      id: payload.id || createId('sup'),
      name: payload.name || payload.company || 'Proveedor',
      rut: emptyToNull(payload.rut),
      contactName: payload.contactName || '',
      phone: payload.phone || '',
      email: payload.email || '',
      category: payload.category || 'Proveedor',
      paymentTerms: payload.paymentTerms || '',
      bankName: payload.bankName || '',
      bankAccountType: payload.bankAccountType || '',
      bankAccountNumber: payload.bankAccountNumber || '',
      bankAccountEmail: payload.bankAccountEmail || '',
      status: payload.status || 'Activo',
      observations: payload.observations || payload.notes || '',
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  if (key === 'financeMovements') {
    const calculated = calculateFinanceMovement(payload)
    return cleanPayload({
      id: payload.id || createId('fin'),
      type: calculated.type || 'Ingreso',
      category: calculated.category || 'Venta',
      documentType: calculated.documentType || '',
      documentNumber: calculated.documentNumber || '',
      client: calculated.client || '',
      company: calculated.company || '',
      supplierId: emptyToNull(calculated.supplierId),
      supplierName: calculated.supplierName || '',
      quoteId: emptyToNull(calculated.quoteId),
      quoteNumber: calculated.quoteNumber || '',
      tenderId: calculated.tenderId || '',
      workOrderId: calculated.workOrderId || '',
      description: calculated.description || '',
      netAmount: calculated.netAmount,
      taxRate: calculated.taxRate,
      taxAmount: calculated.taxAmount,
      isTaxExempt: Boolean(calculated.isTaxExempt),
      totalAmount: calculated.totalAmount,
      paidAmount: calculated.paidAmount,
      pendingAmount: calculated.pendingAmount,
      issueDate: toDate(calculated.issueDate),
      dueDate: toDate(calculated.dueDate),
      paymentDate: toDate(calculated.paymentDate),
      status: calculated.status,
      paymentMethod: calculated.paymentMethod || '',
      paymentTerms: calculated.paymentTerms || '',
      responsibleName: calculated.responsibleName || '',
      responsibleEmail: calculated.responsibleEmail || '',
      observations: calculated.observations || '',
      sourceType: calculated.sourceType || '',
      quoteSourceLocked: Boolean(calculated.quoteSourceLocked),
      isAdditionalMovement: Boolean(calculated.isAdditionalMovement),
      auditLog: calculated.auditLog || [],
      payload,
      createdAt: toDate(payload.createdAt) || now,
      updatedAt: toDate(payload.updatedAt) || now,
    })
  }

  return cleanPayload({ ...payload, updatedAt: now })
}

const list = async (key) => {
  const model = getModel(key)
  const records = await model.findMany({ orderBy: { createdAt: 'desc' } })
  return records.map((record) => serialize(key, record))
}

const findById = async (key, id) => {
  const model = getModel(key)
  const record = await model.findUnique({ where: { id } })
  if (!record) {
    const error = new Error('Registro no encontrado.')
    error.statusCode = 404
    throw error
  }
  return serialize(key, record)
}

const create = async (key, prefix, payload) => {
  const model = getModel(key)
  const data = normalizeForPrisma(key, { id: payload.id || createId(prefix), ...payload })
  const record = await model.create({ data })
  return serialize(key, record)
}

const update = async (key, id, payload) => {
  const model = getModel(key)
  const data = normalizeForPrisma(key, { ...payload, id })
  delete data.createdAt
  const record = await model.update({ where: { id }, data })
  return serialize(key, record)
}

const remove = async (key, id) => {
  const model = getModel(key)
  await model.delete({ where: { id } })
  return { id, deleted: true }
}

const upsertMany = async (key, items = []) => {
  const model = getModel(key)
  let inserted = 0
  let updated = 0

  for (const item of Array.isArray(items) ? items : []) {
    const data = normalizeForPrisma(key, item)
    const { record: existing, where, matchedById } = await getExistingForUpsert(model, key, data)

    if (existing) {
      const updateData = { ...data }
      delete updateData.createdAt
      if (!matchedById) delete updateData.id
      await model.update({ where, data: updateData })
      updated += 1
    } else {
      await model.create({ data })
      inserted += 1
    }
  }

  return { inserted, updated }
}

const login = async ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await getPrisma().user.findUnique({ where: { email: normalizedEmail } })

  if (!user || user.status !== 'Activo' || String(user.password || TEMP_DEV_PASSWORD) !== String(password || '')) {
    const error = new Error('Credenciales invalidas.')
    error.statusCode = 401
    throw error
  }

  const token = `rubik-token-${randomUUID()}`
  const safeUser = sanitizeUser(serializeUser(user))
  sessions.set(token, safeUser)
  return { token, user: safeUser }
}

const getUserByToken = (token) => sessions.get(token) || null

const getDashboard = async (user) => {
  const prisma = getPrisma()
  const canViewFinance = user.permissions?.includes('finance.view') || user.permissions?.includes('admin.all')
  const [quotes, documents, tenders, workOrders, clients, latestDocuments, latestWorkOrders] = await Promise.all([
    prisma.quote.findMany(),
    prisma.document.count(),
    prisma.tender.count(),
    prisma.workOrder.count(),
    prisma.client.count(),
    prisma.document.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.workOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])
  const movements = canViewFinance ? await prisma.financialMovement.findMany() : []

  return {
    quotes: quotes.length,
    documents,
    tenders,
    workOrders,
    clients,
    totalQuoted: canViewFinance ? quotes.reduce((sum, quote) => sum + toNumber(quote.totalAmount), 0) : null,
    pendingFinance: canViewFinance
      ? movements.reduce((sum, movement) => sum + toNumber(movement.pendingAmount), 0)
      : null,
    latestDocuments: latestDocuments.map(serializeDocument),
    latestWorkOrders: latestWorkOrders.map(serializeWorkOrder),
  }
}

const getFinanceSummary = async () => {
  const movements = (await getPrisma().financialMovement.findMany()).map(serializeFinancialMovement)
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
}

const createReceivableFromQuote = async (quoteId, user) => {
  const quote = await findById('quotes', quoteId)
  const duplicated = await getPrisma().financialMovement.findFirst({
    where: { quoteNumber: quote.quoteNumber, isAdditionalMovement: false },
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
    documentNumber: `COT-${quote.quoteNumber}`,
    client: quote.client,
    company: quote.company,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    description: quote.subject || `Cuenta por cobrar cotizacion ${quote.quoteNumber}`,
    netAmount: quote.netAmount,
    taxRate: quote.netAmount ? (getNumberValue(quote.taxAmount) / getNumberValue(quote.netAmount)) * 100 : 19,
    paidAmount: 0,
    issueDate: quote.date,
    dueDate: quote.date,
    paymentMethod: 'Transferencia',
    responsibleName: quote.seller || user.name,
    responsibleEmail: user.email,
    sourceType: 'quote',
    quoteSourceLocked: true,
    auditLog: [{ action: 'Cuenta por cobrar desde cotizacion', userEmail: user.email, createdAt: new Date().toISOString() }],
  })
}

const registerPayment = async (movementId, payment, user) => {
  const movement = await findById('financeMovements', movementId)
  const nextMovement = registerMovementPayment(movement, payment, user)
  const updatedMovement = await update('financeMovements', movementId, nextMovement)
  const amount = getNumberValue(payment.amount ?? payment.paidAmount)

  if (amount > 0) {
    await getPrisma().payment.create({
      data: {
        id: createId('pay'),
        financialMovementId: movementId,
        amount,
        paymentDate: toDate(payment.paymentDate) || new Date(),
        paymentMethod: payment.paymentMethod || nextMovement.paymentMethod || '',
        responsibleName: user?.name || '',
        responsibleEmail: user?.email || '',
        observations: payment.observations || '',
        auditLog: nextMovement.auditLog || [],
        payload: payment,
      },
    })
  }

  return updatedMovement
}

const importLocalStorage = async (payload = {}) => {
  const importMap = [
    ['users', ['rubik.erp.users']],
    ['clients', ['rubik.erp.clients']],
    ['quotes', ['rubik.erp.quotes']],
    ['documents', ['rubik.erp.documents']],
    ['tenders', ['rubik.erp.tenders']],
    ['workOrders', ['rubik.erp.workOrders']],
    ['financeMovements', ['rubik.erp.finance.movements']],
    ['suppliers', ['rubik.erp.finance.suppliers']],
  ]
  const localStorageDump = payload.localStorage || payload.storage || payload
  const result = {}

  for (const [key, storageKeys] of importMap) {
    const rawItems = payload[key] || storageKeys.map((storageKey) => localStorageDump?.[storageKey]).find(Boolean)
    const items = typeof rawItems === 'string' ? JSON.parse(rawItems || '[]') : rawItems
    result[key] = await upsertMany(key, Array.isArray(items) ? items : [])
  }

  return { importedAt: new Date().toISOString(), counts: await getCounts(), result }
}

const getCounts = async () => {
  const prisma = getPrisma()
  const [users, clients, quotes, documents, tenders, workOrders, financeMovements, suppliers] =
    await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.quote.count(),
      prisma.document.count(),
      prisma.tender.count(),
      prisma.workOrder.count(),
      prisma.financialMovement.count(),
      prisma.supplier.count(),
    ])

  return { users, clients, quotes, documents, tenders, workOrders, financeMovements, suppliers }
}

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
