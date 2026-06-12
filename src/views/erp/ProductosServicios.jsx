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
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { mockProducts } from '../../data/mockProducts'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'
import { exportListToExcel } from '../../utils/exportListToExcel'

const emptyProduct = {
  name: '',
  category: '',
  unit: '',
  technicalDescription: '',
  baseCost: '',
  suggestedPrice: '',
  material: '',
  status: 'Activo',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`

const getNumberValue = (value) => Number(value) || 0

const normalizeProduct = (product) => ({
  ...emptyProduct,
  ...product,
  id: product.id || createLocalId('prd'),
  baseCost: getNumberValue(product.baseCost),
  suggestedPrice: getNumberValue(product.suggestedPrice),
  status: product.status || 'Activo',
})

const hasValue = (value) => String(value || '').trim().length > 0

const matchesSearch = (product, query) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    product.name,
    product.category,
    product.unit,
    product.technicalDescription,
    product.material,
    product.status,
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const getProductMarginPercent = (product) => {
  const baseCost = getNumberValue(product.baseCost)
  const suggestedPrice = getNumberValue(product.suggestedPrice)

  if (baseCost <= 0 || suggestedPrice <= 0 || suggestedPrice <= baseCost) {
    return 0
  }

  return Math.round(((suggestedPrice - baseCost) / suggestedPrice) * 100)
}

const getSuggestedProfit = (product) => {
  const baseCost = getNumberValue(product.baseCost)
  const suggestedPrice = getNumberValue(product.suggestedPrice)

  return Math.max(suggestedPrice - baseCost, 0)
}

const getCompletionPercent = (product) => {
  const fields = [
    product.name,
    product.category,
    product.unit,
    product.technicalDescription,
    product.baseCost,
    product.suggestedPrice,
    product.material,
    product.status,
  ]

  const completedFields = fields.filter((field) => {
    if (typeof field === 'number') {
      return field > 0
    }

    return hasValue(field)
  }).length

  return Math.round((completedFields / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const getStatusColor = (status) => {
  if (status === 'Activo') return 'success'
  if (status === 'En evaluación') return 'warning'
  return 'secondary'
}

const ProductosServicios = () => {
  const [products, setProducts] = useLocalStorageState(
    STORAGE_KEYS.products,
    mockProducts.map(normalizeProduct),
  )
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyProduct)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const normalizedProducts = useMemo(() => products.map(normalizeProduct), [products])

  const filteredProducts = useMemo(
    () => normalizedProducts.filter((product) => matchesSearch(product, search)),
    [normalizedProducts, search],
  )

  const productSummary = useMemo(() => {
    const total = normalizedProducts.length
    const active = normalizedProducts.filter((product) => product.status === 'Activo').length
    const inactive = normalizedProducts.filter((product) => product.status === 'Inactivo').length
    const inEvaluation = normalizedProducts.filter(
      (product) => product.status === 'En evaluación',
    ).length
    const withBaseCost = normalizedProducts.filter((product) => getNumberValue(product.baseCost) > 0)
      .length
    const withSuggestedPrice = normalizedProducts.filter(
      (product) => getNumberValue(product.suggestedPrice) > 0,
    ).length
    const withMaterial = normalizedProducts.filter((product) => hasValue(product.material)).length
    const totalBaseCost = normalizedProducts.reduce(
      (totalValue, product) => totalValue + getNumberValue(product.baseCost),
      0,
    )
    const totalSuggestedPrice = normalizedProducts.reduce(
      (totalValue, product) => totalValue + getNumberValue(product.suggestedPrice),
      0,
    )
    const totalSuggestedProfit = normalizedProducts.reduce(
      (totalValue, product) => totalValue + getSuggestedProfit(product),
      0,
    )
    const productsWithMargin = normalizedProducts.filter(
      (product) =>
        getNumberValue(product.baseCost) > 0 &&
        getNumberValue(product.suggestedPrice) > getNumberValue(product.baseCost),
    )
    const averageMargin =
      productsWithMargin.length > 0
        ? Math.round(
            productsWithMargin.reduce(
              (totalValue, product) => totalValue + getProductMarginPercent(product),
              0,
            ) / productsWithMargin.length,
          )
        : 0

    return {
      total,
      active,
      inactive,
      inEvaluation,
      withBaseCost,
      withSuggestedPrice,
      withMaterial,
      totalBaseCost,
      totalSuggestedPrice,
      totalSuggestedProfit,
      averageMargin,
      filtered: filteredProducts.length,
      activePercent: total > 0 ? Math.round((active / total) * 100) : 0,
      priceCoveragePercent: total > 0 ? Math.round((withSuggestedPrice / total) * 100) : 0,
      costCoveragePercent: total > 0 ? Math.round((withBaseCost / total) * 100) : 0,
    }
  }, [normalizedProducts, filteredProducts])

  const openCreateModal = () => {
    setEditingId(null)
    setFormData(emptyProduct)
    setError('')
    setVisible(true)
  }

  const openEditModal = (product) => {
    setEditingId(product.id)
    setFormData(normalizeProduct(product))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyProduct)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.category.trim() || !formData.unit.trim()) {
      setError('Ingresa nombre, categoría y unidad.')
      return
    }

    const payload = normalizeProduct({
      ...formData,
      id: editingId || createLocalId('prd'),
    })

    setProducts((currentProducts) => {
      if (editingId) {
        return currentProducts.map((product) => (product.id === editingId ? payload : product))
      }

      return [...currentProducts, payload]
    })

    setMessage(
      editingId
        ? 'Producto/servicio actualizado localmente.'
        : 'Producto/servicio creado localmente.',
    )
    closeModal()
  }

  const handleDelete = (productId) => {
    setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId))
    setMessage('Producto/servicio eliminado localmente.')
  }

  const handleToggleStatus = (product) => {
    const nextStatus = product.status === 'Activo' ? 'Inactivo' : 'Activo'

    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id ? { ...currentProduct, status: nextStatus } : currentProduct,
      ),
    )

    setMessage(
      `Producto/servicio ${nextStatus === 'Activo' ? 'activado' : 'inactivado'} localmente.`,
    )
  }

  const handleExportProductsList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Productos-Servicios-ERP-Rubik',
        sheetName: 'Productos Servicios',
        title: 'Listado de productos y servicios ERP Rubik',
        columns: [
          { header: 'Nombre', key: 'name', width: 30 },
          { header: 'Categoría', key: 'category', width: 22 },
          { header: 'Unidad', key: 'unit', width: 14 },
          { header: 'Descripción técnica', key: 'technicalDescription', width: 44 },
          {
            header: 'Costo base',
            key: 'baseCost',
            width: 16,
            numFmt: '"$"#,##0',
          },
          {
            header: 'Precio sugerido',
            key: 'suggestedPrice',
            width: 18,
            numFmt: '"$"#,##0',
          },
          {
            header: 'Utilidad sugerida',
            key: 'suggestedProfit',
            width: 18,
            numFmt: '"$"#,##0',
            value: (product) => getSuggestedProfit(product),
          },
          {
            header: 'Margen sugerido',
            key: 'marginPercent',
            width: 18,
            value: (product) => `${getProductMarginPercent(product)}%`,
          },
          { header: 'Material asociado', key: 'material', width: 28 },
          { header: 'Estado', key: 'status', width: 16 },
          {
            header: 'Completitud ficha',
            key: 'completion',
            width: 18,
            value: (product) => `${getCompletionPercent(product)}%`,
          },
        ],
        rows: filteredProducts,
        summary: [
          { label: 'Productos/servicios exportados', value: filteredProducts.length },
          { label: 'Total productos/servicios guardados', value: productSummary.total },
          { label: 'Activos', value: productSummary.active },
          { label: 'Inactivos', value: productSummary.inactive },
          { label: 'En evaluación', value: productSummary.inEvaluation },
          { label: 'Con costo base', value: productSummary.withBaseCost },
          { label: 'Con precio sugerido', value: productSummary.withSuggestedPrice },
          { label: 'Con material asociado', value: productSummary.withMaterial },
          { label: 'Costo base total', value: formatCurrency(productSummary.totalBaseCost) },
          { label: 'Precio sugerido total', value: formatCurrency(productSummary.totalSuggestedPrice) },
          { label: 'Utilidad sugerida total', value: formatCurrency(productSummary.totalSuggestedProfit) },
          { label: 'Margen promedio', value: formatPercent(productSummary.averageMargin) },
        ],
      })

      setMessage('Listado de productos/servicios exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando listado de productos/servicios:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de productos/servicios.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Productos / servicios</div>
            <div className="fs-3 fw-semibold">{productSummary.total}</div>
            <CProgress thin color="primary" value={productSummary.total > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Activos</div>
            <div className="fs-3 fw-semibold">{productSummary.active}</div>
            <div className="small text-body-secondary">{productSummary.activePercent}% del catálogo</div>
            <CProgress thin color="success" value={productSummary.activePercent} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Precio sugerido</div>
            <div className="fs-3 fw-semibold">{productSummary.priceCoveragePercent}%</div>
            <div className="small text-body-secondary">cobertura de precios</div>
            <CProgress
              thin
              color={productSummary.priceCoveragePercent >= 70 ? 'success' : 'warning'}
              value={productSummary.priceCoveragePercent}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Utilidad sugerida total</div>
            <div className="fs-5 fw-semibold">{formatCurrency(productSummary.totalSuggestedProfit)}</div>
            <div className="small text-body-secondary">
              margen promedio {formatPercent(productSummary.averageMargin)}
            </div>
            <CProgress
              thin
              color={productSummary.averageMargin >= 25 ? 'success' : 'warning'}
              value={Math.min(productSummary.averageMargin, 100)}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Productos / Servicios</strong> <small>Catálogo comercial local</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredProducts.length} productos/servicios</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportProductsList}
                disabled={filteredProducts.length === 0}
              >
                Exportar listado Excel
              </CButton>
              <CButton color="primary" type="button" onClick={openCreateModal}>
                Nuevo producto / servicio
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            <CRow className="mb-3 g-3">
              <CCol lg={5}>
                <CFormInput
                  placeholder="Buscar por nombre, categoría, unidad, material, estado o descripción"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>

              <CCol lg={7} className="d-flex align-items-center gap-2 flex-wrap">
                <CBadge color="success">Activos: {productSummary.active}</CBadge>
                <CBadge color="secondary">Inactivos: {productSummary.inactive}</CBadge>
                <CBadge color="warning">En evaluación: {productSummary.inEvaluation}</CBadge>
                <CBadge color="info">Con costo: {productSummary.withBaseCost}</CBadge>
                <CBadge color="primary">Con precio: {productSummary.withSuggestedPrice}</CBadge>
              </CCol>
            </CRow>

            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Categoría</CTableHeaderCell>
                  <CTableHeaderCell>Unidad</CTableHeaderCell>
                  <CTableHeaderCell>Descripción técnica</CTableHeaderCell>
                  <CTableHeaderCell>Costo base</CTableHeaderCell>
                  <CTableHeaderCell>Precio sugerido</CTableHeaderCell>
                  <CTableHeaderCell>Margen</CTableHeaderCell>
                  <CTableHeaderCell>Material asociado</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Ficha</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredProducts.map((product) => {
                  const completionPercent = getCompletionPercent(product)
                  const marginPercent = getProductMarginPercent(product)

                  return (
                    <CTableRow key={product.id}>
                      <CTableDataCell className="fw-semibold">{product.name}</CTableDataCell>
                      <CTableDataCell>{product.category}</CTableDataCell>
                      <CTableDataCell>{product.unit}</CTableDataCell>
                      <CTableDataCell style={{ minWidth: '260px' }}>
                        {product.technicalDescription}
                      </CTableDataCell>
                      <CTableDataCell>{formatCurrency(product.baseCost)}</CTableDataCell>
                      <CTableDataCell>{formatCurrency(product.suggestedPrice)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={marginPercent >= 25 ? 'success' : 'warning'}>
                          {marginPercent}%
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{product.material}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(product.status)}>{product.status}</CBadge>
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
                        <CButtonGroup size="sm" role="group" aria-label="Acciones de producto">
                          <CButton
                            color="primary"
                            variant="outline"
                            type="button"
                            onClick={() => openEditModal(product)}
                          >
                            Editar
                          </CButton>
                          <CButton
                            color="secondary"
                            variant="outline"
                            type="button"
                            onClick={() => handleToggleStatus(product)}
                          >
                            {product.status === 'Activo' ? 'Inactivar' : 'Activar'}
                          </CButton>
                          <CButton
                            color="danger"
                            variant="outline"
                            type="button"
                            onClick={() => handleDelete(product.id)}
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
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="lg">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader>
            <CModalTitle>
              {editingId ? 'Editar producto / servicio' : 'Nuevo producto / servicio'}
            </CModalTitle>
          </CModalHeader>

          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="name">Nombre</CFormLabel>
                <CFormInput id="name" name="name" value={formData.name} onChange={handleChange} />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="category">Categoría</CFormLabel>
                <CFormInput
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="unit">Unidad</CFormLabel>
                <CFormInput id="unit" name="unit" value={formData.unit} onChange={handleChange} />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="baseCost">Costo base</CFormLabel>
                <CFormInput
                  id="baseCost"
                  name="baseCost"
                  type="number"
                  min="0"
                  value={formData.baseCost}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="suggestedPrice">Precio sugerido</CFormLabel>
                <CFormInput
                  id="suggestedPrice"
                  name="suggestedPrice"
                  type="number"
                  min="0"
                  value={formData.suggestedPrice}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={8}>
                <CFormLabel htmlFor="material">Material asociado</CFormLabel>
                <CFormInput
                  id="material"
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="status">Estado</CFormLabel>
                <CFormSelect
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="En evaluación">En evaluación</option>
                </CFormSelect>
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="technicalDescription">Descripción técnica</CFormLabel>
                <CFormTextarea
                  id="technicalDescription"
                  name="technicalDescription"
                  rows={3}
                  value={formData.technicalDescription}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CModalBody>

          <CModalFooter>
            <CButton color="secondary" type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit">
              Guardar producto / servicio
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default ProductosServicios
