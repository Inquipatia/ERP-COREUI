import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormCheck,
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
import { exportListToExcel } from '../../../utils/exportListToExcel'
import {
  calculateFinanceMovement,
  formatCurrency,
  formatDate,
  validateFinanceMovement,
} from '../../../utils/financeCalculations'
import {
  createFinanceMovementPayload,
  emptyFinanceMovement,
  FINANCE_CATEGORIES,
  FINANCE_DOCUMENT_TYPES,
  FINANCE_PAYMENT_METHODS,
  FINANCE_STATUSES,
  useFinanceMovements,
} from '../../../utils/financeStorage'

const getStatusColor = (status) => {
  if (status === 'Pagado') return 'success'
  if (status === 'Pago parcial') return 'info'
  if (status === 'Vencido') return 'danger'
  if (status === 'Anulado') return 'dark'
  return 'warning'
}

const Gastos = () => {
  const { currentUser, hasPermission } = useAuth()
  const canView =
    hasPermission('expenses.view') || hasPermission('finance.view') || hasPermission('admin.all')
  const canManage =
    hasPermission('expenses.manage') || hasPermission('finance.manage') || hasPermission('admin.all')
  const canExport = hasPermission('finance.export') || hasPermission('admin.all')
  const [movements, setMovements] = useFinanceMovements()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState(emptyFinanceMovement)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const expenses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return movements
      .filter((movement) => movement.type === 'Egreso')
      .filter((movement) => !category || movement.category === category)
      .filter((movement) => !status || movement.status === status)
      .filter(
        (movement) =>
          !query ||
          [
            movement.description,
            movement.supplierName,
            movement.clientSupplierName,
            movement.documentNumber,
            movement.observations,
            movement.notes,
          ].some((value) => String(value || '').toLowerCase().includes(query)),
      )
  }, [movements, search, category, status])

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.totalAmount || 0), 0),
    [expenses],
  )
  const paid = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.paidAmount || 0), 0),
    [expenses],
  )
  const pending = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + Number(expense.pendingAmount ?? expense.balanceAmount ?? 0),
        0,
      ),
    [expenses],
  )
  const categorySummary = useMemo(
    () =>
      Object.entries(
        expenses.reduce((summary, expense) => {
          const key = expense.category || 'Sin categoria'
          summary[key] = (summary[key] || 0) + Number(expense.totalAmount || 0)
          return summary
        }, {}),
      ).sort(([, firstTotal], [, secondTotal]) => secondTotal - firstTotal),
    [expenses],
  )
  const formCalculation = useMemo(() => calculateFinanceMovement(formData), [formData])

  const openQuickExpense = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite crear gastos.')
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    setFormData({
      ...emptyFinanceMovement,
      type: 'Egreso',
      category: 'Proveedor',
      issueDate: today,
      dueDate: today,
      responsibleName: currentUser?.name || '',
      responsibleEmail: currentUser?.email || '',
    })
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setFormData(emptyFinanceMovement)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite guardar gastos.')
      return
    }

    const validationErrors = validateFinanceMovement({
      ...formData,
      type: 'Egreso',
    })

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '))
      return
    }

    const payload = createFinanceMovementPayload(
      {
        ...formData,
        type: 'Egreso',
        supplierName: formData.supplierName || formData.clientSupplierName,
        clientSupplierName: formData.clientSupplierName || formData.supplierName,
        responsibleName: formData.responsibleName || currentUser?.name || '',
        responsibleEmail: formData.responsibleEmail || currentUser?.email || '',
      },
      { currentUser, action: 'Gasto rapido' },
    )

    setMovements((currentMovements) => [payload, ...currentMovements])
    setMessage('Gasto creado correctamente.')
    closeModal()
  }

  const exportExpenses = async () => {
    if (!canExport) {
      setMessage('Tu perfil no permite exportar reportes financieros.')
      return
    }

    await exportListToExcel({
      fileName: 'Gastos-ERP-Rubik',
      sheetName: 'Gastos',
      title: 'Gastos ERP Rubik',
      columns: [
        { header: 'Categoria', key: 'category', width: 18 },
        { header: 'Descripcion', key: 'description', width: 34 },
        { header: 'Proveedor', key: 'clientSupplierName', width: 26 },
        { header: 'Documento', key: 'documentNumber', width: 18 },
        { header: 'Total', key: 'totalAmount', width: 14 },
        { header: 'Pagado', key: 'paidAmount', width: 14 },
        { header: 'Saldo', key: 'pendingAmount', width: 14 },
        { header: 'Estado', key: 'status', width: 16 },
      ],
      rows: expenses,
      summary: [
        { label: 'Total gastos', value: total },
        { label: 'Pagado', value: paid },
        { label: 'Saldo', value: pending },
      ],
    })
    setMessage('Gastos exportados correctamente.')
  }

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver gastos.</CAlert>

  return (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Gastos filtrados</div>
            <div className="fs-3 fw-semibold">{formatCurrency(total)}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Pagado</div>
            <div className="fs-3 fw-semibold">{formatCurrency(paid)}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Saldo pendiente</div>
            <div className="fs-3 fw-semibold">{formatCurrency(pending)}</div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={4}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Resumen por categoria</strong>
          </CCardHeader>
          <CCardBody>
            {categorySummary.length === 0 ? (
              <CAlert color="info" className="mb-0">
                No hay gastos para resumir.
              </CAlert>
            ) : (
              <div className="d-flex flex-column gap-2">
                {categorySummary.slice(0, 8).map(([summaryCategory, summaryTotal]) => (
                  <div
                    className="d-flex align-items-center justify-content-between gap-3"
                    key={summaryCategory}
                  >
                    <span>{summaryCategory}</span>
                    <strong>{formatCurrency(summaryTotal)}</strong>
                  </div>
                ))}
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={8}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Gastos</strong> <small>egresos categorizados</small>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CButton
                color="success"
                variant="outline"
                disabled={expenses.length === 0 || !canExport}
                onClick={exportExpenses}
              >
                Exportar Excel
              </CButton>
              {canManage && (
                <CButton color="primary" onClick={openQuickExpense}>
                  Crear egreso rapido
                </CButton>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}
            <CRow className="g-3 mb-3">
              <CCol md={5}>
                <CFormLabel>Busqueda</CFormLabel>
                <CFormInput value={search} onChange={(event) => setSearch(event.target.value)} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Todas</option>
                  {FINANCE_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Estado</CFormLabel>
                <CFormSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">Todos</option>
                  {FINANCE_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={1} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setCategory('')
                    setStatus('')
                  }}
                >
                  Limpiar
                </CButton>
              </CCol>
            </CRow>

            <CTable responsive hover align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Gasto</CTableHeaderCell>
                  <CTableHeaderCell>Proveedor</CTableHeaderCell>
                  <CTableHeaderCell>Documento</CTableHeaderCell>
                  <CTableHeaderCell>Total</CTableHeaderCell>
                  <CTableHeaderCell>Saldo</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Fecha</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {expenses.map((expense) => (
                  <CTableRow key={expense.id}>
                    <CTableDataCell>
                      <CBadge color="light" textColor="dark">
                        {expense.category}
                      </CBadge>
                      <div className="fw-semibold mt-1">{expense.description}</div>
                    </CTableDataCell>
                    <CTableDataCell>{expense.clientSupplierName || expense.supplierName || '-'}</CTableDataCell>
                    <CTableDataCell>{expense.documentNumber || '-'}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(expense.totalAmount)}</CTableDataCell>
                    <CTableDataCell>
                      {formatCurrency(expense.pendingAmount ?? expense.balanceAmount)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getStatusColor(expense.status)}>{expense.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>{formatDate(expense.issueDate)}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="lg">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>Crear egreso rapido</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect name="category" value={formData.category} onChange={handleChange}>
                  {FINANCE_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Descripcion</CFormLabel>
                <CFormInput name="description" value={formData.description} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Proveedor</CFormLabel>
                <CFormInput
                  name="clientSupplierName"
                  value={formData.clientSupplierName}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tipo documento</CFormLabel>
                <CFormSelect name="documentType" value={formData.documentType} onChange={handleChange}>
                  {FINANCE_DOCUMENT_TYPES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>N documento</CFormLabel>
                <CFormInput
                  name="documentNumber"
                  value={formData.documentNumber}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Monto neto</CFormLabel>
                <CFormInput
                  type="number"
                  name="netAmount"
                  value={formData.netAmount}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>IVA %</CFormLabel>
                <CFormInput
                  type="number"
                  name="taxRate"
                  value={formData.taxRate}
                  onChange={handleChange}
                  disabled={formData.isTaxExempt}
                />
              </CCol>
              <CCol md={2} className="d-flex align-items-end">
                <CFormCheck
                  name="isTaxExempt"
                  checked={Boolean(formData.isTaxExempt)}
                  onChange={handleChange}
                  label="Exento"
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Pagado</CFormLabel>
                <CFormInput
                  type="number"
                  name="paidAmount"
                  value={formData.paidAmount}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CAlert color="light" className="mb-0">
                  <div>
                    IVA: <strong>{formatCurrency(formCalculation.taxAmount)}</strong>
                  </div>
                  <div>
                    Total: <strong>{formatCurrency(formCalculation.totalAmount)}</strong>
                  </div>
                  <div>
                    Saldo: <strong>{formatCurrency(formCalculation.pendingAmount)}</strong>
                  </div>
                  <div>
                    Estado: <strong>{formCalculation.calculatedStatus}</strong>
                  </div>
                </CAlert>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Emision</CFormLabel>
                <CFormInput type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Vencimiento</CFormLabel>
                <CFormInput type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Fecha pago</CFormLabel>
                <CFormInput
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Metodo pago</CFormLabel>
                <CFormSelect name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                  {FINANCE_PAYMENT_METHODS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Observaciones</CFormLabel>
                <CFormTextarea
                  rows={3}
                  name="observations"
                  value={formData.observations}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit">
              Guardar egreso
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Gastos
