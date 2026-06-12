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
  CProgress,
  CRow,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { mockQuotes } from '../../data/mockQuotes'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'
import { exportListToExcel } from '../../utils/exportListToExcel'

const emptyFilters = {
  search: '',
  status: '',
  minAmount: '',
  maxAmount: '',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`

const getNumberValue = (value) => Number(value) || 0

const getStatusColor = (status) => {
  if (status === 'Aprobada' || status === 'Adjudicada' || status === 'Emitida') return 'success'
  if (status === 'Enviada') return 'info'
  if (status === 'Borrador') return 'secondary'
  if (status === 'Rechazada') return 'danger'
  return 'warning'
}

const getQuoteItems = (quote) => {
  if (Array.isArray(quote.items)) {
    return quote.items
  }

  if (Array.isArray(quote.quoteItems)) {
    return quote.quoteItems
  }

  if (Array.isArray(quote.payload?.quoteItems)) {
    return quote.payload.quoteItems
  }

  return []
}

const getQuoteClient = (quote) =>
  quote.client ||
  quote.clientName ||
  quote.payload?.client?.client ||
  quote.payload?.client?.attention ||
  ''

const getQuoteCompany = (quote) => quote.company || quote.payload?.client?.company || ''

const getQuoteSeller = (quote) =>
  quote.seller || quote.payload?.seller?.name || quote.vendedor || ''

const getQuoteNumber = (quote) =>
  String(
    quote.quoteNumber ||
      quote.number ||
      quote.numeroDocumento ||
      quote.payload?.quote?.quoteNumber ||
      '8103',
  )

const getQuoteDate = (quote) => quote.date || quote.fecha || quote.payload?.quote?.date || ''

const getQuoteNet = (quote) =>
  getNumberValue(quote.net ?? quote.montoNeto ?? quote.payload?.amounts?.net)

const getQuoteIva = (quote) => getNumberValue(quote.iva ?? quote.payload?.amounts?.iva)

const getQuoteTotal = (quote) =>
  getNumberValue(quote.total ?? quote.payload?.amounts?.total)

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

const matchesFilters = (quote, filters) => {
  const search = filters.search.trim().toLowerCase()
  const status = filters.status
  const minAmount = filters.minAmount === '' ? null : Number(filters.minAmount)
  const maxAmount = filters.maxAmount === '' ? null : Number(filters.maxAmount)

  const matchesSearch =
    !search ||
    [
      quote.client,
      quote.company,
      quote.seller,
      quote.status,
      quote.quoteNumber,
      quote.subject,
      quote.condition,
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(search),
    )

  const matchesStatus = !status || quote.status === status
  const matchesMinAmount = minAmount === null || quote.total >= minAmount
  const matchesMaxAmount = maxAmount === null || quote.total <= maxAmount

  return matchesSearch && matchesStatus && matchesMinAmount && matchesMaxAmount
}

const hasValue = (value) => String(value || '').trim().length > 0

const getCompletionPercent = (quote) => {
  const fields = [
    quote.quoteNumber,
    quote.date,
    quote.client,
    quote.company,
    quote.seller,
    quote.status,
    quote.total,
  ]

  const completedFields = fields.filter(hasValue).length

  return Math.round((completedFields / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const Cotizaciones = () => {
  const [quotes, setQuotes] = useLocalStorageState(
    STORAGE_KEYS.quotes,
    mockQuotes.map(normalizeQuote),
  )
  const [filters, setFilters] = useState(emptyFilters)
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

  const quoteSummary = useMemo(() => {
    const totalQuotes = normalizedQuotes.length
    const filteredCount = filteredQuotes.length
    const totalAmount = normalizedQuotes.reduce((total, quote) => total + quote.total, 0)
    const filteredAmount = filteredQuotes.reduce((total, quote) => total + quote.total, 0)
    const draftCount = normalizedQuotes.filter((quote) => quote.status === 'Borrador').length
    const sentCount = normalizedQuotes.filter((quote) => quote.status === 'Enviada').length
    const approvedCount = normalizedQuotes.filter((quote) =>
      ['Aprobada', 'Adjudicada', 'Emitida'].includes(quote.status),
    ).length
    const rejectedCount = normalizedQuotes.filter((quote) => quote.status === 'Rechazada').length
    const withItems = normalizedQuotes.filter((quote) => quote.items.length > 0).length
    const averageAmount = totalQuotes > 0 ? Math.round(totalAmount / totalQuotes) : 0
    const conversionPercent = totalQuotes > 0 ? Math.round((approvedCount / totalQuotes) * 100) : 0

    return {
      totalQuotes,
      filteredCount,
      totalAmount,
      filteredAmount,
      draftCount,
      sentCount,
      approvedCount,
      rejectedCount,
      withItems,
      averageAmount,
      conversionPercent,
    }
  }, [normalizedQuotes, filteredQuotes])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }))
  }

  const handleDuplicate = (quote) => {
    const numericNumbers = normalizedQuotes
      .map((currentQuote) => Number(currentQuote.quoteNumber))
      .filter((quoteNumber) => Number.isFinite(quoteNumber))

    const nextNumber = String(Math.max(8102, ...numericNumbers) + 1)
    const duplicatedQuote = normalizeQuote({
      ...quote,
      id: createLocalId('quote'),
      quoteNumber: nextNumber,
      status: 'Borrador',
    })

    setQuotes((currentQuotes) => [...currentQuotes, duplicatedQuote])
    setMessage(`Cotización ${quote.quoteNumber} duplicada como ${nextNumber}.`)
  }

  const handleDelete = (quote) => {
    setQuotes((currentQuotes) =>
      currentQuotes.filter((currentQuote) => currentQuote.id !== quote.id),
    )
    setMessage(`Cotización ${quote.quoteNumber} eliminada localmente.`)
  }

  const handleExportQuotesList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Cotizaciones-ERP-Rubik',
        sheetName: 'Cotizaciones',
        title: 'Listado de cotizaciones ERP Rubik',
        columns: [
          { header: 'N° cotización', key: 'quoteNumber', width: 18 },
          { header: 'Fecha', key: 'date', width: 16 },
          { header: 'Cliente', key: 'client', width: 26 },
          { header: 'Empresa', key: 'company', width: 28 },
          { header: 'Vendedor', key: 'seller', width: 24 },
          { header: 'Tema / asunto', key: 'subject', width: 36 },
          { header: 'Condición comercial', key: 'condition', width: 24 },
          {
            header: 'Neto',
            key: 'net',
            width: 16,
            numFmt: '"$"#,##0',
          },
          {
            header: 'IVA',
            key: 'iva',
            width: 16,
            numFmt: '"$"#,##0',
          },
          {
            header: 'Total',
            key: 'total',
            width: 16,
            numFmt: '"$"#,##0',
          },
          { header: 'Estado', key: 'status', width: 18 },
          {
            header: 'Cantidad de ítems',
            key: 'items',
            width: 18,
            value: (quote) => quote.items.length,
          },
          {
            header: 'Completitud ficha',
            key: 'completion',
            width: 18,
            value: (quote) => `${getCompletionPercent(quote)}%`,
          },
        ],
        rows: filteredQuotes,
        summary: [
          { label: 'Cotizaciones exportadas', value: filteredQuotes.length },
          { label: 'Total cotizaciones guardadas', value: quoteSummary.totalQuotes },
          { label: 'Total comercial filtrado', value: formatCurrency(quoteSummary.filteredAmount) },
          { label: 'Total comercial general', value: formatCurrency(quoteSummary.totalAmount) },
          { label: 'Promedio por cotización', value: formatCurrency(quoteSummary.averageAmount) },
          { label: 'Borradores', value: quoteSummary.draftCount },
          { label: 'Enviadas', value: quoteSummary.sentCount },
          { label: 'Aprobadas / adjudicadas / emitidas', value: quoteSummary.approvedCount },
          { label: 'Tasa comercial estimada', value: formatPercent(quoteSummary.conversionPercent) },
        ],
      })

      setMessage('Listado de cotizaciones exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando listado de cotizaciones:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de cotizaciones.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Cotizaciones guardadas</div>
            <div className="fs-3 fw-semibold">{quoteSummary.totalQuotes}</div>
            <CProgress thin color="primary" value={quoteSummary.totalQuotes > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Total cotizado</div>
            <div className="fs-5 fw-semibold">{formatCurrency(quoteSummary.totalAmount)}</div>
            <div className="small text-body-secondary">
              Promedio: {formatCurrency(quoteSummary.averageAmount)}
            </div>
            <CProgress thin color="success" value={quoteSummary.totalQuotes > 0 ? 85 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Gestión comercial</div>
            <div className="fs-3 fw-semibold">{quoteSummary.approvedCount}</div>
            <div className="small text-body-secondary">
              {formatPercent(quoteSummary.conversionPercent)} aprobadas/adjudicadas
            </div>
            <CProgress
              thin
              color={quoteSummary.conversionPercent >= 50 ? 'success' : 'warning'}
              value={quoteSummary.conversionPercent}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Resultado filtrado</div>
            <div className="fs-3 fw-semibold">{quoteSummary.filteredCount}</div>
            <div className="small text-body-secondary">
              {formatCurrency(quoteSummary.filteredAmount)}
            </div>
            <CProgress
              thin
              color="info"
              value={
                quoteSummary.totalQuotes > 0
                  ? Math.round((quoteSummary.filteredCount / quoteSummary.totalQuotes) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Cotizaciones guardadas</strong>{' '}
              <small>Repositorio comercial local preparado</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredQuotes.length} cotizaciones</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportQuotesList}
                disabled={filteredQuotes.length === 0}
              >
                Exportar listado Excel
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            {message && (
              <CAlert color="info" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            <CRow className="g-3 mb-3">
              <CCol lg={4}>
                <CFormLabel htmlFor="quoteSearch">Buscar</CFormLabel>
                <CFormInput
                  id="quoteSearch"
                  name="search"
                  placeholder="Cliente, empresa, vendedor, estado, tema o número"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </CCol>

              <CCol lg={2}>
                <CFormLabel htmlFor="statusFilter">Estado</CFormLabel>
                <CFormSelect
                  id="statusFilter"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol lg={3}>
                <CFormLabel>Rango total</CFormLabel>
                <div className="d-flex gap-2">
                  <CFormInput
                    aria-label="Monto mínimo"
                    name="minAmount"
                    type="number"
                    min="0"
                    placeholder="Mín."
                    value={filters.minAmount}
                    onChange={handleFilterChange}
                  />
                  <CFormInput
                    aria-label="Monto máximo"
                    name="maxAmount"
                    type="number"
                    min="0"
                    placeholder="Máx."
                    value={filters.maxAmount}
                    onChange={handleFilterChange}
                  />
                </div>
              </CCol>

              <CCol lg={3} className="d-flex align-items-end gap-2 flex-wrap">
                <CBadge color="secondary">Borradores: {quoteSummary.draftCount}</CBadge>
                <CBadge color="info">Enviadas: {quoteSummary.sentCount}</CBadge>
                <CBadge color="success">Aprobadas: {quoteSummary.approvedCount}</CBadge>
                <CBadge color="danger">Rechazadas: {quoteSummary.rejectedCount}</CBadge>
              </CCol>

              <CCol xs={12}>
                <CButton
                  color="secondary"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpiar filtros
                </CButton>
              </CCol>
            </CRow>

            {filteredQuotes.length === 0 ? (
              <CAlert color="warning">No hay cotizaciones que coincidan con la búsqueda.</CAlert>
            ) : (
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
                    <CTableHeaderCell>Ficha</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredQuotes.map((quote) => {
                    const completionPercent = getCompletionPercent(quote)

                    return (
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
                        <CTableDataCell style={{ minWidth: '150px' }}>
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Completitud</span>
                            <strong>{completionPercent}%</strong>
                          </div>
                          <CProgress
                            thin
                            color={getCompletionColor(completionPercent)}
                            value={completionPercent}
                          />
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
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
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
                <CCol md={6}>
                  <div className="text-body-secondary small">Tema / asunto</div>
                  <div>{selectedQuote.subject || '-'}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Condición comercial</div>
                  <div>{selectedQuote.condition || '-'}</div>
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
                  {selectedQuote.items.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={4}>
                        Esta cotización no tiene ítems registrados.
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    selectedQuote.items.map((item, index) => (
                      <CTableRow key={`${selectedQuote.id}-item-${index}`}>
                        <CTableDataCell>{item.quantity}</CTableDataCell>
                        <CTableDataCell>{item.description}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(item.unitValue)}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(item.total)}</CTableDataCell>
                      </CTableRow>
                    ))
                  )}
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
