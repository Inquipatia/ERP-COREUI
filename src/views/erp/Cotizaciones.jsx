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
import { mockQuotes } from '../../data/mockQuotes'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const getStatusColor = (status) => {
  if (status === 'Aprobada' || status === 'Emitida') return 'success'
  if (status === 'Enviada') return 'info'
  if (status === 'Borrador') return 'secondary'
  return 'warning'
}

const normalizeQuote = (quote) => ({
  ...quote,
  id: quote.id || createLocalId('quote'),
  quoteNumber: String(quote.quoteNumber || quote.number || '8103'),
  date: quote.date || quote.fecha || '',
  client: quote.client || quote.clientName || '',
  company: quote.company || '',
  seller: quote.seller || '',
  net: Number(quote.net) || 0,
  iva: Number(quote.iva) || 0,
  total: Number(quote.total) || 0,
  status: quote.status || 'Borrador',
  items: Array.isArray(quote.items) ? quote.items : [],
})

const matchesFilters = (quote, filters) => {
  const search = filters.search.trim().toLowerCase()
  const status = filters.status

  const matchesSearch =
    !search ||
    [quote.client, quote.seller, quote.status, quote.quoteNumber].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(search),
    )

  const matchesStatus = !status || quote.status === status

  return matchesSearch && matchesStatus
}

const Cotizaciones = () => {
  const [quotes, setQuotes] = useLocalStorageState(
    STORAGE_KEYS.quotes,
    mockQuotes.map(normalizeQuote),
  )
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [message, setMessage] = useState('')
  const [selectedQuote, setSelectedQuote] = useState(null)

  const normalizedQuotes = useMemo(() => quotes.map(normalizeQuote), [quotes])
  const filteredQuotes = useMemo(
    () => normalizedQuotes.filter((quote) => matchesFilters(quote, filters)),
    [normalizedQuotes, filters],
  )
  const statuses = useMemo(
    () => [...new Set(normalizedQuotes.map((quote) => quote.status).filter(Boolean))],
    [normalizedQuotes],
  )

  const handleDuplicate = (quote) => {
    const numericNumbers = normalizedQuotes
      .map((currentQuote) => Number(currentQuote.quoteNumber))
      .filter((quoteNumber) => Number.isFinite(quoteNumber))
    const nextNumber = String(Math.max(8102, ...numericNumbers) + 1)
    const duplicatedQuote = {
      ...quote,
      id: createLocalId('quote'),
      quoteNumber: nextNumber,
      status: 'Borrador',
    }

    setQuotes((currentQuotes) => [...currentQuotes, duplicatedQuote])
    setMessage(`Cotización ${quote.quoteNumber} duplicada como ${nextNumber}.`)
  }

  const handleDelete = (quote) => {
    setQuotes((currentQuotes) =>
      currentQuotes.filter((currentQuote) => currentQuote.id !== quote.id),
    )
    setMessage(`Cotización ${quote.quoteNumber} eliminada localmente.`)
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Cotizaciones guardadas</strong> <small>Repositorio local preparado</small>
          </CCardHeader>
          <CCardBody>
            {message && (
              <CAlert color="info" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}
            <CRow className="g-3 mb-3">
              <CCol lg={5}>
                <CFormLabel htmlFor="quoteSearch">Buscar</CFormLabel>
                <CFormInput
                  id="quoteSearch"
                  placeholder="Cliente, vendedor, estado o número"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                />
              </CCol>
              <CCol lg={3}>
                <CFormLabel htmlFor="statusFilter">Estado</CFormLabel>
                <CFormSelect
                  id="statusFilter"
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="">Todos</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>N° cotización</CTableHeaderCell>
                  <CTableHeaderCell>Fecha</CTableHeaderCell>
                  <CTableHeaderCell>Cliente</CTableHeaderCell>
                  <CTableHeaderCell>Empresa</CTableHeaderCell>
                  <CTableHeaderCell>Vendedor</CTableHeaderCell>
                  <CTableHeaderCell>Neto</CTableHeaderCell>
                  <CTableHeaderCell>IVA</CTableHeaderCell>
                  <CTableHeaderCell>Total</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredQuotes.map((quote) => (
                  <CTableRow key={quote.id}>
                    <CTableDataCell className="fw-semibold">{quote.quoteNumber}</CTableDataCell>
                    <CTableDataCell>{quote.date}</CTableDataCell>
                    <CTableDataCell>{quote.client}</CTableDataCell>
                    <CTableDataCell>{quote.company}</CTableDataCell>
                    <CTableDataCell>{quote.seller}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(quote.net)}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(quote.iva)}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(quote.total)}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={getStatusColor(quote.status)}>{quote.status}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup size="sm" role="group" aria-label="Acciones de cotización">
                        <CButton
                          color="primary"
                          variant="outline"
                          type="button"
                          onClick={() => setSelectedQuote(quote)}
                        >
                          Ver
                        </CButton>
                        <CButton
                          color="info"
                          variant="outline"
                          type="button"
                          onClick={() => handleDuplicate(quote)}
                        >
                          Duplicar
                        </CButton>
                        <CButton
                          color="danger"
                          variant="outline"
                          type="button"
                          onClick={() => handleDelete(quote)}
                        >
                          Eliminar
                        </CButton>
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={Boolean(selectedQuote)} onClose={() => setSelectedQuote(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Cotización {selectedQuote?.quoteNumber}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedQuote && (
            <>
              <CRow className="g-3 mb-3">
                <CCol md={6}>
                  <div className="text-body-secondary small">Cliente</div>
                  <div className="fw-semibold">{selectedQuote.client}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Empresa</div>
                  <div className="fw-semibold">{selectedQuote.company}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Vendedor</div>
                  <div>{selectedQuote.seller}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Fecha</div>
                  <div>{selectedQuote.date}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Estado</div>
                  <CBadge color={getStatusColor(selectedQuote.status)}>
                    {selectedQuote.status}
                  </CBadge>
                </CCol>
              </CRow>

              <CTable responsive bordered>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Cantidad</CTableHeaderCell>
                    <CTableHeaderCell>Descripción</CTableHeaderCell>
                    <CTableHeaderCell>Valor unitario</CTableHeaderCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {selectedQuote.items.map((item, index) => (
                    <CTableRow key={`${selectedQuote.id}-item-${index}`}>
                      <CTableDataCell>{item.quantity}</CTableDataCell>
                      <CTableDataCell>{item.description}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.unitValue)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.total)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              <div className="d-flex justify-content-end">
                <div style={{ minWidth: '260px' }}>
                  <div className="d-flex justify-content-between">
                    <span>Neto</span>
                    <strong>{formatCurrency(selectedQuote.net)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>IVA</span>
                    <strong>{formatCurrency(selectedQuote.iva)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Total</span>
                    <strong>{formatCurrency(selectedQuote.total)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" type="button" onClick={() => setSelectedQuote(null)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Cotizaciones
