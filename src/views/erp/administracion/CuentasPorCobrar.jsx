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

import { mockQuotes } from '../../../data/mockQuotes'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate } from '../../../utils/financeCalculations'
import { STORAGE_KEYS, createLocalId, useLocalStorageState } from '../../../utils/storage'
import {
  createReceivableFromQuote,
  FINANCE_PAYMENT_METHODS,
  getQuoteFinancialStatus,
  isQuoteApprovedForReceivable,
  quoteHasFinancialMovement,
  useFinanceMovements,
} from '../../../utils/financeStorage'

const getNumberValue = (value) => Number(value) || 0

const getStatusColor = (status) => {
  if (['Pagada', 'Pagado'].includes(status)) return 'success'
  if (status === 'Pago parcial') return 'info'
  if (['Vencida', 'Vencido'].includes(status)) return 'danger'
  if (status === 'Sin cuenta por cobrar') return 'secondary'
  return 'warning'
}

const getQuoteItems = (quote) => {
  if (Array.isArray(quote.items)) return quote.items
  if (Array.isArray(quote.quoteItems)) return quote.quoteItems
  if (Array.isArray(quote.payload?.quoteItems)) return quote.payload.quoteItems
  return []
}

const getQuoteNumber = (quote) =>
  String(
    quote.quoteNumber ||
      quote.number ||
      quote.numeroDocumento ||
      quote.payload?.quote?.quoteNumber ||
      '',
  )

const getQuoteClient = (quote) =>
  quote.client ||
  quote.clientName ||
  quote.payload?.client?.client ||
  quote.payload?.client?.attention ||
  ''

const getQuoteCompany = (quote) => quote.company || quote.payload?.client?.company || ''
const getQuoteSeller = (quote) => quote.seller || quote.payload?.seller?.name || quote.vendedor || ''
const getQuoteDate = (quote) => quote.date || quote.fecha || quote.payload?.quote?.date || ''
const getQuoteNet = (quote) =>
  getNumberValue(quote.net ?? quote.montoNeto ?? quote.payload?.amounts?.net)
const getQuoteIva = (quote) => getNumberValue(quote.iva ?? quote.payload?.amounts?.iva)
const getQuoteTotal = (quote) => getNumberValue(quote.total ?? quote.payload?.amounts?.total)

const normalizeQuote = (quote) => ({
  ...quote,
  id: quote.id || createLocalId('quote'),
  quoteNumber: getQuoteNumber(quote),
  date: getQuoteDate(quote),
  client: getQuoteClient(quote),
  company: getQuoteCompany(quote),
  seller: getQuoteSeller(quote),
  net: getQuoteNet(quote),
  iva: getQuoteIva(quote),
  total: getQuoteTotal(quote),
  status: quote.status || quote.estado || 'Borrador',
  subject: quote.subject || quote.tema || quote.payload?.quote?.subject || '',
  condition: quote.condition || quote.payload?.quote?.condition || '',
  items: getQuoteItems(quote),
})

const today = () => new Date().toISOString().slice(0, 10)

