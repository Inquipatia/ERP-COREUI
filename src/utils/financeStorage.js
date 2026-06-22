import { createLocalId, STORAGE_KEYS, useLocalStorageState } from './storage'
import {
  appendAuditLog,
  calculateFinanceMovement,
  calculateNetFromGross,
  createAuditEntry,
  getNumberValue,
  validateRut,
} from './financeCalculations'

export const FINANCE_STORAGE_KEYS = {
  movements: STORAGE_KEYS.financeMovements || 'rubik.erp.finance.movements',
  suppliers: STORAGE_KEYS.suppliers || 'rubik.erp.finance.suppliers',
}

export const FINANCE_MOVEMENT_TYPES = ['Ingreso', 'Egreso']
export const FINANCE_DOCUMENT_TYPES = [
  'Factura afecta',
  'Factura exenta',
  'Boleta',
  'Boleta de honorarios',
  'Orden de compra',
  'Comprobante',
  'Contrato',
  'Sin documento',
]
export const FINANCE_CATEGORIES = [
  'Venta',
  'Cliente',
  'Proveedor',
  'Insumos',
  'Producción',
  'Instalación',
  'Arriendo',
  'Servicios básicos',
  'Software',
  'Marketing',
  'Remuneraciones',
  'Impuestos',
  'Transporte',
  'Bodega',
  'Mantención',
  'Otro',
]
export const FINANCE_PAYMENT_METHODS = [
  'Transferencia',
  'Efectivo',
  'Tarjeta débito',
  'Tarjeta crédito',
  'Cheque',
  'Webpay',
  'MercadoPago',
  'Otro',
]
export const FINANCE_STATUSES = [
  'Sin pagar',
  'Pago parcial',
  'Pagado',
  'Vencido',
  'Anulado',
]

export const emptyFinancialMovement = {
  id: '',
  type: 'Ingreso',
  category: 'Venta',
  documentType: 'Factura afecta',
  documentNumber: '',
  client: '',
  company: '',
  supplierId: '',
  supplierName: '',
  quoteNumber: '',
  tenderId: '',
  workOrderId: '',
  description: '',
  netAmount: '',
  taxRate: 19,
  taxAmount: 0,
  isTaxExempt: false,
  totalAmount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  issueDate: '',
  dueDate: '',
  paymentDate: '',
  paymentTerms: '',
  status: 'Sin pagar',
  paymentMethod: 'Transferencia',
  responsibleName: '',
  responsibleEmail: '',
  observations: '',
  auditLog: [],
  createdAt: '',
  updatedAt: '',

  // Backward-compatible aliases used by earlier views.
  relatedModule: '',
  relatedId: '',
  relatedName: '',
  clientSupplierName: '',
  clientSupplierRut: '',
  ivaRate: 19,
  taxExempt: false,
  ivaAmount: 0,
  balanceAmount: 0,
  notes: '',
  attachmentName: '',
}

export const emptyFinanceMovement = emptyFinancialMovement

export const emptySupplier = {
  id: '',
  name: '',
  rut: '',
  contactName: '',
  phone: '',
  email: '',
  category: 'Proveedor',
  paymentTerms: 'Contado',
  bankName: '',
  bankAccountType: '',
  bankAccountNumber: '',
  bankAccountEmail: '',
  status: 'Activo',
  observations: '',
  notes: '',
  createdAt: '',
  updatedAt: '',
}

const today = () => new Date().toISOString().slice(0, 10)

const getOffsetDate = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const normalizeSearchText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const normalizeAuditLog = (auditLog, fallbackEntry) => {
  if (Array.isArray(auditLog) && auditLog.length > 0) return auditLog
  return fallbackEntry ? [fallbackEntry] : []
}

