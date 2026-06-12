import React, { useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { mockClients } from '../../data/mockClients'
import { mockProducts } from '../../data/mockProducts'
import { mockQuotes } from '../../data/mockQuotes'
import {
  rubikCommercialSettings,
  rubikCompany as defaultRubikCompany,
} from '../../data/rubikCompany'
import { sellerProfiles } from '../../data/sellerProfiles'
import {
  createDocumentFromQuotePayload,
  createQuoteRecordFromPayload,
  normalizeQuoteRecord,
  upsertDocument,
  upsertQuoteRecord,
  useDocumentStorage,
} from '../../utils/documentStorage'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

const rubikCompany = defaultRubikCompany

const formatDateForQuote = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  const [year, month, day] = localDate.toISOString().slice(0, 10).split('-')

  return `${day}-${month}-${year}`
}

const formatDateForDocument = (date) => {
  if (!date) {
    return '-'
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    return date
  }

  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)

const normalizeClient = (client) => ({
  ...client,
  id: client.id || createLocalId('cli'),
  contact: client.contact || client.client || '',
  commune: client.commune || client.comuna || '',
  address: client.address || '',
})

const normalizeProduct = (product) => ({
  ...product,
  id: product.id || createLocalId('prd'),
  suggestedPrice: Number(product.suggestedPrice) || 0,
  technicalDescription: product.technicalDescription || '',
  unit: product.unit || '',
  status: product.status || 'Activo',
})

const normalizeCommercialSettings = (settings) => ({
  ...rubikCommercialSettings,
  ...settings,
  ivaRate: Number(settings?.ivaRate ?? rubikCommercialSettings.ivaRate) || 19,
})

const createQuoteItem = (id) => ({
  id: `item-${id}`,
  quantity: '1',
  description: '',
  unitValue: '',
  unit: '',
  observations: '',
})

const getNumberValue = (value) => Number(value) || 0

const getItemTotal = (item) => getNumberValue(item.quantity) * getNumberValue(item.unitValue)

const hasUnitValue = (value) => value !== '' && value !== null && value !== undefined

const isEmptyQuoteItem = (item) =>
  item.description.trim().length === 0 &&
  !hasUnitValue(item.unitValue) &&
  item.observations.trim().length === 0

const isValidQuoteItem = (item) =>
  getNumberValue(item.quantity) > 0 &&
  item.description.trim().length > 0 &&
  hasUnitValue(item.unitValue) &&
  getNumberValue(item.unitValue) >= 0

const cloneQuoteItem = (item) => ({
  ...item,
  quantity: getNumberValue(item.quantity),
  unitValue: getNumberValue(item.unitValue),
  total: getItemTotal(item),
})

const getQuoteAmounts = (quoteItems, ivaRate = 19) => {
  const net = quoteItems.reduce((total, item) => total + getItemTotal(item), 0)
  const iva = net * (getNumberValue(ivaRate) / 100)

  return {
    net,
    iva,
    total: net + iva,
  }
}

