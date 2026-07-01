import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  CProgress,
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
  getFinanceSummary,
  listFinanceMovements,
  listPayments,
  runSandboxPaymentDemo,
} from '../../../services/financeApi'
import { exportListToExcel } from '../../../utils/exportListToExcel'
import {
  calculateFinanceMovement,
  formatCurrency,
  formatDate,
  summarizeMovements,
  validateFinanceMovement,
} from '../../../utils/financeCalculations'
import {
  emptyFinanceMovement,
  createFinanceMovementPayload,
  financeMovementMatchesFilters,
  FINANCE_CATEGORIES,
  FINANCE_DOCUMENT_TYPES,
  FINANCE_MOVEMENT_TYPES,
  FINANCE_PAYMENT_METHODS,
  FINANCE_STATUSES,
  normalizeFinanceMovement,
  useFinanceMovements,
} from '../../../utils/financeStorage'

const initialFilters = { search: '', type: '', status: '', category: '' }

const getStatusColor = (status) => {
  if (status === 'Pagado') return 'success'
  if (status === 'Pago parcial') return 'info'
  if (status === 'Vencido') return 'danger'
  if (status === 'Anulado') return 'dark'
  if (status === 'Borrador') return 'secondary'
  return 'warning'
}

const getTypeColor = (type) => (type === 'Ingreso' ? 'success' : 'danger')

const getPaymentStatusColor = (status) => {
  if (status === 'approved' || status === 'reconciled') return 'success'
  if (status === 'rejected' || status === 'failed' || status === 'canceled') return 'danger'
  return 'warning'
}

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const getFinanceApiErrorMessage = (error) => {
  const message = error?.message || 'No se pudo conectar con la API financiera.'
  if (message.toLowerCase().includes('permiso')) {
    return 'No tienes permisos financieros para ejecutar esta demo.'
  }
  return message
}

