import { createLocalId, useLocalStorageState } from './storage'
import { getNumberValue, validateRut } from './financeCalculations'
import { calculatePayroll, getPayrollStatus } from './payrollCalculations'

export const HR_STORAGE_KEYS = {
  employees: 'rubik.erp.hr.employees',
  payrolls: 'rubik.erp.hr.payrolls',
}

export const EMPLOYEE_STATUSES = ['Activo', 'Inactivo', 'Licencia', 'Vacaciones', 'Finiquitado']
export const CONTRACT_TYPES = ['Indefinido', 'Plazo fijo', 'Honorarios', 'Part time', 'Práctica', 'Otro']
export const HR_AREAS = [
  'Ventas',
  'Ventas Públicas',
  'Ventas Privadas',
  'Licitaciones',
  'Marketing',
  'Diseño',
  'Diseño Imprenta',
  'Producción',
  'Taller',
  'Instalaciones',
  'Administración',
  'Contabilidad',
  'Finanzas',
  'Gerencia',
  'Desarrollo',
  'Operaciones',
]
export const PAYROLL_STATUSES = ['Pendiente', 'Pago parcial', 'Pagada', 'Anulada']

export const emptyEmployee = {
  id: '',
  name: '',
  rut: '',
  email: '',
  phone: '',
  position: '',
  area: 'Producción',
  contractType: 'Indefinido',
  startDate: '',
  endDate: '',
  baseSalary: '',
  afpAmount: '',
  healthAmount: '',
  unemploymentInsurance: '',
  status: 'Activo',
  emergencyContact: '',
  notes: '',
  documentNames: '',
  createdAt: '',
  updatedAt: '',
}

export const emptyPayroll = {
  id: '',
  employeeId: '',
  employeeName: '',
  employeeRut: '',
  period: '',
  baseSalary: '',
  bonuses: '',
  overtime: '',
  taxableAllowances: '',
  nonTaxableAllowances: '',
  afpAmount: '',
  healthAmount: '',
  unemploymentInsurance: '',
  incomeTax: '',
  advances: '',
  loans: '',
  otherDiscounts: '',
  employerCost: '',
  grossIncome: 0,
  totalDiscounts: 0,
  netPay: 0,
  companyCost: 0,
  status: 'Pendiente',
  paymentDate: '',
  paymentMethod: 'Transferencia',
  notes: '',
  createdAt: '',
  updatedAt: '',
}

export const normalizeEmployee = (employee = {}) => ({
  ...emptyEmployee,
  ...employee,
  id: employee.id || createLocalId('emp'),
  name: employee.name || '',
  rut: employee.rut || '',
  area: employee.area || 'Producción',
  contractType: employee.contractType || 'Indefinido',
  baseSalary: getNumberValue(employee.baseSalary),
  afpAmount: getNumberValue(employee.afpAmount),
  healthAmount: getNumberValue(employee.healthAmount),
  unemploymentInsurance: getNumberValue(employee.unemploymentInsurance),
  status: employee.status || 'Activo',
  createdAt: employee.createdAt || new Date().toISOString(),
  updatedAt: employee.updatedAt || new Date().toISOString(),
})

export const normalizePayroll = (payroll = {}) => {
  const base = {
    ...emptyPayroll,
    ...payroll,
    id: payroll.id || createLocalId('pay'),
    baseSalary: getNumberValue(payroll.baseSalary),
    bonuses: getNumberValue(payroll.bonuses),
    overtime: getNumberValue(payroll.overtime),
    taxableAllowances: getNumberValue(payroll.taxableAllowances),
    nonTaxableAllowances: getNumberValue(payroll.nonTaxableAllowances),
    afpAmount: getNumberValue(payroll.afpAmount),
    healthAmount: getNumberValue(payroll.healthAmount),
    unemploymentInsurance: getNumberValue(payroll.unemploymentInsurance),
    incomeTax: getNumberValue(payroll.incomeTax),
    advances: getNumberValue(payroll.advances),
    loans: getNumberValue(payroll.loans),
    otherDiscounts: getNumberValue(payroll.otherDiscounts),
    employerCost: getNumberValue(payroll.employerCost),
    status: payroll.status || 'Pendiente',
    paymentMethod: payroll.paymentMethod || 'Transferencia',
    createdAt: payroll.createdAt || new Date().toISOString(),
    updatedAt: payroll.updatedAt || new Date().toISOString(),
  }
  const calc = calculatePayroll(base)

  return {
    ...base,
    grossIncome: calc.grossIncome,
    totalDiscounts: calc.totalDiscounts,
    netPay: calc.netPay,
    companyCost: calc.companyCost,
    status: getPayrollStatus(base),
  }
}

export const employeeHasValidRut = (employee = {}) => !employee.rut || validateRut(employee.rut)

export const mockEmployees = [
  normalizeEmployee({
    name: 'Trabajador ejemplo',
    rut: '11111111-1',
    email: 'trabajador@example.com',
    position: 'Operador producción',
    area: 'Producción',
    contractType: 'Indefinido',
    startDate: new Date().toISOString().slice(0, 10),
    baseSalary: 650000,
    afpAmount: 75000,
    healthAmount: 45500,
  }),
]

export const mockPayrolls = []

export const useEmployees = (initialEmployees = mockEmployees) => {
  const [employees, setEmployees] = useLocalStorageState(
    HR_STORAGE_KEYS.employees,
    initialEmployees.map(normalizeEmployee),
  )

  return [employees.map(normalizeEmployee), setEmployees]
}

export const usePayrolls = (initialPayrolls = mockPayrolls) => {
  const [payrolls, setPayrolls] = useLocalStorageState(
    HR_STORAGE_KEYS.payrolls,
    initialPayrolls.map(normalizePayroll),
  )

  return [payrolls.map(normalizePayroll), setPayrolls]
}

export const employeeMatchesSearch = (employee = {}, search = '') => {
  const query = String(search || '').trim().toLowerCase()
  if (!query) return true

  return [employee.name, employee.rut, employee.email, employee.position, employee.area, employee.status].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(query),
  )
}