const NuevaCotizacion = () => {
  const nextItemId = useRef(2)
  const [clientData, setClientData] = useState({
    client: '',
    company: '',
    attention: '',
    rut: '',
    phone: '',
    email: '',
    comuna: '',
    address: '',
  })
  const [quoteData, setQuoteData] = useState({
    quoteNumber: '8103',
    date: formatDateForQuote(new Date()),
    subject: '',
    condition: 'Contado',
  })
  const [storedClients] = useLocalStorageState(
    STORAGE_KEYS.clients,
    mockClients.map(normalizeClient),
  )
  const [storedProducts] = useLocalStorageState(
    STORAGE_KEYS.products,
    mockProducts.map(normalizeProduct),
  )
  const [storedQuotes, setStoredQuotes] = useLocalStorageState(
    STORAGE_KEYS.quotes,
    mockQuotes.map(normalizeQuoteRecord),
  )
  const [, setStoredDocuments] = useDocumentStorage()
  const [commercialSettings] = useLocalStorageState(
    STORAGE_KEYS.commercialSettings,
    normalizeCommercialSettings(rubikCommercialSettings),
  )
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedSellerId, setSelectedSellerId] = useState(sellerProfiles[0].id)
  const [items, setItems] = useState(() => [createQuoteItem(1)])
  const [generatedQuote, setGeneratedQuote] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const selectedSeller = useMemo(
    () => sellerProfiles.find((seller) => seller.id === selectedSellerId) || sellerProfiles[0],
    [selectedSellerId],
  )
  const clients = useMemo(() => storedClients.map(normalizeClient), [storedClients])
  const products = useMemo(() => storedProducts.map(normalizeProduct), [storedProducts])
  const activeProducts = useMemo(
    () => products.filter((product) => product.status !== 'Inactivo'),
    [products],
  )
  const ivaRate = normalizeCommercialSettings(commercialSettings).ivaRate
  const currentValidItems = useMemo(
    () => items.filter(isValidQuoteItem).map(cloneQuoteItem),
    [items],
  )
  const currentAmounts = useMemo(
    () => getQuoteAmounts(currentValidItems, ivaRate),
    [currentValidItems, ivaRate],
  )

  const buildQuotePayload = () => {
    const quoteItems = items.filter((item) => !isEmptyQuoteItem(item))

    if (quoteItems.length === 0) {
      return {
        error: 'Agrega al menos un ítem con cantidad, descripción y valor unitario.',
      }
    }

    const invalidItem = quoteItems.find((item) => !isValidQuoteItem(item))

    if (invalidItem) {
      return {
        error:
          'Revisa los ítems: cada uno debe tener cantidad mayor a 0, descripción y valor unitario mayor o igual a 0.',
      }
    }

    const normalizedItems = quoteItems.map(cloneQuoteItem)
    const amounts = getQuoteAmounts(normalizedItems, ivaRate)

    return {
      payload: {
        company: { ...rubikCompany },
        seller: { ...selectedSeller },
        client: { ...clientData, id: selectedClientId },
        quote: { ...quoteData, ivaRate },
        quoteItems: normalizedItems,
        amounts,
      },
    }
  }

  const handleClientChange = (event) => {
    const { name, value } = event.target
    setSelectedClientId('')
    setClientData((currentClientData) => ({
      ...currentClientData,
      [name]: value,
    }))
  }

  const handleClientSelect = (event) => {
    const clientId = event.target.value
    setSelectedClientId(clientId)

    if (!clientId) {
      return
    }

    const selectedClient = clients.find((client) => client.id === clientId)

    if (!selectedClient) {
      return
    }

    setClientData({
      client: selectedClient.contact,
      company: selectedClient.company,
      attention: selectedClient.contact,
      rut: selectedClient.rut,
      phone: selectedClient.phone,
      email: selectedClient.email,
      comuna: selectedClient.commune,
      address: selectedClient.address,
    })
  }

  const handleQuoteChange = (event) => {
    const { name, value } = event.target
    setQuoteData((currentQuoteData) => ({
      ...currentQuoteData,
      [name]: value,
    }))
  }

  const handleItemChange = (itemId, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    )
  }

  const handleProductSelect = (event) => {
    const productId = event.target.value
    setSelectedProductId(productId)

    if (!productId) {
      return
    }

    const selectedProduct = activeProducts.find((product) => product.id === productId)

    if (!selectedProduct) {
      return
    }

    setItems((currentItems) => {
      const emptyItemIndex = currentItems.findIndex(isEmptyQuoteItem)
      const productItem = {
        id: emptyItemIndex >= 0 ? currentItems[emptyItemIndex].id : `item-${nextItemId.current}`,
        quantity: '1',
        description: selectedProduct.technicalDescription || selectedProduct.name,
        unitValue: String(selectedProduct.suggestedPrice),
        unit: selectedProduct.unit,
        observations: selectedProduct.unit ? `Unidad: ${selectedProduct.unit}` : '',
      }

      if (emptyItemIndex >= 0) {
        return currentItems.map((item, index) => (index === emptyItemIndex ? productItem : item))
      }

      nextItemId.current += 1
      return [...currentItems, productItem]
    })

    setSelectedProductId('')
  }

  const addItem = () => {
    setItems((currentItems) => {
      const item = createQuoteItem(nextItemId.current)
      nextItemId.current += 1
      return [...currentItems, item]
    })
  }

  const removeItem = (itemId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId))
  }

  const handleSaveQuote = () => {
    const { payload, error } = buildQuotePayload()

    if (error) {
      setValidationError(error)
      setSaveMessage('')
      return
    }

    const quoteAlreadyExists = storedQuotes
      .map(normalizeQuoteRecord)
      .some((quote) => quote.quoteNumber === String(payload.quote.quoteNumber))

    const savedQuote = createQuoteRecordFromPayload(payload, { status: 'Borrador' })

    setStoredQuotes((currentQuotes) => upsertQuoteRecord(currentQuotes, savedQuote))
    const savedDocument = createDocumentFromQuotePayload(payload, { estado: savedQuote.status })
    setStoredDocuments((currentDocuments) => upsertDocument(currentDocuments, savedDocument))
    setGeneratedQuote(payload)
    setValidationError('')
    setSaveMessage(
      `Cotización ${savedQuote.quoteNumber} ${
        quoteAlreadyExists ? 'actualizada' : 'guardada'
      } como Borrador y sincronizada en Documentos.`,
    )
  }

  const handleGenerateQuote = () => {
    const { payload, error } = buildQuotePayload()

    if (error) {
      setGeneratedQuote(null)
      setValidationError(error)
      return
    }

    setValidationError('')
    setSaveMessage('')
    setGeneratedQuote(payload)
  }

  const handlePrintQuote = () => {
    window.print()
  }

  const handleExportExcel = async () => {
    const { payload, error } = buildQuotePayload()

    if (error) {
      setValidationError(error)
      return
    }

    setValidationError('')
    setGeneratedQuote(payload)
    setIsExportingExcel(true)

    try {
      const { exportQuoteToExcel } = await import('../../utils/exportQuoteToExcel')
      await exportQuoteToExcel(payload)
    } catch (error) {
      console.error('Error exporting quote to Excel:', error)
      setValidationError(error.message || 'No se pudo exportar la cotización a Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    const { payload, error } = buildQuotePayload()

    if (error) {
      setValidationError(error)
      alert(error)
      return
    }

    setValidationError('')
    setGeneratedQuote(payload)
    setIsExportingPdf(true)

    try {
      const { exportQuoteToPdf } = await import('../../utils/exportQuoteToPdf')
      await exportQuoteToPdf(payload)
    } catch (error) {
      console.error('Error exporting quote to PDF:', error)
      const message = error.message || 'No se pudo exportar la cotizacion a PDF.'
      setValidationError(message)
      alert(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <>
      <style>
        {`
          .quote-print-area,
          .quote-print-document {
            overflow: visible;
          }

          .quote-document-table {
            width: 100%;
            border-collapse: collapse;
          }

          .quote-document-table th,
          .quote-document-table td {
            border: 1px solid var(--cui-border-color);
            padding: 0.65rem;
            vertical-align: top;
          }

          .quote-description-cell {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          .quote-totals {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @media print {
            @page {
              margin: 14mm;
            }

            body {
              background: #fff !important;
            }

            html,
            body,
            #root,
            .wrapper,
            .body,
            .container-lg,
            .container-fluid {
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            .sidebar,
            .header,
            .footer,
            .breadcrumb,
            .quote-form-shell,
            .quote-form-shell *,
            .no-print,
            .no-print *,
            button,
            input,
            textarea,
            select {
              display: none !important;
              visibility: hidden !important;
            }

            .quote-print-area {
              display: block !important;
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            .quote-print-document {
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 0;
              border: 0 !important;
              box-shadow: none !important;
              overflow: visible !important;
            }

            .quote-print-document .card-body {
              padding: 0 !important;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            thead {
              display: table-header-group;
            }

            tfoot {
              display: table-footer-group;
            }

            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .quote-document-table th,
            .quote-document-table td {
              border: 1px solid #999 !important;
              color: #000 !important;
            }

            .quote-totals {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}
      </style>

      <CForm
        className="quote-form-shell"
        onSubmit={(event) => {
          event.preventDefault()
          handleGenerateQuote()
        }}
      >
        <CRow>
          <CCol xs={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Cotizador 5000</strong> <small>Nueva cotización</small>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={4}>
                    <CFormLabel htmlFor="rubikAddress">Dirección</CFormLabel>
                    <CFormInput id="rubikAddress" value={rubikCompany.address} readOnly />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="rubikPhone">Teléfono</CFormLabel>
                    <CFormInput id="rubikPhone" value={rubikCompany.phone} readOnly />
                  </CCol>
                  <CCol md={4}>
                    <CFormLabel htmlFor="rubikEmail">Email</CFormLabel>
                    <CFormInput id="rubikEmail" value={rubikCompany.email} readOnly />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="rubikRut">RUT Rubik</CFormLabel>
                    <CFormInput id="rubikRut" value={rubikCompany.rut} readOnly />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="rubikSeller">Vendedor</CFormLabel>
                    <CFormSelect
                      id="rubikSeller"
                      value={selectedSellerId}
                      onChange={(event) => setSelectedSellerId(event.target.value)}
                    >
                      {sellerProfiles.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="sellerEmail">Email vendedor</CFormLabel>
                    <CFormInput id="sellerEmail" value={selectedSeller.email} readOnly />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol lg={8}>
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Datos cliente</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12}>
                    <CFormLabel htmlFor="storedClient">Cliente guardado</CFormLabel>
                    <CFormSelect
                      id="storedClient"
                      value={selectedClientId}
                      onChange={handleClientSelect}
                    >
                      <option value="">Ingresar cliente manualmente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.contact} - {client.company}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="client">Cliente</CFormLabel>
                    <CFormInput
                      id="client"
                      name="client"
                      value={clientData.client}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="company">Empresa</CFormLabel>
                    <CFormInput
                      id="company"
                      name="company"
                      value={clientData.company}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="attention">Atención</CFormLabel>
                    <CFormInput
                      id="attention"
                      name="attention"
                      value={clientData.attention}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="clientRut">RUT Cliente</CFormLabel>
                    <CFormInput
                      id="clientRut"
                      name="rut"
                      value={clientData.rut}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="clientPhone">Teléfono Cliente</CFormLabel>
                    <CFormInput
                      id="clientPhone"
                      name="phone"
                      value={clientData.phone}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="clientEmail">Email Cliente</CFormLabel>
                    <CFormInput
                      id="clientEmail"
                      name="email"
                      type="email"
                      value={clientData.email}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="comuna">Comuna</CFormLabel>
                    <CFormInput
                      id="comuna"
                      name="comuna"
                      value={clientData.comuna}
                      onChange={handleClientChange}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel htmlFor="clientAddress">Dirección Cliente</CFormLabel>
                    <CFormInput
                      id="clientAddress"
                      name="address"
                      value={clientData.address}
                      onChange={handleClientChange}
                    />
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>

            <CCard className="mb-4">
              <CCardHeader>
                <strong>Datos cotización</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol md={3}>
                    <CFormLabel htmlFor="quoteNumber">N° Cotización</CFormLabel>
                    <CFormInput
                      id="quoteNumber"
                      name="quoteNumber"
                      type="number"
                      min="8103"
                      value={quoteData.quoteNumber}
                      onChange={handleQuoteChange}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="quoteDate">Fecha</CFormLabel>
                    <CFormInput id="quoteDate" name="date" value={quoteData.date} readOnly />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="subject">Tema</CFormLabel>
                    <CFormInput
                      id="subject"
                      name="subject"
                      value={quoteData.subject}
                      onChange={handleQuoteChange}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormLabel htmlFor="condition">Condición</CFormLabel>
                    <CFormSelect
                      id="condition"
                      name="condition"
                      value={quoteData.condition}
                      onChange={handleQuoteChange}
                    >
                      <option value="Contado">Contado</option>
                      <option value="50% anticipo / 50% contra entrega">
                        50% anticipo / 50% contra entrega
                      </option>
                      <option value="Crédito 30 días">Crédito 30 días</option>
                    </CFormSelect>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol lg={4}>
            <CCard className="mb-4">
              <CCardHeader>
                <strong>Resumen</strong>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex justify-content-between mb-2">
                  <span>Ítems ingresados</span>
                  <strong>{items.length}</strong>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span>Neto actual</span>
                  <strong>{formatCurrency(currentAmounts.net)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span>IVA {ivaRate}%</span>
                  <strong>{formatCurrency(currentAmounts.iva)}</strong>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span>Total actual</span>
                  <strong>{formatCurrency(currentAmounts.total)}</strong>
                </div>
                {validationError && <CAlert color="danger">{validationError}</CAlert>}
                {saveMessage && (
                  <CAlert color="success" className="py-2">
                    {saveMessage}
                  </CAlert>
                )}
                <CButton color="primary" className="w-100 mb-2" type="submit">
                  Generar cotización
                </CButton>
                <CButton
                  color="secondary"
                  className="w-100 mb-2"
                  type="button"
                  variant="outline"
                  onClick={handleSaveQuote}
                >
                  Guardar cotización
                </CButton>
                <CButton
                  color="success"
                  className="w-100 mb-2"
                  type="button"
                  variant="outline"
                  disabled={isExportingExcel}
                  onClick={handleExportExcel}
                >
                  {isExportingExcel ? 'Exportando...' : 'Exportar Excel'}
                </CButton>
                <CButton
                  color="danger"
                  className="w-100"
                  type="button"
                  variant="outline"
                  disabled={isExportingPdf}
                  onClick={handleExportPdf}
                >
                  {isExportingPdf ? 'Exportando...' : 'Exportar PDF'}
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard className="mb-4">
              <CCardHeader className="d-flex align-items-center justify-content-between gap-3">
                <strong>Ítems</strong>
                <CButton color="primary" size="sm" type="button" onClick={addItem}>
                  Agregar ítem
                </CButton>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3 mb-3">
                  <CCol md={6}>
                    <CFormLabel htmlFor="productServiceSelector">
                      Producto / servicio guardado
                    </CFormLabel>
                    <CFormSelect
                      id="productServiceSelector"
                      value={selectedProductId}
                      onChange={handleProductSelect}
                    >
                      <option value="">Agregar ítem manualmente</option>
                      {activeProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.suggestedPrice)}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={6} className="d-flex align-items-end">
                    <CBadge color="info" className="px-3 py-2">
                      IVA configurado: {ivaRate}%
                    </CBadge>
                  </CCol>
                </CRow>
                <CTable responsive align="middle" hover>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell scope="col">Cantidad</CTableHeaderCell>
                      <CTableHeaderCell scope="col">
                        Descripción técnica del producto / servicio
                      </CTableHeaderCell>
                      <CTableHeaderCell scope="col">Valor unitario</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Valor total</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Observaciones</CTableHeaderCell>
                      <CTableHeaderCell scope="col" className="text-end">
                        Acción
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {items.map((item) => (
                      <CTableRow key={item.id}>
                        <CTableDataCell style={{ minWidth: '110px' }}>
                          <CFormInput
                            aria-label="Cantidad"
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              handleItemChange(item.id, 'quantity', event.target.value)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '320px' }}>
                          <CFormTextarea
                            aria-label="Descripción técnica del producto o servicio"
                            rows={3}
                            value={item.description}
                            onChange={(event) =>
                              handleItemChange(item.id, 'description', event.target.value)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '150px' }}>
                          <CFormInput
                            aria-label="Valor unitario"
                            type="number"
                            min="0"
                            step="1"
                            value={item.unitValue}
                            onChange={(event) =>
                              handleItemChange(item.id, 'unitValue', event.target.value)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold" style={{ minWidth: '140px' }}>
                          {formatCurrency(getItemTotal(item))}
                        </CTableDataCell>
                        <CTableDataCell style={{ minWidth: '240px' }}>
                          <CFormTextarea
                            aria-label="Observaciones"
                            rows={3}
                            value={item.observations}
                            onChange={(event) =>
                              handleItemChange(item.id, 'observations', event.target.value)
                            }
                          />
                        </CTableDataCell>
                        <CTableDataCell className="text-end" style={{ minWidth: '110px' }}>
                          <CButton
                            color="danger"
                            size="sm"
                            type="button"
                            variant="outline"
                            disabled={items.length === 1}
                            onClick={() => removeItem(item.id)}
                          >
                            Eliminar
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                  <CTableFoot>
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-end fw-semibold">
                        Neto
                      </CTableDataCell>
                      <CTableDataCell className="fw-bold">
                        {formatCurrency(currentAmounts.net)}
                      </CTableDataCell>
                      <CTableDataCell colSpan={2}></CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-end fw-semibold">
                        IVA {ivaRate}%
                      </CTableDataCell>
                      <CTableDataCell className="fw-bold">
                        {formatCurrency(currentAmounts.iva)}
                      </CTableDataCell>
                      <CTableDataCell colSpan={2}></CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-end fw-semibold">
                        Total
                      </CTableDataCell>
                      <CTableDataCell className="fw-bold">
                        {formatCurrency(currentAmounts.total)}
                      </CTableDataCell>
                      <CTableDataCell colSpan={2}></CTableDataCell>
                    </CTableRow>
                  </CTableFoot>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CForm>

      {generatedQuote && (
        <div className="quote-print-area">
          <CCard className="mb-4 quote-print-document">
            <CCardHeader className="d-flex align-items-center justify-content-between no-print">
              <strong>Vista previa imprimible</strong>
              <CButton color="primary" type="button" onClick={handlePrintQuote}>
                Imprimir cotización
              </CButton>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex justify-content-between gap-4 border-bottom pb-3 mb-4">
                <div>
                  <h2 className="h4 mb-1">Cotización #{generatedQuote.quote.quoteNumber}</h2>
                  <div className="text-body-secondary">
                    Fecha: {formatDateForDocument(generatedQuote.quote.date)}
                  </div>
                </div>
                <div className="text-end">
                  <h1 className="h5 mb-1">{generatedQuote.company.businessName}</h1>
                  <div>RUT: {generatedQuote.company.rut}</div>
                  <div>{generatedQuote.company.email}</div>
                  <div>{generatedQuote.company.phone}</div>
                </div>
              </div>
              <CRow className="g-4 mb-4">
                <CCol md={6}>
                  <h3 className="h6">Datos Rubik</h3>
                  <div>Dirección: {generatedQuote.company.address}</div>
                  <div>Teléfono: {generatedQuote.company.phone}</div>
                  <div>Email: {generatedQuote.company.email}</div>
                  <div>RUT Rubik: {generatedQuote.company.rut}</div>
                  <div>Vendedor: {generatedQuote.seller.name}</div>
                  <div>Email vendedor: {generatedQuote.seller.email}</div>
                </CCol>
                <CCol md={6}>
                  <h3 className="h6">Datos cliente</h3>
                  <div>Cliente: {generatedQuote.client.client || '-'}</div>
                  <div>Empresa: {generatedQuote.client.company || '-'}</div>
                  <div>Atención: {generatedQuote.client.attention || '-'}</div>
                  <div>RUT Cliente: {generatedQuote.client.rut || '-'}</div>
                  <div>Teléfono Cliente: {generatedQuote.client.phone || '-'}</div>
                  <div>Email Cliente: {generatedQuote.client.email || '-'}</div>
                  <div>Comuna: {generatedQuote.client.comuna || '-'}</div>
                  <div>Dirección: {generatedQuote.client.address || '-'}</div>
                </CCol>
              </CRow>
              <div className="mb-4">
                <h3 className="h6">Datos cotización</h3>
                <div>Tema: {generatedQuote.quote.subject || '-'}</div>
                <div>Condición: {generatedQuote.quote.condition || '-'}</div>
              </div>
              <CTable className="quote-document-table">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">Cantidad</CTableHeaderCell>
                    <CTableHeaderCell scope="col">
                      Descripción técnica del producto / servicio
                    </CTableHeaderCell>
                    <CTableHeaderCell scope="col">Valor unitario</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Valor total</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Observaciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {generatedQuote.quoteItems.map((item) => (
                    <CTableRow key={`print-${item.id}`}>
                      <CTableDataCell>{item.quantity}</CTableDataCell>
                      <CTableDataCell className="quote-description-cell">
                        {item.description}
                      </CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.unitValue)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(item.total)}</CTableDataCell>
                      <CTableDataCell className="quote-description-cell">
                        {item.observations || '-'}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
              <div className="quote-totals d-flex justify-content-end mt-4">
                <div className="border-top pt-3" style={{ minWidth: '260px' }}>
                  <div className="d-flex justify-content-between gap-4 mb-2">
                    <span>Neto</span>
                    <strong>{formatCurrency(generatedQuote.amounts.net)}</strong>
                  </div>
                  <div className="d-flex justify-content-between gap-4 mb-2">
                    <span>IVA {generatedQuote.quote.ivaRate || 19}%</span>
                    <strong>{formatCurrency(generatedQuote.amounts.iva)}</strong>
                  </div>
                  <div className="d-flex justify-content-between gap-4">
                    <span>Total</span>
                    <strong>{formatCurrency(generatedQuote.amounts.total)}</strong>
                  </div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </div>
      )}
    </>
  )
}

export default NuevaCotizacion