export const normalizeFinanceMovement = (movement = {}) => {
  const now = new Date().toISOString()
  const calc = calculateFinanceMovement({
    ...movement,
    taxRate: movement.taxRate ?? movement.ivaRate,
    isTaxExempt: movement.isTaxExempt ?? movement.taxExempt,
  })
  const supplierName =
    movement.supplierName || movement.clientSupplierName || movement.relatedName || ''
  const observations = movement.observations || movement.notes || ''
  const normalizedStatus = movement.status === 'Anulado' ? 'Anulado' : calc.calculatedStatus
  const createdAt = movement.createdAt || now

  return {
    ...emptyFinancialMovement,
    ...movement,
    id: movement.id || createLocalId('fin'),
    type: movement.type || 'Ingreso',
    category: movement.category || (movement.type === 'Egreso' ? 'Proveedor' : 'Venta'),
    documentType: movement.documentType || 'Factura afecta',
    documentNumber: movement.documentNumber || '',
    client: movement.client || (movement.type === 'Ingreso' ? movement.clientSupplierName || '' : ''),
    company: movement.company || '',
    supplierId: movement.supplierId || '',
    supplierName,
    quoteNumber: movement.quoteNumber || '',
    tenderId: movement.tenderId || '',
    workOrderId: movement.workOrderId || '',
    description: movement.description || '',
    netAmount: calc.netAmount,
    taxRate: calc.taxRate,
    taxAmount: calc.taxAmount,
    isTaxExempt: calc.isTaxExempt,
    totalAmount: calc.totalAmount,
    paidAmount: calc.paidAmount,
    pendingAmount: calc.pendingAmount,
    issueDate: movement.issueDate || today(),
    dueDate: movement.dueDate || '',
    paymentDate: movement.paymentDate || '',
    paymentTerms: movement.paymentTerms || movement.condition || '',
    status: normalizedStatus,
    paymentMethod: movement.paymentMethod || 'Transferencia',
    responsibleName: movement.responsibleName || '',
    responsibleEmail: movement.responsibleEmail || '',
    observations,
    auditLog: normalizeAuditLog(
      movement.auditLog,
      createAuditEntry({ action: 'Creación local', details: 'Movimiento normalizado.' }),
    ),
    createdAt,
    updatedAt: movement.updatedAt || now,

    relatedModule: movement.relatedModule || '',
    relatedId: movement.relatedId || '',
    relatedName: movement.relatedName || '',
    clientSupplierName: movement.clientSupplierName || supplierName || movement.client || '',
    clientSupplierRut: movement.clientSupplierRut || '',
    ivaRate: calc.taxRate,
    taxExempt: calc.isTaxExempt,
    ivaAmount: calc.taxAmount,
    balanceAmount: calc.pendingAmount,
    notes: observations,
    attachmentName: movement.attachmentName || '',
  }
}

export const createFinanceMovementPayload = (movement, { currentUser, action } = {}) => {
  const normalizedMovement = normalizeFinanceMovement({
    ...movement,
    responsibleName: movement.responsibleName || currentUser?.name || '',
    responsibleEmail: movement.responsibleEmail || currentUser?.email || '',
    updatedAt: new Date().toISOString(),
  })

  return {
    ...normalizedMovement,
    auditLog: appendAuditLog(
      normalizedMovement.auditLog,
      createAuditEntry({
        action: action || 'Guardado',
        user: currentUser,
        details: `${normalizedMovement.type} ${normalizedMovement.documentNumber || ''}`.trim(),
      }),
    ),
  }
}

export const normalizeSupplier = (supplier = {}) => {
  const now = new Date().toISOString()

  return {
    ...emptySupplier,
    ...supplier,
    id: supplier.id || createLocalId('sup'),
    name: supplier.name || supplier.company || '',
    rut: supplier.rut || '',
    category: supplier.category || 'Proveedor',
    paymentTerms: supplier.paymentTerms || 'Contado',
    status: supplier.status || 'Activo',
    observations: supplier.observations || supplier.notes || '',
    notes: supplier.notes || supplier.observations || '',
    createdAt: supplier.createdAt || now,
    updatedAt: supplier.updatedAt || now,
  }
}