const Finanzas = () => {
  const { currentUser, hasPermission } = useAuth()
  const canView = hasPermission('finance.view') || hasPermission('admin.all')
  const canManage = hasPermission('finance.manage') || hasPermission('admin.all')
  const canExport = hasPermission('finance.export') || hasPermission('admin.all')
  const canCreatePayments =
    hasPermission('payments.create') ||
    hasPermission('finance.payments') ||
    hasPermission('finance.manage') ||
    hasPermission('admin.all')
  const [movements, setMovements] = useFinanceMovements()
  const [filters, setFilters] = useState(initialFilters)
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyFinanceMovement)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [demoSummary, setDemoSummary] = useState(null)
  const [apiPayments, setApiPayments] = useState([])
  const [apiMovements, setApiMovements] = useState([])
  const [demoResult, setDemoResult] = useState(null)
  const [demoError, setDemoError] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoRefreshing, setDemoRefreshing] = useState(false)

  const filteredMovements = useMemo(
    () => movements.filter((movement) => financeMovementMatchesFilters(movement, filters)),
    [movements, filters],
  )

  const summary = useMemo(() => summarizeMovements(filteredMovements), [filteredMovements])
  const formCalculation = useMemo(() => calculateFinanceMovement(formData), [formData])
  const formIsQuoteReceivable = Boolean(formData.quoteSourceLocked || formData.sourceType === 'quote')
  const lastApiPayments = useMemo(() => apiPayments.slice(0, 5), [apiPayments])
  const lastApiMovements = useMemo(() => apiMovements.slice(0, 5), [apiMovements])

  const refreshFinanceDemoData = useCallback(
    async ({ silent = false } = {}) => {
      if (!canView) return

      setDemoRefreshing(!silent)
      if (!silent) setDemoError('')

      try {
        const [summaryPayload, movementsPayload, paymentsPayload] = await Promise.all([
          getFinanceSummary(),
          listFinanceMovements(),
          listPayments(),
        ])
        setDemoSummary(summaryPayload)
        setApiMovements(extractItems(movementsPayload))
        setApiPayments(extractItems(paymentsPayload))
      } catch (apiError) {
        if (!silent) setDemoError(getFinanceApiErrorMessage(apiError))
      } finally {
        setDemoRefreshing(false)
      }
    },
    [canView],
  )

  useEffect(() => {
    void refreshFinanceDemoData()
  }, [refreshFinanceDemoData])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const openCreateModal = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite crear movimientos financieros.')
      return
    }

    setEditingId(null)
    setFormData({
      ...emptyFinanceMovement,
      issueDate: new Date().toISOString().slice(0, 10),
      responsibleName: currentUser?.name || '',
      responsibleEmail: currentUser?.email || '',
    })
    setError('')
    setVisible(true)
  }

  const openEditModal = (movement) => {
    if (!canManage) {
      setMessage('Tu perfil no permite editar movimientos financieros.')
      return
    }

    setEditingId(movement.id)
    setFormData(normalizeFinanceMovement(movement))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyFinanceMovement)
    setError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite guardar movimientos financieros.')
      return
    }

    const existingMovement = editingId
      ? movements.find((movement) => movement.id === editingId)
      : null
    const lockedQuoteFields =
      formIsQuoteReceivable && existingMovement
        ? {
            type: existingMovement.type,
            category: existingMovement.category,
            documentType: existingMovement.documentType,
            documentNumber: existingMovement.documentNumber,
            client: existingMovement.client,
            company: existingMovement.company,
            clientSupplierName: existingMovement.clientSupplierName,
            clientSupplierRut: existingMovement.clientSupplierRut,
            quoteNumber: existingMovement.quoteNumber,
            sourceQuoteId: existingMovement.sourceQuoteId,
            sourceType: existingMovement.sourceType,
            quoteSourceLocked: existingMovement.quoteSourceLocked,
            relatedModule: existingMovement.relatedModule,
            relatedId: existingMovement.relatedId,
            relatedName: existingMovement.relatedName,
            description: existingMovement.description,
            netAmount: existingMovement.netAmount,
            taxRate: existingMovement.taxRate,
            ivaRate: existingMovement.ivaRate,
            taxAmount: existingMovement.taxAmount,
            ivaAmount: existingMovement.ivaAmount,
            isTaxExempt: existingMovement.isTaxExempt,
            taxExempt: existingMovement.taxExempt,
          }
        : {}

    const movementToValidate = { ...formData, ...lockedQuoteFields }
    const validationErrors = validateFinanceMovement(movementToValidate)
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '))
      return
    }

    const payload = createFinanceMovementPayload(
      {
      ...formData,
      ...lockedQuoteFields,
      id: editingId || undefined,
      responsibleName: formData.responsibleName || currentUser?.name || '',
      responsibleEmail: formData.responsibleEmail || currentUser?.email || '',
      updatedAt: new Date().toISOString(),
      },
      { currentUser, action: editingId ? 'Edición' : 'Creación' },
    )

    setMovements((currentMovements) => {
      if (editingId) {
        return currentMovements.map((movement) => (movement.id === editingId ? payload : movement))
      }

      return [payload, ...currentMovements]
    })

    setMessage(editingId ? 'Movimiento financiero actualizado.' : 'Movimiento financiero creado.')
    closeModal()
  }

  const handleVoid = (movement) => {
    if (!canManage) {
      setMessage('Tu perfil no permite anular movimientos financieros.')
      return
    }

    const observations = window.prompt('Motivo de anulación', movement.observations || '')
    if (!observations?.trim()) {
      setMessage('La anulación requiere una observación.')
      return
    }

    const payload = createFinanceMovementPayload(
      {
        ...movement,
        status: 'Anulado',
        observations,
        updatedAt: new Date().toISOString(),
      },
      { currentUser, action: 'Anulación' },
    )

    setMovements((currentMovements) =>
      currentMovements.map((currentMovement) =>
        currentMovement.id === movement.id ? payload : currentMovement,
      ),
    )
    setMessage('Movimiento anulado localmente.')
  }

  const handleExport = async () => {
    if (!canExport) {
      setMessage('Tu perfil no permite exportar reportes financieros.')
      return
    }

    await exportListToExcel({
      fileName: 'Finanzas-ERP-Rubik',
      sheetName: 'Finanzas',
      title: 'Movimientos financieros ERP Rubik',
      columns: [
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Descripción', key: 'description', width: 34 },
        { header: 'Documento', key: 'documentNumber', width: 18 },
        { header: 'Cliente/Proveedor', key: 'clientSupplierName', width: 26 },
        { header: 'Neto', key: 'netAmount', width: 14 },
        { header: 'IVA', key: 'ivaAmount', width: 14 },
        { header: 'Total', key: 'totalAmount', width: 14 },
        { header: 'Pagado', key: 'paidAmount', width: 14 },
        { header: 'Saldo', key: 'balanceAmount', width: 14 },
        { header: 'Estado', key: 'status', width: 16 },
        { header: 'Emisión', key: 'issueDate', width: 16 },
        { header: 'Vencimiento', key: 'dueDate', width: 16 },
        { header: 'Pago', key: 'paymentDate', width: 16 },
      ],
      rows: filteredMovements,
      summary: [
        { label: 'Ingresos', value: summary.totalIncome },
        { label: 'Egresos', value: summary.totalExpenses },
        { label: 'Pagado', value: summary.totalPaid },
        { label: 'Saldo pendiente', value: summary.totalBalance },
      ],
    })
    setMessage('Listado financiero exportado correctamente.')
  }

  const handleSandboxDemo = async () => {
    setDemoLoading(true)
    setDemoError('')
    setDemoResult(null)

    try {
      const result = await runSandboxPaymentDemo()
      setDemoResult(result)
      setMessage(result?.message || 'Pago sandbox simulado correctamente.')
      await refreshFinanceDemoData({ silent: true })
    } catch (apiError) {
      setDemoError(getFinanceApiErrorMessage(apiError))
    } finally {
      setDemoLoading(false)
    }
  }

  if (!canView) {
    return <CAlert color="danger">Tu perfil no tiene permiso para ver Finanzas.</CAlert>
  }

  const apiSummary = demoSummary || {}
  const demoPayment = demoResult?.payment || {}
  const demoMovement = demoResult?.movement || {}

  return (
    <CRow className="g-4">
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Ingresos</div>
            <div className="fs-4 fw-semibold">{formatCurrency(summary.totalIncome)}</div>
            <CProgress thin color="success" value={summary.totalIncome > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Egresos</div>
            <div className="fs-4 fw-semibold">{formatCurrency(summary.totalExpenses)}</div>
            <CProgress thin color="danger" value={summary.totalExpenses > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Por cobrar</div>
            <div className="fs-4 fw-semibold">{formatCurrency(summary.receivable)}</div>
            <CProgress thin color="info" value={summary.receivable > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Por pagar</div>
            <div className="fs-4 fw-semibold">{formatCurrency(summary.payable)}</div>
            <CProgress thin color="warning" value={summary.payable > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Vencidos</div>
            <div className="fs-4 fw-semibold">{summary.overdue}</div>
            <CProgress thin color={summary.overdue > 0 ? 'danger' : 'success'} value={summary.overdue > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={2} md={4} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Flujo estimado</div>
            <div className="fs-4 fw-semibold">{formatCurrency(summary.projectedFlow)}</div>
            <CProgress thin color={summary.projectedFlow >= 0 ? 'success' : 'danger'} value={100} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Testrun Pago Sandbox</strong>{' '}
              <small>modo actual: {apiSummary.paymentsMode || 'sandbox'}</small>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CBadge color="info">provider {apiSummary.paymentProvider || 'sandbox'}</CBadge>
              <CButton
                color="primary"
                onClick={handleSandboxDemo}
                disabled={demoLoading || !canCreatePayments}
              >
                {demoLoading ? 'Simulando...' : 'Simular pago aprobado'}
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            <CAlert color="warning">
              Modo sandbox: este pago es simulado y no mueve dinero real.
            </CAlert>
            {demoError && (
              <CAlert color="danger" dismissible onClose={() => setDemoError('')}>
                {demoError}
              </CAlert>
            )}
            {!canCreatePayments && (
              <CAlert color="danger">
                No tienes permisos financieros para ejecutar esta demo.
              </CAlert>
            )}
            {demoResult && (
              <CAlert color="success">
                <div className="fw-semibold">{demoResult.message}</div>
                <CRow className="g-2 mt-2">
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Movement ID</div>
                    <div className="fw-semibold text-break">{demoMovement.id || '-'}</div>
                  </CCol>
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Payment ID</div>
                    <div className="fw-semibold text-break">{demoPayment.id || '-'}</div>
                  </CCol>
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Pago</div>
                    <CBadge color={getPaymentStatusColor(demoPayment.status)}>{demoPayment.status || '-'}</CBadge>
                  </CCol>
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Movimiento</div>
                    <CBadge color={getStatusColor(demoMovement.status)}>{demoMovement.status || '-'}</CBadge>
                  </CCol>
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Monto</div>
                    <div className="fw-semibold">{formatCurrency(demoPayment.amount || demoMovement.totalAmount || 0)}</div>
                  </CCol>
                  <CCol md={2} sm={6}>
                    <div className="small text-body-secondary">Fecha</div>
                    <div className="fw-semibold">{formatDate(demoPayment.paymentDate || demoPayment.transactionDate)}</div>
                  </CCol>
                </CRow>
              </CAlert>
            )}

            <CRow className="g-3 mb-3">
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Ingresos</div>
                  <div className="fs-6 fw-semibold">{formatCurrency(apiSummary.income || 0)}</div>
                </CAlert>
              </CCol>
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Egresos</div>
                  <div className="fs-6 fw-semibold">{formatCurrency(apiSummary.expenses || 0)}</div>
                </CAlert>
              </CCol>
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Pagos pendientes</div>
                  <div className="fs-6 fw-semibold">{apiSummary.paymentsPending || 0}</div>
                </CAlert>
              </CCol>
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Pagos aprobados</div>
                  <div className="fs-6 fw-semibold">{apiSummary.paymentsApproved || 0}</div>
                </CAlert>
              </CCol>
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Total pagado</div>
                  <div className="fs-6 fw-semibold">{formatCurrency(apiSummary.totalPaid || 0)}</div>
                </CAlert>
              </CCol>
              <CCol xl={2} md={4} sm={6}>
                <CAlert color="light" className="mb-0">
                  <div className="small text-body-secondary">Total por cobrar</div>
                  <div className="fs-6 fw-semibold">{formatCurrency(apiSummary.totalToCollect || apiSummary.receivable || 0)}</div>
                </CAlert>
              </CCol>
            </CRow>

            <CRow className="g-3">
              <CCol lg={6}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong>Ultimos pagos</strong>
                  {demoRefreshing && <small className="text-body-secondary">Actualizando...</small>}
                </div>
                <CTable responsive hover small align="middle">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>Pago</CTableHeaderCell>
                      <CTableHeaderCell>Monto</CTableHeaderCell>
                      <CTableHeaderCell>Estado</CTableHeaderCell>
                      <CTableHeaderCell>Proveedor</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {lastApiPayments.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={4} className="text-body-secondary">
                          Sin pagos registrados.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {lastApiPayments.map((payment) => (
                      <CTableRow key={payment.id}>
                        <CTableDataCell>
                          <div className="fw-semibold text-break">{payment.id}</div>
                          <div className="small text-body-secondary">{formatDate(payment.paymentDate || payment.transactionDate)}</div>
                        </CTableDataCell>
                        <CTableDataCell>{formatCurrency(payment.amount)}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getPaymentStatusColor(payment.status)}>{payment.status}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{payment.provider || '-'}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCol>
              <CCol lg={6}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong>Ultimos movimientos</strong>
                  <CButton color="secondary" variant="outline" size="sm" onClick={() => refreshFinanceDemoData()}>
                    Actualizar
                  </CButton>
                </div>
                <CTable responsive hover small align="middle">
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>Movimiento</CTableHeaderCell>
                      <CTableHeaderCell>Total</CTableHeaderCell>
                      <CTableHeaderCell>Pagado / saldo</CTableHeaderCell>
                      <CTableHeaderCell>Estado</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {lastApiMovements.length === 0 && (
                      <CTableRow>
                        <CTableDataCell colSpan={4} className="text-body-secondary">
                          Sin movimientos desde API.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                    {lastApiMovements.map((movement) => (
                      <CTableRow key={movement.id}>
                        <CTableDataCell>
                          <div className="fw-semibold">{movement.description || '-'}</div>
                          <div className="small text-body-secondary">{movement.documentNumber || movement.id}</div>
                        </CTableDataCell>
                        <CTableDataCell>{formatCurrency(movement.totalAmount)}</CTableDataCell>
                        <CTableDataCell>
                          <div>{formatCurrency(movement.paidAmount)}</div>
                          <div className="small text-body-secondary">Saldo {formatCurrency(movement.pendingAmount || movement.balanceAmount || 0)}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getStatusColor(movement.status)}>{movement.status}</CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Finanzas privadas</strong> <small>ingresos, egresos, IVA, pagos y saldos calculados</small>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <CBadge color="primary">{filteredMovements.length} movimientos</CBadge>
              <CButton color="success" variant="outline" onClick={handleExport} disabled={filteredMovements.length === 0 || !canExport}>
                Exportar Excel
              </CButton>
              {canManage && (
                <CButton color="primary" onClick={openCreateModal}>
                  Nuevo movimiento
                </CButton>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            {message && <CAlert color="success" dismissible onClose={() => setMessage('')}>{message}</CAlert>}
            <CAlert color="info">
              Los totales críticos se calculan automáticamente desde monto neto, IVA y monto pagado. No se edita manualmente el total ni el saldo.
            </CAlert>

            <CRow className="g-3 mb-3">
              <CCol lg={4}>
                <CFormLabel>Búsqueda</CFormLabel>
                <CFormInput name="search" value={filters.search} onChange={handleFilterChange} placeholder="Buscar por descripción, documento, cliente o proveedor" />
              </CCol>
              <CCol lg={2} md={4}>
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect name="type" value={filters.type} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  {FINANCE_MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </CFormSelect>
              </CCol>
              <CCol lg={2} md={4}>
                <CFormLabel>Estado</CFormLabel>
                <CFormSelect name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">Todos</option>
                  {FINANCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </CFormSelect>
              </CCol>
              <CCol lg={2} md={4}>
                <CFormLabel>Categoría</CFormLabel>
                <CFormSelect name="category" value={filters.category} onChange={handleFilterChange}>
                  <option value="">Todas</option>
                  {FINANCE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </CFormSelect>
              </CCol>
              <CCol lg={2} className="d-flex align-items-end">
                <CButton color="secondary" variant="outline" onClick={() => setFilters(initialFilters)}>Limpiar</CButton>
              </CCol>
            </CRow>

            <CTable responsive hover align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Movimiento</CTableHeaderCell>
                  <CTableHeaderCell>Documento</CTableHeaderCell>
                  <CTableHeaderCell>Cliente / proveedor</CTableHeaderCell>
                  <CTableHeaderCell>Total</CTableHeaderCell>
                  <CTableHeaderCell>Pagado / saldo</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Fechas</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredMovements.map((movement) => (
                  <CTableRow key={movement.id}>
                    <CTableDataCell style={{ minWidth: '260px' }}>
                      <CBadge color={getTypeColor(movement.type)}>{movement.type}</CBadge>{' '}
                      <CBadge color="light" textColor="dark">{movement.category}</CBadge>
                      <div className="fw-semibold mt-1">{movement.description}</div>
                      <div className="small text-body-secondary">Neto {formatCurrency(movement.netAmount)} · IVA {formatCurrency(movement.ivaAmount)}</div>
                    </CTableDataCell>
                    <CTableDataCell>{movement.documentType}<div className="small text-body-secondary">{movement.documentNumber || '-'}</div></CTableDataCell>
                    <CTableDataCell>{movement.clientSupplierName || '-'}<div className="small text-body-secondary">{movement.clientSupplierRut || '-'}</div></CTableDataCell>
                    <CTableDataCell className="fw-semibold">{formatCurrency(movement.totalAmount)}</CTableDataCell>
                    <CTableDataCell>
                      <div>{formatCurrency(movement.paidAmount)}</div>
                      <div className="small text-body-secondary">Saldo {formatCurrency(movement.balanceAmount)}</div>
                    </CTableDataCell>
                    <CTableDataCell><CBadge color={getStatusColor(movement.status)}>{movement.status}</CBadge></CTableDataCell>
                    <CTableDataCell>{formatDate(movement.issueDate)}<div className="small text-body-secondary">Vence {formatDate(movement.dueDate)}</div></CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup size="sm">
                        {canManage && <CButton color="secondary" variant="outline" onClick={() => openEditModal(movement)}>Editar</CButton>}
                        {canManage && movement.status !== 'Anulado' && (
                          <CButton color="danger" variant="outline" onClick={() => handleVoid(movement)}>
                            Anular
                          </CButton>
                        )}
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="xl">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader><CModalTitle>{editingId ? 'Editar movimiento' : 'Nuevo movimiento financiero'}</CModalTitle></CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              {formIsQuoteReceivable && (
                <CCol xs={12}>
                  <CAlert color="warning" className="mb-0">
                    Este ingreso viene desde una cotizacion. Los montos comerciales quedan bloqueados; solo se editan condiciones de pago, vencimiento, pago, metodo y observaciones.
                  </CAlert>
                </CCol>
              )}
              <CCol md={3}><CFormLabel>Tipo</CFormLabel><CFormSelect name="type" value={formData.type} onChange={handleChange} disabled={formIsQuoteReceivable}>{FINANCE_MOVEMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Categoría</CFormLabel><CFormSelect name="category" value={formData.category} onChange={handleChange}>{FINANCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</CFormSelect></CCol>
              <CCol md={6}><CFormLabel>Descripción</CFormLabel><CFormInput name="description" value={formData.description} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Tipo documento</CFormLabel><CFormSelect name="documentType" value={formData.documentType} onChange={handleChange} disabled={formIsQuoteReceivable}>{FINANCE_DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>N° documento</CFormLabel><CFormInput name="documentNumber" value={formData.documentNumber} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Cliente / proveedor</CFormLabel><CFormInput name="clientSupplierName" value={formData.clientSupplierName} onChange={handleChange} disabled={formIsQuoteReceivable} /></CCol>
              <CCol md={3}><CFormLabel>RUT</CFormLabel><CFormInput name="clientSupplierRut" value={formData.clientSupplierRut} onChange={handleChange} disabled={formIsQuoteReceivable} /></CCol>
              <CCol md={3}><CFormLabel>Monto neto</CFormLabel><CFormInput type="number" name="netAmount" value={formData.netAmount} onChange={handleChange} disabled={formIsQuoteReceivable} /></CCol>
              <CCol md={2}><CFormLabel>IVA %</CFormLabel><CFormInput type="number" name="ivaRate" value={formData.ivaRate} onChange={handleChange} disabled={formData.taxExempt || formIsQuoteReceivable} /></CCol>
              <CCol md={2} className="d-flex align-items-end"><CFormCheck name="taxExempt" checked={Boolean(formData.taxExempt)} onChange={handleChange} label="Exento" disabled={formIsQuoteReceivable} /></CCol>
              <CCol md={2}><CFormLabel>Pagado</CFormLabel><CFormInput type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} /></CCol>
              <CCol md={3}>
                <CAlert color="light" className="mb-0">
                  <div>Total: <strong>{formatCurrency(formCalculation.totalAmount)}</strong></div>
                  <div>Saldo: <strong>{formatCurrency(formCalculation.pendingAmount)}</strong></div>
                  <div>Estado: <strong>{formCalculation.calculatedStatus}</strong></div>
                </CAlert>
              </CCol>
              <CCol md={3}><CFormLabel>Emisión</CFormLabel><CFormInput type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Vencimiento</CFormLabel><CFormInput type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Fecha pago</CFormLabel><CFormInput type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Método pago</CFormLabel><CFormSelect name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>{FINANCE_PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</CFormSelect></CCol>
              <CCol md={6}><CFormLabel>Módulo relacionado</CFormLabel><CFormInput name="relatedName" value={formData.relatedName} onChange={handleChange} placeholder="Cotización, licitación, OT, cliente, proveedor" /></CCol>
              <CCol md={6}><CFormLabel>Comprobante / archivo</CFormLabel><CFormInput name="attachmentName" value={formData.attachmentName} onChange={handleChange} placeholder="Nombre de archivo o referencia" /></CCol>
              <CCol md={6}><CFormLabel>Condiciones de pago</CFormLabel><CFormInput name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} placeholder="30 dias, contado, anticipo..." /></CCol>
              <CCol xs={12}><CFormLabel>Observaciones</CFormLabel><CFormTextarea rows={3} name="notes" value={formData.notes} onChange={handleChange} /></CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeModal}>Cancelar</CButton>
            <CButton color="primary" type="submit">Guardar</CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Finanzas
