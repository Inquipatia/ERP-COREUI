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
import { mockProducts } from '../../data/mockProducts'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

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

const getNumberValue = (value) => Number(value) || 0

const normalizeProduct = (product) => ({
  ...emptyProduct,
  ...product,
  id: product.id || createLocalId('prd'),
  baseCost: getNumberValue(product.baseCost),
  suggestedPrice: getNumberValue(product.suggestedPrice),
  status: product.status || 'Activo',
})

const matchesSearch = (product, query) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [product.name, product.category, product.material].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
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

  const filteredProducts = useMemo(
    () => products.map(normalizeProduct).filter((product) => matchesSearch(product, search)),
    [products, search],
  )

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

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <strong>Productos / Servicios</strong> <small>Catálogo comercial local</small>
            </div>
            <CButton color="primary" type="button" onClick={openCreateModal}>
              Nuevo producto / servicio
            </CButton>
          </CCardHeader>
          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}
            <CRow className="mb-3">
              <CCol lg={5}>
                <CFormInput
                  placeholder="Buscar por nombre, categoría o material asociado"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
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
                  <CTableHeaderCell>Material asociado</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredProducts.map((product) => (
                  <CTableRow key={product.id}>
                    <CTableDataCell className="fw-semibold">{product.name}</CTableDataCell>
                    <CTableDataCell>{product.category}</CTableDataCell>
                    <CTableDataCell>{product.unit}</CTableDataCell>
                    <CTableDataCell style={{ minWidth: '260px' }}>
                      {product.technicalDescription}
                    </CTableDataCell>
                    <CTableDataCell>{formatCurrency(product.baseCost)}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(product.suggestedPrice)}</CTableDataCell>
                    <CTableDataCell>{product.material}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={product.status === 'Activo' ? 'success' : 'warning'}>
                        {product.status}
                      </CBadge>
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
                ))}
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
