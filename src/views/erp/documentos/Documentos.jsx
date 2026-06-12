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
  CInputGroup,
  CInputGroupText,
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
import { CChartBar, CChartDoughnut } from '@coreui/react-chartjs'
import { exportListToExcel } from '../../../utils/exportListToExcel'

import {
  deleteDocument,
  deleteQuoteByDocument,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  documentMatchesFilters,
  duplicateDocument,
  getNumberValue,
  normalizeDocument,
  normalizeTags,
  parseDocumentDate,
  upsertDocument,
  upsertQuoteFromDocument,
  useDocumentStorage,
} from '../../../utils/documentStorage'
import { STORAGE_KEYS, useLocalStorageState } from '../../../utils/storage'

const emptyFilters = {
  search: '',
  tipoDocumento: '',
  estado: '',
  minAmount: '',
  maxAmount: '',
  dateFrom: '',
  dateTo: '',
}

const CHART_COLORS = ['#3399ff', '#2eb85c', '#f9b115', '#e55353', '#6f42c1', '#39f', '#636f83']

const getStatusColor = (status) => {
  if (status === 'Adjudicada' || status === 'Emitida') return 'success'
  if (status === 'Enviada') return 'info'
  if (status === 'Rechazada') return 'danger'
  if (status === 'Cerrada') return 'dark'
  return 'secondary'
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatDate = (date) => {
  if (!date) return '-'

  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    return date
  }

  const parsedDate = parseDocumentDate(date)

  if (!parsedDate) {
    return date
  }

  return new Intl.DateTimeFormat('es-CL').format(parsedDate)
}

const isQuoteDocument = (document) =>
  document.tipoDocumento === 'Cotización' || document.tipoDocumento === 'Cotizaci¢n'

