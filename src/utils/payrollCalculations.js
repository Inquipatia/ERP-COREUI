import { getNumberValue, roundCurrency, formatCurrency } from './financeCalculations'

export const calculatePayroll = (payroll = {}) => {
  const baseSalary = roundCurrency(payroll.baseSalary)
  const bonuses = roundCurrency(payroll.bonuses)
  const overtime = roundCurrency(payroll.overtime)
  const taxableAllowances = roundCurrency(payroll.taxableAllowances)
  const nonTaxableAllowances = roundCurrency(payroll.nonTaxableAllowances)
  const afpAmount = roundCurrency(payroll.afpAmount)
  const healthAmount = roundCurrency(payroll.healthAmount)
  const unemploymentInsurance = roundCurrency(payroll.unemploymentInsurance)
  const incomeTax = roundCurrency(payroll.incomeTax)
  const advances = roundCurrency(payroll.advances)
  const loans = roundCurrency(payroll.loans)
  const otherDiscounts = roundCurrency(payroll.otherDiscounts)
  const employerCost = roundCurrency(payroll.employerCost)

  const taxableIncome = baseSalary + bonuses + overtime + taxableAllowances
  const grossIncome = taxableIncome + nonTaxableAllowances
  const legalDiscounts = afpAmount + healthAmount + unemploymentInsurance + incomeTax
  const internalDiscounts = advances + loans + otherDiscounts
  const totalDiscounts = legalDiscounts + internalDiscounts
  const netPay = Math.max(0, grossIncome - totalDiscounts)
  const companyCost = grossIncome + employerCost

  return {
    baseSalary,
    bonuses,
    overtime,
    taxableAllowances,
    nonTaxableAllowances,
    taxableIncome,
    grossIncome,
    afpAmount,
    healthAmount,
    unemploymentInsurance,
    incomeTax,
    advances,
    loans,
    otherDiscounts,
    legalDiscounts,
    internalDiscounts,
    totalDiscounts,
    netPay,
    employerCost,
    companyCost,
  }
}

export const validatePayroll = (payroll = {}) => {
  const errors = []
  const calc = calculatePayroll(payroll)

  if (!String(payroll.employeeName || '').trim()) errors.push('Selecciona trabajador.')
  if (!String(payroll.period || '').trim()) errors.push('Ingresa período.')
  if (calc.baseSalary <= 0) errors.push('El sueldo base debe ser mayor a cero.')
  if (calc.totalDiscounts > calc.grossIncome) errors.push('Los descuentos no pueden superar el haber bruto.')

  return errors
}

export const getPayrollStatus = (payroll = {}) => {
  if (payroll.status === 'Anulada') return 'Anulada'
  if (payroll.paymentDate) return 'Pagada'
  if (getNumberValue(payroll.paidAmount) > 0) return 'Pago parcial'
  return payroll.status || 'Pendiente'
}

export const summarizePayrolls = (payrolls = []) =>
  (Array.isArray(payrolls) ? payrolls : []).reduce(
    (summary, payroll) => {
      const calc = calculatePayroll(payroll)
      summary.grossIncome += calc.grossIncome
      summary.netPay += calc.netPay
      summary.totalDiscounts += calc.totalDiscounts
      summary.companyCost += calc.companyCost
      if (getPayrollStatus(payroll) === 'Pagada') summary.paid += 1
      else summary.pending += 1
      return summary
    },
    { grossIncome: 0, netPay: 0, totalDiscounts: 0, companyCost: 0, paid: 0, pending: 0 },
  )

export { formatCurrency }