export const supplierHasValidRut = (supplier = {}) => !supplier.rut || validateRut(supplier.rut)

export const mockSuppliers = [
  normalizeSupplier({
    id: 'sup-grafica-santiago',
    name: 'Proveedor Gráfica Santiago',
    rut: '76.000.000-0',
    contactName: 'Contacto proveedor',
    email: 'proveedor@example.com',
    category: 'Insumos',
    paymentTerms: '30 días',
  }),
  normalizeSupplier({
    id: 'sup-instalaciones-rubik',
    name: 'Servicios Instalación Rubik',
    rut: '77.000.000-9',
    contactName: 'Coordinación instalación',
    email: 'instalaciones@example.com',
    category: 'Instalación',
    paymentTerms: '50% anticipo / 50% contra entrega',
  }),
]

export const mockFinanceMovements = [
  normalizeFinanceMovement({
    id: 'fin-demo-ingreso-1',
    type: 'Ingreso',
    category: 'Venta',
    description: 'Cotización gráfica institucional',
    documentType: 'Factura afecta',
    documentNumber: 'F-1001',
    client: 'Cliente ejemplo',
    company: 'Empresa ejemplo',
    clientSupplierName: 'Cliente ejemplo',
    netAmount: 1200000,
    paidAmount: 0,
    issueDate: today(),
    dueDate: getOffsetDate(15),
    observations: 'Movimiento de ejemplo para flujo de caja.',
  }),
  normalizeFinanceMovement({
    id: 'fin-demo-egreso-1',
    type: 'Egreso',
    category: 'Insumos',
    description: 'Compra de materiales producción',
    documentType: 'Factura afecta',
    documentNumber: 'F-2001',
    supplierName: 'Proveedor Gráfica Santiago',
    clientSupplierName: 'Proveedor Gráfica Santiago',
    netAmount: 350000,
    paidAmount: 416500,
    issueDate: today(),
    dueDate: today(),
    paymentDate: today(),
    observations: 'Egreso pagado de ejemplo.',
  }),
]

export const useFinanceMovements = (initialMovements = mockFinanceMovements) => {
  const [movements, setMovements] = useLocalStorageState(
    FINANCE_STORAGE_KEYS.movements,
    initialMovements.map(normalizeFinanceMovement),
  )

  return [movements.map(normalizeFinanceMovement), setMovements]
}

export const useSuppliers = (initialSuppliers = mockSuppliers) => {
  const [suppliers, setSuppliers] = useLocalStorageState(
    FINANCE_STORAGE_KEYS.suppliers,
    initialSuppliers.map(normalizeSupplier),
  )

  return [suppliers.map(normalizeSupplier), setSuppliers]
}

const normalizeQuoteStatus = (status = '') => normalizeSearchText(status)

export const APPROVED_QUOTE_STATUSES = [
  'aprobada',
  'adjudicada',
  'aceptada',
  'aceptado',
  'emitida',
]

export const isQuoteApprovedForReceivable = (quote = {}) =>
  APPROVED_QUOTE_STATUSES.includes(normalizeQuoteStatus(quote.status || quote.estado))

const normalizeDateForInput = (date = '') => {
  const value = String(date || '').trim()
  if (!value) return today()

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const dayMonthYear = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const parsedDate = new Date(value)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10)
  }

  return today()
}

const getQuoteItems = (quote = {}) => {
  if (Array.isArray(quote.items)) return quote.items
  if (Array.isArray(quote.quoteItems)) return quote.quoteItems
  if (Array.isArray(quote.payload?.quoteItems)) return quote.payload.quoteItems
  return []
}

const getQuoteNumber = (quote = {}) =>
  String(
    quote.quoteNumber ||
      quote.number ||
      quote.numeroDocumento ||
      quote.payload?.quote?.quoteNumber ||
      '',
  ).trim()

const getQuoteClient = (quote = {}) =>
  quote.client ||
  quote.clientName ||
  quote.cliente ||
  quote.payload?.client?.client ||
  quote.payload?.client?.attention ||
  ''

