const DEFAULT_TAX_RATE = 19

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

const roundCurrency = (value) => Math.round(getNumberValue(value))

const calculateTaxAmount = (netAmount, taxRate = DEFAULT_TAX_RATE, isTaxExempt = false) => {
  if (isTaxExempt) return 0
  return roundCurrency((roundCurrency(netAmount) * getNumberValue(taxRate)) / 100)
}

const calculateTotalAmount = (netAmount, taxRate = DEFAULT_TAX_RATE, isTaxExempt = false) =>
  roundCurrency(roundCurrency(netAmount) + calculateTaxAmount(netAmount, taxRate, isTaxExempt))

const calculatePendingAmount = (totalAmount, paidAmount) =>
  Math.max(0, roundCurrency(totalAmount) - roundCurrency(paidAmount))

const parseDateOnly = (date) => {
  if (!date) return null
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return null
  parsedDate.setHours(0, 0, 0, 0)
  return parsedDate
}

const getAutomaticPaymentStatus = ({ totalAmount = 0, paidAmount = 0, dueDate = '', status = '' } = {}) => {
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

const calculateFinanceMovement = (movement = {}) => {
  const isTaxExempt = Boolean(movement.isTaxExempt)
  const taxRate = getNumberValue(movement.taxRate ?? DEFAULT_TAX_RATE)
  const netAmount = roundCurrency(movement.netAmount)
  const taxAmount = calculateTaxAmount(netAmount, taxRate, isTaxExempt)
  const totalAmount = calculateTotalAmount(netAmount, taxRate, isTaxExempt)
  const paidAmount = Math.min(roundCurrency(movement.paidAmount), totalAmount)
  const pendingAmount = calculatePendingAmount(totalAmount, paidAmount)
  const status = getAutomaticPaymentStatus({
    totalAmount,
    paidAmount,
    dueDate: movement.dueDate,
    status: movement.status,
  })

  return {
    ...movement,
    taxRate,
    isTaxExempt,
    netAmount,
    taxAmount,
    totalAmount,
    paidAmount,
    pendingAmount,
    status,
  }
}

const registerMovementPayment = (movement = {}, payment = {}, user = {}) => {
  const current = calculateFinanceMovement(movement)
  const amount = roundCurrency(payment.amount)

  if (amount <= 0) {
    throw Object.assign(new Error('El pago debe ser mayor a 0.'), { statusCode: 400 })
  }

  if (amount > current.pendingAmount) {
    throw Object.assign(new Error('El pago no puede superar el saldo pendiente.'), { statusCode: 400 })
  }

  const paidAmount = roundCurrency(current.paidAmount + amount)
  const nextMovement = calculateFinanceMovement({
    ...current,
    paidAmount,
    paymentDate: payment.paymentDate || new Date().toISOString().slice(0, 10),
    paymentMethod: payment.paymentMethod || current.paymentMethod || 'Transferencia',
    auditLog: [
      ...(Array.isArray(current.auditLog) ? current.auditLog : []),
      {
        action: 'Pago registrado',
        amount,
        userName: user.name || '',
        userEmail: user.email || '',
        createdAt: new Date().toISOString(),
      },
    ],
  })

  return nextMovement
}

module.exports = {
  DEFAULT_TAX_RATE,
  getNumberValue,
  roundCurrency,
  calculateTaxAmount,
  calculateTotalAmount,
  calculatePendingAmount,
  getAutomaticPaymentStatus,
  calculateFinanceMovement,
  registerMovementPayment,
}
