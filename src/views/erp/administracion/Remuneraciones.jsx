import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useAuth } from '../../../context/AuthContext'
import { calculatePayroll, formatCurrency, summarizePayrolls, validatePayroll } from '../../../utils/payrollCalculations'
import { emptyPayroll, normalizePayroll, PAYROLL_STATUSES, useEmployees, usePayrolls } from '../../../utils/hrStorage'

const currentPeriod = () => new Date().toISOString().slice(0, 7)
const getStatusColor = (status) => {
  if (status === 'Pagada') return 'success'
  if (status === 'Pago parcial') return 'info'
  if (status === 'Anulada') return 'dark'
  return 'warning'
}

const Remuneraciones = () => {
  const { hasPermission } = useAuth()
  const canView = hasPermission('payroll.view') || hasPermission('finance.view') || hasPermission('admin.all')
  const canManage = hasPermission('payroll.manage') || hasPermission('finance.manage') || hasPermission('admin.all')
  const [employees] = useEmployees()
  const [payrolls, setPayrolls] = usePayrolls()
  const [periodFilter, setPeriodFilter] = useState(currentPeriod())
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ ...emptyPayroll, period: currentPeriod() })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredPayrolls = useMemo(
    () => payrolls.filter((payroll) => !periodFilter || payroll.period === periodFilter),
    [payrolls, periodFilter],
  )
  const summary = useMemo(() => summarizePayrolls(filteredPayrolls), [filteredPayrolls])
  const formCalc = useMemo(() => calculatePayroll(formData), [formData])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleEmployeeSelect = (event) => {
    const employeeId = event.target.value
    const employee = employees.find((item) => item.id === employeeId)

    if (!employee) {
      setFormData((current) => ({ ...current, employeeId: '', employeeName: '', employeeRut: '' }))
      return
    }

    setFormData((current) => ({
      ...current,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeRut: employee.rut,
      baseSalary: employee.baseSalary,
      afpAmount: employee.afpAmount,
      healthAmount: employee.healthAmount,
      unemploymentInsurance: employee.unemploymentInsurance,
    }))
  }

  const openCreateModal = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite crear remuneraciones.')
      return
    }
    setEditingId(null)
    setFormData({ ...emptyPayroll, period: periodFilter || currentPeriod() })
    setError('')
    setVisible(true)
  }

  const openEditModal = (payroll) => {
    if (!canManage) {
      setMessage('Tu perfil no permite editar remuneraciones.')
      return
    }
    setEditingId(payroll.id)
    setFormData(normalizePayroll(payroll))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData({ ...emptyPayroll, period: currentPeriod() })
    setError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite guardar remuneraciones.')
      return
    }

    const errors = validatePayroll(formData)
    if (errors.length > 0) {
      setError(errors.join(' '))
      return
    }

    const payload = normalizePayroll({ ...formData, id: editingId || undefined, updatedAt: new Date().toISOString() })

    setPayrolls((currentPayrolls) => {
      if (editingId) {
        return currentPayrolls.map((payroll) => (payroll.id === editingId ? payload : payroll))
      }
      return [payload, ...currentPayrolls]
    })
    setMessage(editingId ? 'Remuneración actualizada.' : 'Remuneración creada.')
    closeModal()
  }

  const markAsPaid = (payroll) => {
    if (!canManage) return
    const payload = normalizePayroll({ ...payroll, paymentDate: new Date().toISOString().slice(0, 10), status: 'Pagada' })
    setPayrolls((currentPayrolls) => currentPayrolls.map((item) => (item.id === payroll.id ? payload : item)))
    setMessage('Remuneración marcada como pagada.')
  }

  const handleDelete = (payrollId) => {
    if (!canManage) return
    setPayrolls((currentPayrolls) => currentPayrolls.filter((payroll) => payroll.id !== payrollId))
    setMessage('Remuneración eliminada localmente.')
  }

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver remuneraciones.</CAlert>

  return (
    <CRow className="g-4">
      <CCol md={3}><CCard><CCardBody><div className="text-body-secondary small">Bruto período</div><div className="fs-4 fw-semibold">{formatCurrency(summary.grossIncome)}</div></CCardBody></CCard></CCol>
      <CCol md={3}><CCard><CCardBody><div className="text-body-secondary small">Líquido estimado</div><div className="fs-4 fw-semibold">{formatCurrency(summary.netPay)}</div></CCardBody></CCard></CCol>
      <CCol md={3}><CCard><CCardBody><div className="text-body-secondary small">Descuentos</div><div className="fs-4 fw-semibold">{formatCurrency(summary.totalDiscounts)}</div></CCardBody></CCard></CCol>
      <CCol md={3}><CCard><CCardBody><div className="text-body-secondary small">Costo empresa</div><div className="fs-4 fw-semibold">{formatCurrency(summary.companyCost)}</div></CCardBody></CCard></CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div><strong>Remuneraciones</strong> <small>haberes, descuentos y líquido calculado</small></div>
            <div className="d-flex gap-2 flex-wrap"><CFormInput type="month" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} />{canManage && <CButton color="primary" onClick={openCreateModal}>Nueva remuneración</CButton>}</div>
          </CCardHeader>
          <CCardBody>
            {message && <CAlert color="success" dismissible onClose={() => setMessage('')}>{message}</CAlert>}
            <CAlert color="warning">Este módulo calcula con montos ingresados por Finanzas/RRHH. No reemplaza validación contable, Previred ni normativa vigente.</CAlert>
            <CTable responsive hover align="middle">
              <CTableHead color="light"><CTableRow><CTableHeaderCell>Trabajador</CTableHeaderCell><CTableHeaderCell>Período</CTableHeaderCell><CTableHeaderCell>Haberes</CTableHeaderCell><CTableHeaderCell>Descuentos</CTableHeaderCell><CTableHeaderCell>Líquido</CTableHeaderCell><CTableHeaderCell>Estado</CTableHeaderCell><CTableHeaderCell className="text-end">Acciones</CTableHeaderCell></CTableRow></CTableHead>
              <CTableBody>
                {filteredPayrolls.map((payroll) => <CTableRow key={payroll.id}><CTableDataCell><div className="fw-semibold">{payroll.employeeName}</div><div className="small text-body-secondary">{payroll.employeeRut || '-'}</div></CTableDataCell><CTableDataCell>{payroll.period}</CTableDataCell><CTableDataCell>{formatCurrency(payroll.grossIncome)}</CTableDataCell><CTableDataCell>{formatCurrency(payroll.totalDiscounts)}</CTableDataCell><CTableDataCell className="fw-semibold">{formatCurrency(payroll.netPay)}</CTableDataCell><CTableDataCell><CBadge color={getStatusColor(payroll.status)}>{payroll.status}</CBadge></CTableDataCell><CTableDataCell className="text-end"><CButtonGroup size="sm">{canManage && <CButton color="secondary" variant="outline" onClick={() => openEditModal(payroll)}>Editar</CButton>}{canManage && payroll.status !== 'Pagada' && <CButton color="success" variant="outline" onClick={() => markAsPaid(payroll)}>Pagar</CButton>}{canManage && <CButton color="danger" variant="outline" onClick={() => handleDelete(payroll.id)}>Eliminar</CButton>}</CButtonGroup></CTableDataCell></CTableRow>)}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="xl">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader><CModalTitle>{editingId ? 'Editar remuneración' : 'Nueva remuneración'}</CModalTitle></CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={4}><CFormLabel>Trabajador</CFormLabel><CFormSelect value={formData.employeeId} onChange={handleEmployeeSelect}><option value="">Seleccionar</option>{employees.filter((employee) => employee.status === 'Activo').map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.position}</option>)}</CFormSelect></CCol>
              <CCol md={2}><CFormLabel>Período</CFormLabel><CFormInput type="month" name="period" value={formData.period} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Estado</CFormLabel><CFormSelect name="status" value={formData.status} onChange={handleChange}>{PAYROLL_STATUSES.map((status) => <option key={status}>{status}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Fecha pago</CFormLabel><CFormInput type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Sueldo base</CFormLabel><CFormInput type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Bonos</CFormLabel><CFormInput type="number" name="bonuses" value={formData.bonuses} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Horas extra</CFormLabel><CFormInput type="number" name="overtime" value={formData.overtime} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Haberes imponibles</CFormLabel><CFormInput type="number" name="taxableAllowances" value={formData.taxableAllowances} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Haberes no imponibles</CFormLabel><CFormInput type="number" name="nonTaxableAllowances" value={formData.nonTaxableAllowances} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>AFP</CFormLabel><CFormInput type="number" name="afpAmount" value={formData.afpAmount} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Salud</CFormLabel><CFormInput type="number" name="healthAmount" value={formData.healthAmount} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Seguro cesantía</CFormLabel><CFormInput type="number" name="unemploymentInsurance" value={formData.unemploymentInsurance} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Impuesto único</CFormLabel><CFormInput type="number" name="incomeTax" value={formData.incomeTax} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Anticipos</CFormLabel><CFormInput type="number" name="advances" value={formData.advances} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Préstamos</CFormLabel><CFormInput type="number" name="loans" value={formData.loans} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Otros descuentos</CFormLabel><CFormInput type="number" name="otherDiscounts" value={formData.otherDiscounts} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Costo empleador</CFormLabel><CFormInput type="number" name="employerCost" value={formData.employerCost} onChange={handleChange} /></CCol>
              <CCol xs={12}><CAlert color="light"><strong>Líquido estimado: {formatCurrency(formCalc.netPay)}</strong> · Haberes {formatCurrency(formCalc.grossIncome)} · Descuentos {formatCurrency(formCalc.totalDiscounts)} · Costo empresa {formatCurrency(formCalc.companyCost)}</CAlert></CCol>
              <CCol xs={12}><CFormLabel>Observaciones</CFormLabel><CFormTextarea rows={3} name="notes" value={formData.notes} onChange={handleChange} /></CCol>
            </CRow>
          </CModalBody>
          <CModalFooter><CButton color="secondary" variant="outline" onClick={closeModal}>Cancelar</CButton><CButton color="primary" type="submit">Guardar</CButton></CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Remuneraciones