const Documentos = () => {
  const [documents, setDocuments] = useDocumentStorage()
  const [, setQuotes] = useLocalStorageState(STORAGE_KEYS.quotes, [])
  const [filters, setFilters] = useState(emptyFilters)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [editingDocument, setEditingDocument] = useState(null)
  const [message, setMessage] = useState('')
  const [exportingDocumentId, setExportingDocumentId] = useState(null)

  const filteredDocuments = useMemo(
    () => documents.filter((document) => documentMatchesFilters(document, filters)),
    [documents, filters],
  )

  const documentSummary = useMemo(() => {
    const totalAmount = documents.reduce(
      (total, document) => total + getNumberValue(document.total),
      0,
    )
    const draftCount = documents.filter((document) => document.estado === 'Borrador').length
    const activeCount = documents.filter((document) =>
      ['Emitida', 'Enviada', 'Adjudicada'].includes(document.estado),
    ).length

    return { totalAmount, draftCount, activeCount }
  }, [documents])

  const documentsByStatus = useMemo(
    () =>
      DOCUMENT_STATUSES.map((status) => ({
        label: status,
        count: documents.filter((document) => document.estado === status).length,
      })).filter((item) => item.count > 0),
    [documents],
  )

  const documentsByType = useMemo(
    () =>
      DOCUMENT_TYPES.map((type) => ({
        label: type,
        count: documents.filter((document) => document.tipoDocumento === type).length,
      })).filter((item) => item.count > 0),
    [documents],
  )

  const statusChartData = useMemo(
    () => ({
      labels: documentsByStatus.map((item) => item.label),
      datasets: [
        {
          label: 'Documentos',
          backgroundColor: documentsByStatus.map(
            (_, index) => CHART_COLORS[index % CHART_COLORS.length],
          ),
          data: documentsByStatus.map((item) => item.count),
        },
      ],
    }),
    [documentsByStatus],
  )

  const typeChartData = useMemo(
    () => ({
      labels: documentsByType.map((item) => item.label),
      datasets: [
        {
          label: 'Documentos',
          backgroundColor: '#3399ff',
          data: documentsByType.map((item) => item.count),
        },
      ],
    }),
    [documentsByType],
  )


  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }))
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditingDocument((currentDocument) => ({ ...currentDocument, [name]: value }))
  }

  const handleDuplicate = (document) => {
    const duplicatedDocument = duplicateDocument(document)
    setDocuments((currentDocuments) => upsertDocument(currentDocuments, duplicatedDocument))
    setQuotes((currentQuotes) => upsertQuoteFromDocument(currentQuotes, duplicatedDocument))
    setMessage(
      `Documento ${document.numeroDocumento} duplicado como ${duplicatedDocument.numeroDocumento}.`,
    )
  }

  const handleDelete = (document) => {
    setDocuments((currentDocuments) => deleteDocument(currentDocuments, document.id))
    setQuotes((currentQuotes) => deleteQuoteByDocument(currentQuotes, document))
    setMessage('Documento eliminado localmente.')
  }

  const getDocumentPayload = (document) => {
    if (document.payload) {
      return document.payload
    }

    return {
      company: {},
      seller: {
        name: document.vendedor || '',
        email: '',
      },
      client: {
        client: document.cliente || '',
        company: document.empresa || '',
        attention: document.cliente || '',
        rut: '',
        phone: '',
        email: '',
        comuna: '',
        commune: '',
        address: '',
      },
      quote: {
        quoteNumber: document.numeroDocumento || '',
        date: document.fecha || '',
        subject: document.observaciones || '',
        condition: '',
        ivaRate: 19,
      },
      quoteItems: document.items || [],
      amounts: {
        net: document.montoNeto || 0,
        iva: document.iva || 0,
        total: document.total || 0,
      },
    }
  }

  const handleDownloadExcel = async (document) => {
    if (!isQuoteDocument(document)) {
      setMessage('La exportación Excel por ahora está disponible para cotizaciones.')
      return
    }

    setExportingDocumentId(`${document.id}-excel`)

    try {
      const { exportQuoteToExcel } = await import('../../../utils/exportQuoteToExcel')
      await exportQuoteToExcel(getDocumentPayload(document))
      setMessage(`Excel generado para el documento ${document.numeroDocumento}.`)
    } catch (error) {
      console.error('Error exportando Excel desde documentos:', error)
      setMessage(error.message || 'No se pudo generar el Excel del documento.')
    } finally {
      setExportingDocumentId(null)
    }
  }

  const handleDownloadPdf = async (document) => {
    if (!isQuoteDocument(document)) {
      setMessage('La exportación PDF por ahora está disponible para cotizaciones.')
      return
    }

    setExportingDocumentId(`${document.id}-pdf`)

    try {
      const { exportQuoteToPdf } = await import('../../../utils/exportQuoteToPdf')
      await exportQuoteToPdf(getDocumentPayload(document))
      setMessage(`PDF generado para el documento ${document.numeroDocumento}.`)
    } catch (error) {
      console.error('Error exportando PDF desde documentos:', error)
      setMessage(error.message || 'No se pudo generar el PDF del documento.')
    } finally {
      setExportingDocumentId(null)
    }
  }



  const handleExportDocumentsList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Documentos-ERP-Rubik',
        sheetName: 'Documentos',
        title: 'Listado de documentos ERP Rubik',
        columns: [
          { header: 'Tipo', key: 'tipoDocumento', width: 22 },
          { header: 'N° documento', key: 'numeroDocumento', width: 18 },
          { header: 'Fecha', key: 'fecha', width: 16 },
          { header: 'Cliente', key: 'cliente', width: 24 },
          { header: 'Empresa', key: 'empresa', width: 26 },
          { header: 'Vendedor', key: 'vendedor', width: 24 },
          {
            header: 'Neto',
            key: 'montoNeto',
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
          { header: 'Estado', key: 'estado', width: 18 },
          {
            header: 'Tags',
            key: 'tags',
            width: 28,
            value: (document) => document.tags.join(', '),
          },
          { header: 'Origen', key: 'origen', width: 20 },
          { header: 'Observaciones', key: 'observaciones', width: 40 },
        ],
        rows: filteredDocuments,
        summary: [
          { label: 'Documentos exportados', value: filteredDocuments.length },
          { label: 'Total documentos guardados', value: documents.length },
          { label: 'Total comercial filtrado', value: formatCurrency(documentSummary.totalAmount) },
          { label: 'Activos', value: documentSummary.activeCount },
          { label: 'Borradores', value: documentSummary.draftCount },
        ],
      })

      setMessage('Listado de documentos exportado correctamente.')
    } catch (error) {
      console.error('Error exportando listado de documentos:', error)
      setMessage(error.message || 'No se pudo exportar el listado de documentos.')
    }
  }

  const handleEditSubmit = (event) => {
    event.preventDefault()

    const updatedDocument = normalizeDocument({
      ...editingDocument,
      montoNeto: Number(editingDocument.montoNeto) || 0,
      iva: Number(editingDocument.iva) || 0,
      total: Number(editingDocument.total) || 0,
      tags: normalizeTags(editingDocument.tags),
      updatedAt: new Date().toISOString(),
    })

    const previousDocument = documents.find((document) => document.id === updatedDocument.id)

    setDocuments((currentDocuments) => upsertDocument(currentDocuments, updatedDocument))
    setQuotes((currentQuotes) => {
      const withoutPreviousQuote =
        previousDocument &&
          isQuoteDocument(previousDocument) &&
          (!isQuoteDocument(updatedDocument) ||
            previousDocument.numeroDocumento !== updatedDocument.numeroDocumento)
          ? deleteQuoteByDocument(currentQuotes, previousDocument)
          : currentQuotes

      return upsertQuoteFromDocument(withoutPreviousQuote, updatedDocument)
    })

    setEditingDocument(null)
    setMessage(`Documento ${updatedDocument.numeroDocumento} actualizado.`)
  }

  const openEdit = (document) => {
    setEditingDocument({
      ...document,
      tags: document.tags.join(', '),
    })
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Documentos</div>
            <div className="fs-3 fw-semibold">{documents.length}</div>
            <CProgress thin color="primary" value={documents.length > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Total comercial</div>
            <div className="fs-5 fw-semibold">{formatCurrency(documentSummary.totalAmount)}</div>
            <CProgress thin color="success" value={documents.length > 0 ? 80 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Activos</div>
            <div className="fs-3 fw-semibold">{documentSummary.activeCount}</div>
            <CProgress thin color="info" value={documents.length > 0 ? 65 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Borradores</div>
            <div className="fs-3 fw-semibold">{documentSummary.draftCount}</div>
            <CProgress thin color="warning" value={documents.length > 0 ? 45 : 0} />
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xl={5}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Documentos por estado</strong>{' '}
            <small>Control visual del flujo documental</small>
          </CCardHeader>
          <CCardBody>
            {documentsByStatus.length === 0 ? (
              <CAlert color="info" className="mb-0">
                Aún no hay estados documentales para graficar.
              </CAlert>
            ) : (
              <CChartDoughnut
                data={statusChartData}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={7}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Documentos por tipo</strong>{' '}
            <small>Cotizaciones, licitaciones, compras y otros</small>
          </CCardHeader>
          <CCardBody>
            {documentsByType.length === 0 ? (
              <CAlert color="info" className="mb-0">
                Aún no hay tipos de documentos para graficar.
              </CAlert>
            ) : (
              <CChartBar
                data={typeChartData}
                options={{
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Centro de documentos</strong>{' '}
              <small>Cotizaciones, licitaciones y documentos comerciales</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredDocuments.length} documentos</CBadge>
              <CButton
                color="success"
                size="sm"
                type="button"
                variant="outline"
                onClick={handleExportDocumentsList}
                disabled={filteredDocuments.length === 0}
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

            <CRow className="g-3 mb-4">
              <CCol xl={5} lg={12}>
                <CFormLabel htmlFor="documentSearch">Búsqueda inteligente</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>Buscar</CInputGroupText>
                  <CFormInput
                    id="documentSearch"
                    name="search"
                    placeholder="Buscar documento, cliente, licitación, monto, vendedor..."
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                </CInputGroup>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="tipoDocumento">Tipo</CFormLabel>
                <CFormSelect
                  id="tipoDocumento"
                  name="tipoDocumento"
                  value={filters.tipoDocumento}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={2} md={4}>
                <CFormLabel htmlFor="estado">Estado</CFormLabel>
                <CFormSelect
                  id="estado"
                  name="estado"
                  value={filters.estado}
                  onChange={handleFilterChange}
                >
                  <option value="">Todos</option>
                  {DOCUMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol xl={3} md={4}>
                <CFormLabel>Rango monto</CFormLabel>
                <CInputGroup>
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
                </CInputGroup>
              </CCol>

              <CCol xl={3} md={6}>
                <CFormLabel>Fecha desde / hasta</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    aria-label="Fecha desde"
                    name="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                  />
                  <CFormInput
                    aria-label="Fecha hasta"
                    name="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                  />
                </CInputGroup>
              </CCol>

              <CCol xl={2} md={4} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  type="button"
                  variant="outline"
                  onClick={() => setFilters(emptyFilters)}
                >
                  Limpiar filtros
                </CButton>
              </CCol>
            </CRow>

            {documents.length === 0 ? (
              <CAlert color="info">
                Aún no hay documentos guardados. Guarda una cotización desde Cotizador 5000 para
                verla en este centro documental.
              </CAlert>
            ) : filteredDocuments.length === 0 ? (
              <CAlert color="warning">
                No hay documentos que coincidan con la búsqueda actual.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell>N° documento</CTableHeaderCell>
                    <CTableHeaderCell>Fecha</CTableHeaderCell>
                    <CTableHeaderCell>Cliente</CTableHeaderCell>
                    <CTableHeaderCell>Empresa</CTableHeaderCell>
                    <CTableHeaderCell>Vendedor</CTableHeaderCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Tags</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredDocuments.map((document) => (
                    <CTableRow key={document.id}>
                      <CTableDataCell>{document.tipoDocumento}</CTableDataCell>
                      <CTableDataCell className="fw-semibold">
                        {document.numeroDocumento}
                      </CTableDataCell>
                      <CTableDataCell>{formatDate(document.fecha)}</CTableDataCell>
                      <CTableDataCell>{document.cliente}</CTableDataCell>
                      <CTableDataCell>{document.empresa}</CTableDataCell>
                      <CTableDataCell>{document.vendedor}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(document.total)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(document.estado)}>{document.estado}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell style={{ minWidth: '180px' }}>
                        {document.tags.map((tag) => (
                          <CBadge
                            color="secondary"
                            className="me-1 mb-1"
                            key={`${document.id}-${tag}`}
                          >
                            {tag}
                          </CBadge>
                        ))}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CButtonGroup size="sm" role="group" aria-label="Acciones de documento">
                          <CButton
                            color="primary"
                            variant="outline"
                            type="button"
                            onClick={() => setSelectedDocument(document)}
                          >
                            Ver
                          </CButton>

                          <CButton
                            color="secondary"
                            variant="outline"
                            type="button"
                            onClick={() => openEdit(document)}
                          >
                            Editar
                          </CButton>

                          <CButton
                            color="info"
                            variant="outline"
                            type="button"
                            onClick={() => handleDuplicate(document)}
                          >
                            Duplicar
                          </CButton>

                          <CButton
                            color="danger"
                            variant="outline"
                            type="button"
                            onClick={() => handleDelete(document)}
                          >
                            Eliminar
                          </CButton>

                          <CButton
                            color="dark"
                            variant="outline"
                            type="button"
                            disabled={exportingDocumentId === `${document.id}-pdf`}
                            onClick={() => handleDownloadPdf(document)}
                          >
                            {exportingDocumentId === `${document.id}-pdf` ? 'PDF...' : 'PDF'}
                          </CButton>

                          <CButton
                            color="success"
                            variant="outline"
                            type="button"
                            disabled={exportingDocumentId === `${document.id}-excel`}
                            onClick={() => handleDownloadExcel(document)}
                          >
                            {exportingDocumentId === `${document.id}-excel` ? 'Excel...' : 'Excel'}
                          </CButton>
                        </CButtonGroup>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        visible={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>Documento {selectedDocument?.numeroDocumento}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedDocument && (
            <>
              <CRow className="g-3 mb-3">
                <CCol md={4}>
                  <div className="text-body-secondary small">Tipo</div>
                  <div className="fw-semibold">{selectedDocument.tipoDocumento}</div>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Estado</div>
                  <CBadge color={getStatusColor(selectedDocument.estado)}>
                    {selectedDocument.estado}
                  </CBadge>
                </CCol>
                <CCol md={4}>
                  <div className="text-body-secondary small">Origen</div>
                  <div>{selectedDocument.origen}</div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Cliente / empresa</div>
                  <div>
                    {selectedDocument.cliente} - {selectedDocument.empresa}
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="text-body-secondary small">Vendedor</div>
                  <div>{selectedDocument.vendedor}</div>
                </CCol>
              </CRow>

              <CTable responsive bordered>
                <CTableBody>
                  <CTableRow>
                    <CTableHeaderCell>Neto</CTableHeaderCell>
                    <CTableDataCell>{formatCurrency(selectedDocument.montoNeto)}</CTableDataCell>
                    <CTableHeaderCell>IVA</CTableHeaderCell>
                    <CTableDataCell>{formatCurrency(selectedDocument.iva)}</CTableDataCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                    <CTableDataCell>{formatCurrency(selectedDocument.total)}</CTableDataCell>
                  </CTableRow>
                </CTableBody>
              </CTable>

              <div className="mb-3">
                <div className="text-body-secondary small">Observaciones</div>
                <div>{selectedDocument.observaciones || '-'}</div>
              </div>

              <CTable responsive hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Cantidad</CTableHeaderCell>
                    <CTableHeaderCell>Descripción</CTableHeaderCell>
                    <CTableHeaderCell>Unitario</CTableHeaderCell>
                    <CTableHeaderCell>Total</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {selectedDocument.items.map((item, index) => (
                    <CTableRow key={`${selectedDocument.id}-item-${index}`}>
                      <CTableDataCell>{item.quantity}</CTableDataCell>
                      <CTableDataCell>{item.description}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.unitValue)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.total)}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" type="button" onClick={() => setSelectedDocument(null)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={Boolean(editingDocument)} onClose={() => setEditingDocument(null)} size="lg">
        {editingDocument && (
          <CForm onSubmit={handleEditSubmit}>
            <CModalHeader>
              <CModalTitle>Editar documento</CModalTitle>
            </CModalHeader>
            <CModalBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="editTipoDocumento">Tipo</CFormLabel>
                  <CFormSelect
                    id="editTipoDocumento"
                    name="tipoDocumento"
                    value={editingDocument.tipoDocumento}
                    onChange={handleEditChange}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editNumeroDocumento">N° documento</CFormLabel>
                  <CFormInput
                    id="editNumeroDocumento"
                    name="numeroDocumento"
                    value={editingDocument.numeroDocumento}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editEstado">Estado</CFormLabel>
                  <CFormSelect
                    id="editEstado"
                    name="estado"
                    value={editingDocument.estado}
                    onChange={handleEditChange}
                  >
                    {DOCUMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editFecha">Fecha</CFormLabel>
                  <CFormInput
                    id="editFecha"
                    name="fecha"
                    value={editingDocument.fecha}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editCliente">Cliente</CFormLabel>
                  <CFormInput
                    id="editCliente"
                    name="cliente"
                    value={editingDocument.cliente}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editEmpresa">Empresa</CFormLabel>
                  <CFormInput
                    id="editEmpresa"
                    name="empresa"
                    value={editingDocument.empresa}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editVendedor">Vendedor</CFormLabel>
                  <CFormInput
                    id="editVendedor"
                    name="vendedor"
                    value={editingDocument.vendedor}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editTotal">Total</CFormLabel>
                  <CFormInput
                    id="editTotal"
                    name="total"
                    type="number"
                    min="0"
                    value={editingDocument.total}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol md={4}>
                  <CFormLabel htmlFor="editTags">Tags</CFormLabel>
                  <CFormInput
                    id="editTags"
                    name="tags"
                    value={editingDocument.tags}
                    onChange={handleEditChange}
                  />
                </CCol>

                <CCol xs={12}>
                  <CFormLabel htmlFor="editObservaciones">Observaciones</CFormLabel>
                  <CFormTextarea
                    id="editObservaciones"
                    name="observaciones"
                    rows={3}
                    value={editingDocument.observaciones}
                    onChange={handleEditChange}
                  />
                </CCol>
              </CRow>
            </CModalBody>

            <CModalFooter>
              <CButton
                color="secondary"
                type="button"
                variant="outline"
                onClick={() => setEditingDocument(null)}
              >
                Cancelar
              </CButton>
              <CButton color="primary" type="submit">
                Guardar cambios
              </CButton>
            </CModalFooter>
          </CForm>
        )}
      </CModal>
    </CRow>
  )
}

export default Documentos