const getQuoteCompany = (quote = {}) => quote.company || quote.empresa || quote.payload?.client?.company || ''

const getQuoteSeller = (quote = {}) =>
  quote.seller ||
  quote.vendedor ||
  quote.sellerName ||
  quote.payload?.seller?.name ||
  quote.payload?.seller?.email ||
  ''

const getQuoteSubject = (quote = {}) =>
  quote.subject || quote.tema || quote.topic || quote.payload?.quote?.subject || ''

const getQuoteCondition = (quote = {}) =>
  quote.condition || quote.condicion || quote.payload?.quote?.condition || ''

const getQuoteFinancialAmounts = (quote = {}) => {
  const rawNet = getNumberValue(quote.net ?? quote.montoNeto ?? quote.amounts?.net ?? quote.payload?.amounts?.net)
  const rawIva = getNumberValue(quote.iva ?? quote.taxAmount ?? quote.amounts?.iva ?? quote.payload?.amounts?.iva)
  const rawTotal = getNumberValue(
    quote.total ?? quote.totalAmount ?? quote.amounts?.total ?? quote.payload?.amounts?.total,
  )

  const netAmount = rawNet || (rawTotal ? calculateNetFromGross(rawTotal, 19, false) : 0)
  const taxRate = netAmount > 0 && rawIva > 0 ? (rawIva / netAmount) * 100 : 19

  return {
    netAmount,
    taxAmount: rawIva,
    totalAmount: rawTotal,
    taxRate,
  }
}

const quoteMatchesMovement = (movement = {}, quote = {}, { includeAdditional = true } = {}) => {
  const quoteNumber = typeof quote === 'string' ? quote : getQuoteNumber(quote)
  const quoteId = typeof quote === 'object' ? String(quote.id || '') : ''
  const normalizedMovement = normalizeFinanceMovement(movement)

  if (normalizedMovement.type !== 'Ingreso') return false
  if (normalizedMovement.status === 'Anulado') return false
  if (!includeAdditional && normalizedMovement.isAdditionalMovement) return false

  const movementQuoteNumber = String(normalizedMovement.quoteNumber || '').trim()
  const movementRelatedId = String(normalizedMovement.relatedId || '').trim()
  const movementSourceQuoteId = String(normalizedMovement.sourceQuoteId || '').trim()
  const movementDocumentNumber = String(normalizedMovement.documentNumber || '').trim()

  return Boolean(
    (quoteNumber && movementQuoteNumber === quoteNumber) ||
      (quoteNumber && movementDocumentNumber === `COT-${quoteNumber}`) ||
      (quoteId && movementRelatedId === quoteId) ||
      (quoteId && movementSourceQuoteId === quoteId),
  )
}

export const quoteHasFinancialMovement = (movements = [], quote = {}, options = {}) =>
  (Array.isArray(movements) ? movements : []).some((movement) =>
    quoteMatchesMovement(movement, quote, { includeAdditional: false, ...options }),
  )

export const getQuoteFinancialStatus = (movements = [], quote = {}) => {
  const quoteMovements = (Array.isArray(movements) ? movements : [])
    .filter((movement) => quoteMatchesMovement(movement, quote, { includeAdditional: true }))
    .map(normalizeFinanceMovement)
    .sort((firstMovement, secondMovement) =>
      String(secondMovement.updatedAt || '').localeCompare(String(firstMovement.updatedAt || '')),
    )

  const primaryMovement =
    quoteMovements.find((movement) => !movement.isAdditionalMovement) || quoteMovements[0]

  if (!primaryMovement) return 'Sin cuenta por cobrar'
  if (primaryMovement.status === 'Pagado') return 'Pagada'
  if (primaryMovement.status === 'Pago parcial') return 'Pago parcial'
  if (primaryMovement.status === 'Vencido') return 'Vencida'
  return 'Por cobrar'
}

