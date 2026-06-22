export const DEFAULT_IVA_RATE = 19
export const DEFAULT_TAX_RATE = DEFAULT_IVA_RATE

export const FINANCE_PAYMENT_STATUSES = [
  'Sin pagar',
  'Pago parcial',
  'Pagado',
  'Vencido',
  'Anulado',
]

export const getNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return 0

  const cleanedValue = String(value)
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsedValue = Number(cleanedValue)

  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const roundCurrency = (value) => Math.round(getNumberValue(value))

export const calculateTaxAmount = (
  netAmount,
  taxRate = DEFAULT_TAX_RATE,
  isTaxExempt = false,
) => {
  if (isTaxExempt) return 0
  return roundCurrency((roundCurrency(netAmount) * getNumberValue(taxRate)) / 100)
}

export const calculateIvaAmount = calculateTaxAmount

export const calculateTotalAmount = (
  netAmount,
  taxRate = DEFAULT_TAX_RATE,
  isTaxExempt = false,
) => roundCurrency(roundCurrency(netAmount) + calculateTaxAmount(netAmount, taxRate, isTaxExempt))

export const calculateGrossAmount = calculateTotalAmount

export const calculateNetFromGross = (
  grossAmount,
  taxRate = DEFAULT_TAX_RATE,
  isTaxExempt = false,
) => {
  const gross = roundCurrency(grossAmount)
  if (isTaxExempt) return gross
  return roundCurrency(gross / (1 + getNumberValue(taxRate) / 100))
}

export const calculatePendingAmount = (totalAmount, paidAmount) =>
  Math.max(0, roundCurrency(totalAmount) - roundCurrency(paidAmount))

export const calculateBalance = calculatePendingAmount

const parseDateOnly = (date) => {
  if (!date) return null
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return null
  parsedDate.setHours(0, 0, 0, 0)
  return parsedDate
}

export const getAutomaticPaymentStatus = ({
  totalAmount = 0,
  paidAmount = 0,
  dueDate = '',
  status = '',
} = {}) => {
  if (status === 'Anulado') return 'Anulado'

  const total = roundCurrency(totalAmount)
  const paid = roundCurrency(paidAmount)
  const pending = calculatePendingAmount(total, paid)

  if (total <= 0) return 'Sin pagar'
  if (pending <= 0) return 'Pagado'
  if (paid > 0 && pending > 0) return 'Pago parcial'

  const parsedDueDate = parseDateOnly(dueDate)
  if (parsedDueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (parsedDueDate < today) return 'Vencido'
  }

  return 'Sin pagar'
}

export const getPaymentStatus = getAutomaticPaymentStatus

export const calculateFinanceMovement = (movement = {}) => {
  const isTaxExempt = Boolean(movement.isTaxExempt ?? movement.taxExempt)
  const taxRate =
    movement.taxRate === '' || movement.taxRate === undefined
      ? getNumberValue(movement.ivaRate ?? DEFAULT_TAX_RATE)
      : getNumberValue(movement.taxRate)
  const netAmount = roundCurrency(movement.netAmount)
  const taxAmount = calculateTaxAmount(netAmount, taxRate, isTaxExempt)
  const totalAmount = calculateTotalAmount(netAmount, taxRate, isTaxExempt)
  const paidAmount = Math.min(roundCurrency(movement.paidAmount), totalAmount)
  const pendingAmount = calculatePendingAmount(totalAmount, paidAmount)
  const calculatedStatus = getAutomaticPaymentStatus({
    totalAmount,
    paidAmount,
    dueDate: movement.dueDate,
    status: movement.status,
  })

  return {
    taxRate,
    ivaRate: taxRate,
    isTaxExempt,
    taxExempt: isTaxExempt,
    netAmount,
    taxAmount,
    ivaAmount: taxAmount,
    totalAmount,
    paidAmount,
    pendingAmount,
    balanceAmount: pendingAmount,
    calculatedStatus,
  }
}

export const createAuditEntry = ({ action, user, details = '' } = {}) => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  action: action || 'Actualización',
  details,
  userName: user?.name || user?.responsibleName || '',
  userEmail: user?.email || user?.responsibleEmail || '',
  createdAt: new Date().toISOString(),
})