const CuentasPorCobrar = () => {
  const { currentUser, hasPermission } = useAuth()
  const canView = hasPermission('finance.view') || hasPermission('admin.all')
  const canManage = hasPermission('finance.manage') || hasPermission('admin.all')
  const [movements, setMovements] = useFinanceMovements()
  const [quotes] = useLocalStorageState(STORAGE_KEYS.quotes, mockQuotes.map(normalizeQuote))
  const [visible, setVisible] = useState(false)
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [receivableForm, setReceivableForm] = useState({
    dueDate: today(),
    paidAmount: 0,
    paymentMethod: 'Transferencia',
    paymentTerms: '',
    observations: '',
    isAdditionalMovement: false,
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const normalizedQuotes = useMemo(() => quotes.map(normalizeQuote), [quotes])
  const approvedQuotes = useMemo(
    () => normalizedQuotes.filter(isQuoteApprovedForReceivable),
    [normalizedQuotes],
  )
  const selectedQuote = useMemo(
    () => approvedQuotes.find((quote) => quote.id === selectedQuoteId) || null,
    [approvedQuotes, selectedQuoteId],
  )

  const rows = useMemo(
    () =>
      movements.filter(
        (movement) => movement.type === 'Ingreso' && (movement.pendingAmount ?? movement.balanceAmount) > 0,
      ),
    [movements],
  )
  const total = useMemo(
    () =>
      rows.reduce(
        (sum, movement) => sum + Number(movement.pendingAmount ?? movement.balanceAmount ?? 0),
        0,
      ),
    [rows],
  )

  const openGenerateModal = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite generar cuentas por cobrar.')
      return
    }

    const firstQuote = approvedQuotes[0]
    setSelectedQuoteId(firstQuote?.id || '')
    setReceivableForm({
      dueDate: today(),
      paidAmount: 0,
      paymentMethod: 'Transferencia',
      paymentTerms: firstQuote?.condition || '',
      observations: '',
      isAdditionalMovement: false,
    })
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setSelectedQuoteId('')
    setError('')
  }

  const handleQuoteChange = (event) => {
    const quoteId = event.target.value
    const quote = approvedQuotes.find((currentQuote) => currentQuote.id === quoteId)
    setSelectedQuoteId(quoteId)
    setReceivableForm((current) => ({
      ...current,
      paymentTerms: quote?.condition || current.paymentTerms,
    }))
  }

  const handleReceivableFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setReceivableForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleCreateReceivable = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite generar cuentas por cobrar.')
      return
    }

    if (!selectedQuote) {
      setError('Selecciona una cotizacion aprobada, aceptada o adjudicada.')
      return
    }

    if (getNumberValue(receivableForm.paidAmount) > selectedQuote.total) {
      setError('El monto pagado inicial no puede superar el total de la cotizacion.')
      return
    }

    if (
      quoteHasFinancialMovement(movements, selectedQuote) &&
      !receivableForm.isAdditionalMovement
    ) {
      setError(
        'Esta cotizacion ya tiene una cuenta por cobrar. Marca movimiento adicional si corresponde a un abono extraordinario.',
      )
      return
    }

    const receivableMovement = createReceivableFromQuote(selectedQuote, {
      currentUser,
      ...receivableForm,
    })

    setMovements((currentMovements) => [receivableMovement, ...currentMovements])
    setMessage(
      receivableForm.isAdditionalMovement
        ? 'Movimiento adicional generado desde cotizacion.'
        : 'Cuenta por cobrar generada desde cotizacion.',
    )
    closeModal()
  }

  if (!canView) {
    return <CAlert color="danger">Tu perfil no tiene permiso para ver cuentas por cobrar.</CAlert>
  }

  return (
    <CRow className="g-4">
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Total por cobrar</div>
            <div className="fs-3 fw-semibold">{formatCurrency(total)}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Documentos abiertos</div>
            <div className="fs-3 fw-semibold">{rows.length}</div>
          </CCardBody>
        </CCard>
      </CCol>
      <CCol md={4}>
        <CCard>
          <CCardBody>
            <div className="text-body-secondary small">Vencidos</div>
            <div className="fs-3 fw-semibold">
              {rows.filter((row) => row.status === 'Vencido').length}
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Cuentas por cobrar</strong> <small>ingresos pendientes de pago</small>
            </div>
            {canManage && (
              <CButton color="primary" onClick={openGenerateModal}>
                Generar desde cotizacion
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            <CTable responsive hover align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Cliente</CTableHeaderCell>
                  <CTableHeaderCell>Documento</CTableHeaderCell>
                  <CTableHeaderCell>Descripcion</CTableHeaderCell>
                  <CTableHeaderCell>Vencimiento</CTableHeaderCell>
                  <CTableHeaderCell>Saldo</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {rows.map((row) => (
                  <CTableRow key={row.id}>
                    <CTableDataCell>
                      {row.clientSupplierName || row.company || row.client || '-'}
                      {row.quoteNumber && (
                        <div className="small text-body-secondary">Cotizacion {row.quoteNumber}</div>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>{row.documentNumber || '-'}</CTableDataCell>
                    <CTableDataCell>{row.description}</CTableDataCell>
                    <CTableDataCell>{formatDate(row.dueDate)}</CTableDataCell>
                    <CTableDataCell className="fw-semibold">
                      {formatCurrency(row.pendingAmount ?? row.balanceAmount)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getStatusColor(row.status)}>{row.status}</CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="lg">
        <CForm onSubmit={handleCreateReceivable}>
          <CModalHeader>
            <CModalTitle>Generar cuenta por cobrar desde cotizacion</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {approvedQuotes.length === 0 ? (
              <CAlert color="warning" className="mb-0">
                No hay cotizaciones aprobadas, aceptadas o adjudicadas para generar cuentas por
                cobrar.
              </CAlert>
            ) : (
              <CRow className="g-3">
                <CCol xs={12}>
                  <CFormLabel>Cotizacion aprobada / aceptada / adjudicada</CFormLabel>
                  <CFormSelect value={selectedQuoteId} onChange={handleQuoteChange}>
                    {approvedQuotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.quoteNumber} - {quote.company || quote.client} -{' '}
                        {formatCurrency(quote.total)}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                {selectedQuote && (
                  <CCol xs={12}>
                    <CAlert color="light" className="mb-0">
                      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                        <div>
                          <div className="fw-semibold">
                            {selectedQuote.company || selectedQuote.client}
                          </div>
                          <div className="small text-body-secondary">
                            Neto {formatCurrency(selectedQuote.net)} | IVA{' '}
                            {formatCurrency(selectedQuote.iva)} | Total{' '}
                            {formatCurrency(selectedQuote.total)}
                          </div>
                          <div className="small text-body-secondary">
                            Vendedor: {selectedQuote.seller || '-'} | Fecha: {selectedQuote.date || '-'}
                          </div>
                        </div>
                        <CBadge color={getStatusColor(getQuoteFinancialStatus(movements, selectedQuote))}>
                          {getQuoteFinancialStatus(movements, selectedQuote)}
                        </CBadge>
                      </div>
                    </CAlert>
                  </CCol>
                )}

                <CCol md={4}>
                  <CFormLabel>Condiciones de pago</CFormLabel>
                  <CFormInput
                    name="paymentTerms"
                    value={receivableForm.paymentTerms}
                    onChange={handleReceivableFormChange}
                    placeholder="30 dias, contado, anticipo..."
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Fecha vencimiento</CFormLabel>
                  <CFormInput
                    type="date"
                    name="dueDate"
                    value={receivableForm.dueDate}
                    onChange={handleReceivableFormChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Monto pagado inicial</CFormLabel>
                  <CFormInput
                    type="number"
                    min="0"
                    name="paidAmount"
                    value={receivableForm.paidAmount}
                    onChange={handleReceivableFormChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Metodo de pago</CFormLabel>
                  <CFormSelect
                    name="paymentMethod"
                    value={receivableForm.paymentMethod}
                    onChange={handleReceivableFormChange}
                  >
                    {FINANCE_PAYMENT_METHODS.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={8} className="d-flex align-items-end">
                  <CFormCheck
                    name="isAdditionalMovement"
                    checked={Boolean(receivableForm.isAdditionalMovement)}
                    onChange={handleReceivableFormChange}
                    label="Movimiento adicional / abono extraordinario"
                  />
                </CCol>
                <CCol xs={12}>
                  <CFormLabel>Observaciones</CFormLabel>
                  <CFormTextarea
                    rows={3}
                    name="observations"
                    value={receivableForm.observations}
                    onChange={handleReceivableFormChange}
                  />
                </CCol>
              </CRow>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={approvedQuotes.length === 0}>
              Generar cuenta por cobrar
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default CuentasPorCobrar