export const createReceivableFromQuote = (
  quote = {},
  {
    currentUser,
    dueDate = '',
    paidAmount = 0,
    paymentDate = '',
    paymentMethod = 'Transferencia',
    paymentTerms = '',
    observations = '',
    isAdditionalMovement = false,
  } = {},
) => {
  const quoteNumber = getQuoteNumber(quote)
  const client = getQuoteClient(quote)
  const company = getQuoteCompany(quote)
  const seller = getQuoteSeller(quote)
  const subject = getQuoteSubject(quote)
  const condition = paymentTerms || getQuoteCondition(quote)
  const quoteDate = normalizeDateForInput(quote.date || quote.fecha || quote.payload?.quote?.date)
  const amounts = getQuoteFinancialAmounts(quote)
  const quoteItems = getQuoteItems(quote)
  const description =
    subject ||
    quoteItems[0]?.description ||
    `Cuenta por cobrar cotizacion ${quoteNumber || company || client}`.trim()

  return createFinanceMovementPayload(
    {
      type: 'Ingreso',
      category: 'Venta',
      documentType: 'Sin documento',
      documentNumber: quoteNumber ? `COT-${quoteNumber}` : '',
      client,
      company,
      clientSupplierName: company || client,
      quoteNumber,
      sourceQuoteId: quote.id || '',
      sourceType: 'quote',
      quoteSourceLocked: true,
      isAdditionalMovement,
      relatedModule: 'Cotizaciones',
      relatedId: quote.id || quoteNumber,
      relatedName: quoteNumber ? `Cotizacion ${quoteNumber}` : 'Cotizacion',
      description,
      netAmount: amounts.netAmount,
      taxRate: amounts.taxRate,
      isTaxExempt: amounts.taxRate <= 0,
      paidAmount,
      issueDate: quoteDate,
      dueDate: dueDate || quoteDate,
      paymentDate: paymentDate || (getNumberValue(paidAmount) > 0 ? today() : ''),
      paymentMethod,
      paymentTerms: condition,
      responsibleName: seller || currentUser?.name || '',
      responsibleEmail: currentUser?.email || '',
      observations,
      notes: observations,
      attachmentName: '',
    },
    { currentUser, action: isAdditionalMovement ? 'Abono extraordinario desde cotizacion' : 'Cuenta por cobrar desde cotizacion' },
  )
}

export const financeMovementMatchesFilters = (movement = {}, filters = {}) => {
  const query = normalizeSearchText(filters.search || '')
  const normalizedMovement = normalizeFinanceMovement(movement)
  const searchHaystack = [
    normalizedMovement.description,
    normalizedMovement.documentNumber,
    normalizedMovement.client,
    normalizedMovement.company,
    normalizedMovement.supplierName,
    normalizedMovement.clientSupplierName,
    normalizedMovement.clientSupplierRut,
    normalizedMovement.category,
    normalizedMovement.status,
    normalizedMovement.observations,
    normalizedMovement.quoteNumber,
    normalizedMovement.tenderId,
    normalizedMovement.workOrderId,
  ].map(normalizeSearchText)

  const matchesSearch = !query || searchHaystack.some((value) => value.includes(query))
  const matchesType = !filters.type || normalizedMovement.type === filters.type
  const matchesStatus = !filters.status || normalizedMovement.status === filters.status
  const matchesCategory = !filters.category || normalizedMovement.category === filters.category

  return matchesSearch && matchesType && matchesStatus && matchesCategory
}

export const supplierMatchesSearch = (supplier = {}, search = '') => {
  const query = normalizeSearchText(search)
  if (!query) return true

  const normalizedSupplier = normalizeSupplier(supplier)
  return [
    normalizedSupplier.name,
    normalizedSupplier.rut,
    normalizedSupplier.contactName,
    normalizedSupplier.email,
    normalizedSupplier.category,
    normalizedSupplier.paymentTerms,
  ]
    .map(normalizeSearchText)
    .some((value) => value.includes(query))
}
