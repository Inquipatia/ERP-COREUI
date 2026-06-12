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
import { mockMaterials } from '../../data/mockMaterials'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

const emptyMaterial = {
  name: '',
  category: '',
  unit: '',
  baseCost: '',
  wastePercent: '',
  marginPercent: '',
  supplier: '',
  observations: '',
  status: 'Activo',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const getNumberValue = (value) => Number(value) || 0

const normalizeMaterial = (material) => ({
  ...emptyMaterial,
  ...material,
  id: material.id || createLocalId('mat'),
  status: material.status || 'Activo',
  baseCost: getNumberValue(material.baseCost),
  wastePercent: getNumberValue(material.wastePercent),
  marginPercent: getNumberValue(material.marginPercent),
})

const matchesSearch = (material, query) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [material.name, material.category, material.supplier].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const Materiales = () => {
  const [materials, setMaterials] = useLocalStorageState(
    STORAGE_KEYS.materials,
    mockMaterials.map(normalizeMaterial),
  )
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyMaterial)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredMaterials = useMemo(
    () => materials.map(normalizeMaterial).filter((material) => matchesSearch(material, search)),
    [materials, search],
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData(emptyMaterial)
    setError('')
    setVisible(true)
  }

  const openEditModal = (material) => {
    setEditingId(material.id)
    setFormData(normalizeMaterial(material))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyMaterial)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.category.trim() || !formData.unit.trim()) {
      setError('Ingresa nombre, categoría y unidad de medida.')
      return
    }

    const payload = normalizeMaterial({
      ...formData,
      id: editingId || createLocalId('mat'),
    })

    setMaterials((currentMaterials) => {
      if (editingId) {
        return currentMaterials.map((material) => (material.id === editingId ? payload : material))
      }

      return [...currentMaterials, payload]
    })
    setMessage(editingId ? 'Material actualizado localmente.' : 'Material creado localmente.')
    closeModal()
  }

  const handleDelete = (materialId) => {
    setMaterials((currentMaterials) =>
      currentMaterials.filter((material) => material.id !== materialId),
    )
    setMessage('Material eliminado localmente.')
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <strong>Materiales</strong> <small>Costos base y reglas comerciales locales</small>
            </div>
            <CButton color="primary" type="button" onClick={openCreateModal}>
              Nuevo material
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
                  placeholder="Buscar por nombre, categoría o proveedor"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>
            </CRow>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Nombre material</CTableHeaderCell>
                  <CTableHeaderCell>Categoría</CTableHeaderCell>
                  <CTableHeaderCell>Unidad</CTableHeaderCell>
                  <CTableHeaderCell>Costo base</CTableHeaderCell>
                  <CTableHeaderCell>Merma %</CTableHeaderCell>
                  <CTableHeaderCell>Margen %</CTableHeaderCell>
                  <CTableHeaderCell>Proveedor</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Observaciones</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredMaterials.map((material) => (
                  <CTableRow key={material.id}>
                    <CTableDataCell className="fw-semibold">{material.name}</CTableDataCell>
                    <CTableDataCell>{material.category}</CTableDataCell>
                    <CTableDataCell>{material.unit}</CTableDataCell>
                    <CTableDataCell>{formatCurrency(material.baseCost)}</CTableDataCell>
                    <CTableDataCell>{material.wastePercent}%</CTableDataCell>
                    <CTableDataCell>{material.marginPercent}%</CTableDataCell>
                    <CTableDataCell>{material.supplier}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={material.status === 'Activo' ? 'success' : 'secondary'}>
                        {material.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: '220px' }}>
                      {material.observations}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup size="sm" role="group" aria-label="Acciones de material">
                        <CButton
                          color="primary"
                          variant="outline"
                          type="button"
                          onClick={() => openEditModal(material)}
                        >
                          Editar
                        </CButton>
                        <CButton
                          color="danger"
                          variant="outline"
                          type="button"
                          onClick={() => handleDelete(material.id)}
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
            <CModalTitle>{editingId ? 'Editar material' : 'Nuevo material'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="name">Nombre material</CFormLabel>
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
                <CFormLabel htmlFor="unit">Unidad de medida</CFormLabel>
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
              <CCol md={2}>
                <CFormLabel htmlFor="wastePercent">Merma %</CFormLabel>
                <CFormInput
                  id="wastePercent"
                  name="wastePercent"
                  type="number"
                  min="0"
                  value={formData.wastePercent}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel htmlFor="marginPercent">Margen %</CFormLabel>
                <CFormInput
                  id="marginPercent"
                  name="marginPercent"
                  type="number"
                  min="0"
                  value={formData.marginPercent}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={8}>
                <CFormLabel htmlFor="supplier">Proveedor sugerido</CFormLabel>
                <CFormInput
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
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
                </CFormSelect>
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="observations">Observaciones</CFormLabel>
                <CFormTextarea
                  id="observations"
                  name="observations"
                  rows={3}
                  value={formData.observations}
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
              Guardar material
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Materiales