export const appendAuditLog = (auditLog = [], entry) => [
  ...(Array.isArray(auditLog) ? auditLog : []),
  entry || createAuditEntry(),
]

export const validateFinanceMovement = (movement = {}) => {
  const errors = []
  const calc = calculateFinanceMovement(movement)
  const status = movement.status === 'Anulado' ? 'Anulado' : calc.calculatedStatus

  if (!String(movement.type || '').trim()) errors.push('Selecciona si es ingreso o egreso.')
  if (!String(movement.category || '').trim()) errors.push('Selecciona una categoría.')
  if (!String(movement.description || '').trim()) errors.push('Ingresa una descripción.')
  if (!String(movement.issueDate || '').trim()) errors.push('Ingresa fecha de emisión.')
  if (calc.netAmount <= 0) errors.push('El monto neto debe ser mayor a cero.')
  if (roundCurrency(movement.paidAmount) > calc.totalAmount) {
    errors.push('El monto pagado no puede ser mayor al total.')
  }
  if (status === 'Pagado' && !String(movement.paymentDate || '').trim()) {
    errors.push('Si está pagado, debe tener fecha de pago.')
  }
  if (status === 'Anulado' && !String(movement.observations || movement.notes || '').trim()) {
    errors.push('Si está anulado, debe registrar una observación.')
  }

  const issueDate = parseDateOnly(movement.issueDate)
  const dueDate = parseDateOnly(movement.dueDate)
  if (issueDate && dueDate && dueDate < issueDate) {
    errors.push('La fecha de vencimiento no puede ser anterior a la emisión.')
  }

  return errors
}

export const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(roundCurrency(value))

export const formatDate = (date) => {
  const parsedDate = parseDateOnly(date)
  if (!parsedDate) return date ? String(date) : '-'
  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

export const validateRut = (rut = '') => {
  const cleanedRut = String(rut).replace(/\./g, '').replace(/-/g, '').trim().toLowerCase()
  if (!/^[0-9]+[0-9k]$/.test(cleanedRut)) return false

  const body = cleanedRut.slice(0, -1)
  const verifier = cleanedRut.slice(-1)
  let sum = 0
  let multiplier = 2

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const expected = 11 - (sum % 11)
  const expectedVerifier = expected === 11 ? '0' : expected === 10 ? 'k' : String(expected)

  return verifier === expectedVerifier
}

export const getDaysUntilDue = (dueDate = '') => {
  const parsedDueDate = parseDateOnly(dueDate)
  if (!parsedDueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.ceil((parsedDueDate.getTime() - today.getTime()) / 86400000)
}

export const summarizeMovements = (movements = []) =>
  (Array.isArray(movements) ? movements : []).reduce(
    (summary, movement) => {
      const calc = calculateFinanceMovement(movement)
      const isIncome = movement.type === 'Ingreso'
      const isExpense = movement.type === 'Egreso'

      summary.totalIncome += isIncome ? calc.totalAmount : 0
      summary.totalExpenses += isExpense ? calc.totalAmount : 0
      summary.receivable += isIncome ? calc.pendingAmount : 0
      summary.payable += isExpense ? calc.pendingAmount : 0
      summary.totalPaid += calc.paidAmount
      summary.totalPending += calc.pendingAmount
      summary.totalBalance += calc.pendingAmount
      summary.cashFlow += (isIncome ? 1 : -1) * calc.paidAmount
      summary.projectedFlow += (isIncome ? 1 : -1) * calc.totalAmount
      summary.estimatedFlow += (isIncome ? 1 : -1) * calc.pendingAmount

      if (calc.calculatedStatus === 'Vencido') summary.overdue += 1
      if (['Sin pagar', 'Pago parcial', 'Vencido'].includes(calc.calculatedStatus)) {
        summary.pending += 1
      }
      if (calc.calculatedStatus === 'Pagado') summary.paid += 1
      if (calc.calculatedStatus === 'Anulado') summary.voided += 1

      return summary
    },
    {
      totalIncome: 0,
      totalExpenses: 0,
      receivable: 0,
      payable: 0,
      totalPaid: 0,
      totalPending: 0,
      totalBalance: 0,
      cashFlow: 0,
      projectedFlow: 0,
      estimatedFlow: 0,
      overdue: 0,
      pending: 0,
      paid: 0,
      voided: 0,
    },
  )
