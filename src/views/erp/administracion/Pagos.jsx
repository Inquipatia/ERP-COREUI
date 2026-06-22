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
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'

import { useAuth } from '../../../context/AuthContext'
import {
  formatCurrency,
  formatDate,
  getDaysUntilDue,
  getNumberValue,
} from '../../../utils/financeCalculations'
import {
  createFinanceMovementPayload,
  financeMovementMatchesFilters,
  useFinanceMovements,
} from '../../../utils/financeStorage'

const initialFilters = { search: '', type: '', status: '', category: '' }

const getStatusColor = (status) => {
  if (status === 'Pagado') return 'success'
  if (status === 'Pago parcial') return 'info'
  if (status === 'Vencido') return 'danger'
  if (status === 'Anulado') return 'dark'
  return 'warning'
}

const Pagos = () => {
  const { currentUser, hasPermission } = useAuth()
  const canView = hasPermission('finance.view') || hasPermission('admin.all')
  const canRegisterPayments = hasPermission('finance.payments') || hasPermission('admin.all')
  const [movements, setMovements] = useFinanceMovements()
  const [filters, setFilters] = useState(initialFilters)
  const [message, setMessage] = useState('')

  const paymentRows = useMemo(
    () =>
      movements
        .filter((movement) => ['Sin pagar', 'Pago parcial', 'Vencido'].includes(movement.status))
        .filter((movement) => financeMovementMatchesFilters(movement, filters))
        .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || ''))),
    [movements, filters],
  )

  const summary = useMemo(
    () => ({
      totalPending: paymentRows.reduce(
        (sum, movement) => sum + Number(movement.pendingAmount ?? movement.balanceAmount ?? 0),
        0,
      ),
      incomesPending: paymentRows
        .filter((movement) => movement.type === 'Ingreso')
        .reduce(
          (sum, movement) => sum + Number(movement.pendingAmount ?? movement.balanceAmount ?? 0),
          0,
        ),
      expensesPending: paymentRows
        .filter((movement) => movement.type === 'Egreso')
        .reduce(
          (sum, movement) => sum + Number(movement.pendingAmount ?? movement.balanceAmount ?? 0),
          0,
        ),
      overdue: paymentRows.filter((movement) => movement.status === 'Vencido').length,
    }),
    [paymentRows],
  )

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const markAsPaid = (movement) => {
    if (!canRegisterPayments) {
      setMessage('Tu perfil no permite registrar pagos.')
      return
    }

    const paymentDate = new Date().toISOString().slice(0, 10)
    const payload = createFinanceMovementPayload(
      {
        ...movement,
        paidAmount: movement.totalAmount,
        paymentDate,
        responsibleName: currentUser?.name || movement.responsibleName,
        responsibleEmail: currentUser?.email || movement.responsibleEmail,
        updatedAt: new Date().toISOString(),
      },
      { currentUser, action: 'Pago total' },
    )

    setMovements((currentMovements) => currentMovements.map((item) => (item.id === movement.id ? payload : item)))
    setMessage('Pago registrado correctamente.')
  }

  const registerPartialPayment = (movement) => {
    if (!canRegisterPayments) {
      setMessage('Tu perfil no permite registrar pagos.')
      return
    }

    const pendingAmount = Number(movement.pendingAmount ?? movement.balanceAmount ?? 0)
    const value = window.prompt('Monto pagado a registrar', String(pendingAmount))
    if (value === null) return

    const paidToAdd = getNumberValue(value)
    if (paidToAdd <= 0 || paidToAdd > pendingAmount) {
      setMessage('El pago debe ser mayor a 0 y no puede superar el saldo pendiente.')
      return
    }

    const payload = createFinanceMovementPayload(
      {
        ...movement,
        paidAmount: Number(movement.paidAmount || 0) + paidToAdd,
        paymentDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      },
      { currentUser, action: 'Pago parcial' },
    )

    setMovements((currentMovements) => currentMovements.map((item) => (item.id === movement.id ? payload : item)))
    setMessage('Pago parcial registrado correctamente.')
  }

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver pagos.</CAlert>

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}><CCard><CCardBody><div className="text-body-secondary small">Saldo pendiente</div><div className="fs-4 fw-semibold">{formatCurrency(summary.totalPending)}</div></CCardBody></CCard></CCol>
      <CCol md={3} sm={6}><CCard><CCardBody><div className="text-body-secondary small">Por cobrar</div><div className="fs-4 fw-semibold">{formatCurrency(summary.incomesPending)}</div></CCardBody></CCard></CCol>
      <CCol md={3} sm={6}><CCard><CCardBody><div className="text-body-secondary small">Por pagar</div><div className="fs-4 fw-semibold">{formatCurrency(summary.expensesPending)}</div></CCardBody></CCard></CCol>
      <CCol md={3} sm={6}><CCard><CCardBody><div className="text-body-secondary small">Vencidos</div><div className="fs-4 fw-semibold">{summary.overdue}</div></CCardBody></CCard></CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div><strong>Pagos y vencimientos</strong> <small>cobros y pagos pendientes</small></div>
            <CBadge color="primary">{paymentRows.length} pendientes</CBadge>
          </CCardHeader>
          <CCardBody>
            {message && <CAlert color="success" dismissible onClose={() => setMessage('')}>{message}</CAlert>}
            <CRow className="g-3 mb-3">
              <CCol md={5}><CFormLabel>Búsqueda</CFormLabel><CFormInput name="search" value={filters.search} onChange={handleFilterChange} placeholder="Documento, proveedor, cliente, descripción" /></CCol>
              <CCol md={3}><CFormLabel>Tipo</CFormLabel><CFormSelect name="type" value={filters.type} onChange={handleFilterChange}><option value="">Todos</option><option>Ingreso</option><option>Egreso</option></CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Estado</CFormLabel><CFormSelect name="status" value={filters.status} onChange={handleFilterChange}><option value="">Todos</option><option>Sin pagar</option><option>Pago parcial</option><option>Vencido</option></CFormSelect></CCol>
              <CCol md={1} className="d-flex align-items-end"><CButton color="secondary" variant="outline" onClick={() => setFilters(initialFilters)}>Limpiar</CButton></CCol>
            </CRow>

            <CTable responsive hover align="middle">
              <CTableHead color="light"><CTableRow><CTableHeaderCell>Documento</CTableHeaderCell><CTableHeaderCell>Descripción</CTableHeaderCell><CTableHeaderCell>Tipo</CTableHeaderCell><CTableHeaderCell>Vencimiento</CTableHeaderCell><CTableHeaderCell>Saldo</CTableHeaderCell><CTableHeaderCell>Estado</CTableHeaderCell><CTableHeaderCell className="text-end">Acciones</CTableHeaderCell></CTableRow></CTableHead>
              <CTableBody>
                {paymentRows.map((movement) => {
                  const days = getDaysUntilDue(movement.dueDate)
                  return (
                    <CTableRow key={movement.id}>
                      <CTableDataCell>{movement.documentNumber || '-'}<div className="small text-body-secondary">{movement.clientSupplierName || '-'}</div></CTableDataCell>
                      <CTableDataCell>{movement.description}<div className="small text-body-secondary">Total {formatCurrency(movement.totalAmount)} · pagado {formatCurrency(movement.paidAmount)}</div></CTableDataCell>
                      <CTableDataCell><CBadge color={movement.type === 'Ingreso' ? 'success' : 'danger'}>{movement.type}</CBadge></CTableDataCell>
                      <CTableDataCell>{formatDate(movement.dueDate)}<div className="small text-body-secondary">{days === null ? '-' : days < 0 ? `${Math.abs(days)} días vencido` : `${days} días restantes`}</div></CTableDataCell>
                      <CTableDataCell className="fw-semibold">{formatCurrency(movement.pendingAmount ?? movement.balanceAmount)}</CTableDataCell>
                      <CTableDataCell><CBadge color={getStatusColor(movement.status)}>{movement.status}</CBadge></CTableDataCell>
                      <CTableDataCell className="text-end"><CButtonGroup size="sm">{canRegisterPayments && <CButton color="success" variant="outline" onClick={() => markAsPaid(movement)}>Pagar total</CButton>}{canRegisterPayments && <CButton color="info" variant="outline" onClick={() => registerPartialPayment(movement)}>Pago parcial</CButton>}</CButtonGroup></CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Pagos
