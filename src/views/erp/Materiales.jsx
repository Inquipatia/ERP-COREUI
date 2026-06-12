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
import { mockMaterials } from '../../data/mockMaterials'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'
import { exportListToExcel } from '../../utils/exportListToExcel'

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

  return [
    material.name,
    material.category,
    material.unit,
    material.supplier,
    material.status,
    material.observations,
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const hasTextValue = (value) => String(value || '').trim().length > 0

const getCommercialCost = (material) => {
  const baseCost = getNumberValue(material.baseCost)
  const wastePercent = getNumberValue(material.wastePercent)
  const marginPercent = getNumberValue(material.marginPercent)

  const costWithWaste = baseCost * (1 + wastePercent / 100)
  const costWithMargin = costWithWaste * (1 + marginPercent / 100)

  return Math.round(costWithMargin)
}

const getCompletionPercent = (material) => {
  const fields = [
    hasTextValue(material.name),
    hasTextValue(material.category),
    hasTextValue(material.unit),
    getNumberValue(material.baseCost) > 0,
    hasTextValue(material.supplier),
    hasTextValue(material.status),
  ]

  const completedFields = fields.filter(Boolean).length

  return Math.round((completedFields / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const getStatusColor = (status) => (status === 'Activo' ? 'success' : 'secondary')

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

  const normalizedMaterials = useMemo(() => materials.map(normalizeMaterial), [materials])

  const filteredMaterials = useMemo(
    () => normalizedMaterials.filter((material) => matchesSearch(material, search)),
    [normalizedMaterials, search],
  )

  const materialSummary = useMemo(() => {
    const total = normalizedMaterials.length
    const active = normalizedMaterials.filter((material) => material.status === 'Activo').length
    const inactive = normalizedMaterials.filter((material) => material.status === 'Inactivo').length
    const withBaseCost = normalizedMaterials.filter(
      (material) => getNumberValue(material.baseCost) > 0,
    ).length
    const withSupplier = normalizedMaterials.filter((material) =>
      hasTextValue(material.supplier),
    ).length

    const totalBaseCost = normalizedMaterials.reduce(
      (sum, material) => sum + getNumberValue(material.baseCost),
      0,
    )

    const estimatedCommercialValue = normalizedMaterials.reduce(
      (sum, material) => sum + getCommercialCost(material),
      0,
    )

    const averageMargin =
      total > 0
        ? Math.round(
            normalizedMaterials.reduce(
              (sum, material) => sum + getNumberValue(material.marginPercent),
              0,
            ) / total,
          )
        : 0

    const averageWaste =
      total > 0
        ? Math.round(
            normalizedMaterials.reduce(
              (sum, material) => sum + getNumberValue(material.wastePercent),
              0,
            ) / total,
          )
        : 0

    return {
      total,
      active,
      inactive,
      withBaseCost,
      withSupplier,
      totalBaseCost,
      estimatedCommercialValue,
      averageMargin,
      averageWaste,
      filtered: filteredMaterials.length,
      activePercent: total > 0 ? Math.round((active / total) * 100) : 0,
      costCoveragePercent: total > 0 ? Math.round((withBaseCost / total) * 100) : 0,
      supplierCoveragePercent: total > 0 ? Math.round((withSupplier / total) * 100) : 0,
    }
  }, [normalizedMaterials, filteredMaterials])

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

  const handleToggleStatus = (material) => {
    const nextStatus = material.status === 'Activo' ? 'Inactivo' : 'Activo'

    setMaterials((currentMaterials) =>
      currentMaterials.map((currentMaterial) =>
        currentMaterial.id === material.id
          ? { ...currentMaterial, status: nextStatus }
          : currentMaterial,
      ),
    )

    setMessage(`Material ${nextStatus === 'Activo' ? 'activado' : 'inactivado'} localmente.`)
  }

  const handleExportMaterialsList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Materiales-ERP-Rubik',
        sheetName: 'Materiales',
        title: 'Listado de materiales ERP Rubik',
        columns: [
          { header: 'Nombre material', key: 'name', width: 30 },
          { header: 'Categoría', key: 'category', width: 24 },
          { header: 'Unidad', key: 'unit', width: 14 },
          {
            header: 'Costo base',
            key: 'baseCost',
            width: 16,
            numFmt: '"$"#,##0',
          },
          {
            header: 'Merma %',
            key: 'wastePercent',
            width: 12,
          },
          {
            header: 'Margen %',
            key: 'marginPercent',
            width: 12,
          },
          {
            header: 'Costo sugerido',
            key: 'commercialCost',
            width: 18,
            numFmt: '"$"#,##0',
            value: (material) => getCommercialCost(material),
          },
          { header: 'Proveedor sugerido', key: 'supplier', width: 28 },
          { header: 'Estado', key: 'status', width: 14 },
          {
            header: 'Completitud ficha',
            key: 'completion',
            width: 18,
            value: (material) => `${getCompletionPercent(material)}%`,
          },
          { header: 'Observaciones', key: 'observations', width: 42 },
        ],
        rows: filteredMaterials,
        summary: [
          { label: 'Materiales exportados', value: filteredMaterials.length },
          { label: 'Total materiales guardados', value: materialSummary.total },
          { label: 'Materiales activos', value: materialSummary.active },
          { label: 'Materiales inactivos', value: materialSummary.inactive },
          { label: 'Con costo base', value: materialSummary.withBaseCost },
          { label: 'Con proveedor sugerido', value: materialSummary.withSupplier },
          { label: 'Margen promedio', value: `${materialSummary.averageMargin}%` },
          { label: 'Merma promedio', value: `${materialSummary.averageWaste}%` },
          { label: 'Valorización costo base', value: formatCurrency(materialSummary.totalBaseCost) },
          {
            label: 'Valorización costo sugerido',
            value: formatCurrency(materialSummary.estimatedCommercialValue),
          },
        ],
      })

      setMessage('Listado de materiales exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando listado de materiales:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de materiales.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Materiales registrados</div>
            <div className="fs-3 fw-semibold">{materialSummary.total}</div>
            <CProgress thin color="primary" value={materialSummary.total > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Materiales activos</div>
            <div className="fs-3 fw-semibold">{materialSummary.active}</div>
            <div className="small text-body-secondary">
              {materialSummary.activePercent}% del catálogo
            </div>
            <CProgress thin color="success" value={materialSummary.activePercent} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Con costo base</div>
            <div className="fs-3 fw-semibold">{materialSummary.costCoveragePercent}%</div>
            <div className="small text-body-secondary">{materialSummary.withBaseCost} materiales</div>
            <CProgress
              thin
              color={materialSummary.costCoveragePercent >= 70 ? 'success' : 'warning'}
              value={materialSummary.costCoveragePercent}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Valor costo sugerido</div>
            <div className="fs-5 fw-semibold">
              {formatCurrency(materialSummary.estimatedCommercialValue)}
            </div>
            <div className="small text-body-secondary">
              Merma prom. {materialSummary.averageWaste}% / margen prom.{' '}
              {materialSummary.averageMargin}%
            </div>
            <CProgress
              thin
              color="info"
              value={materialSummary.estimatedCommercialValue > 0 ? 75 : 0}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Materiales</strong> <small>Costos base y reglas comerciales locales</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredMaterials.length} materiales</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportMaterialsList}
                disabled={filteredMaterials.length === 0}
              >
                Exportar listado Excel
              </CButton>
              <CButton color="primary" type="button" onClick={openCreateModal}>
                Nuevo material
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
                  placeholder="Buscar por nombre, categoría, unidad, proveedor o estado"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>

              <CCol lg={7} className="d-flex align-items-center gap-2 flex-wrap">
                <CBadge color="success">Activos: {materialSummary.active}</CBadge>
                <CBadge color="secondary">Inactivos: {materialSummary.inactive}</CBadge>
                <CBadge color="info">Con costo: {materialSummary.withBaseCost}</CBadge>
                <CBadge color="primary">Con proveedor: {materialSummary.withSupplier}</CBadge>
                <CBadge color="warning">Filtrados: {materialSummary.filtered}</CBadge>
              </CCol>
            </CRow>

            {filteredMaterials.length === 0 ? (
              <CAlert color="warning">
                No hay materiales que coincidan con la búsqueda actual.
              </CAlert>
            ) : (
              <CTable responsive align="middle" hover>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Nombre material</CTableHeaderCell>
                    <CTableHeaderCell>Categoría</CTableHeaderCell>
                    <CTableHeaderCell>Unidad</CTableHeaderCell>
                    <CTableHeaderCell>Costo base</CTableHeaderCell>
                    <CTableHeaderCell>Merma %</CTableHeaderCell>
                    <CTableHeaderCell>Margen %</CTableHeaderCell>
                    <CTableHeaderCell>Costo sugerido</CTableHeaderCell>
                    <CTableHeaderCell>Proveedor</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Ficha</CTableHeaderCell>
                    <CTableHeaderCell>Observaciones</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {filteredMaterials.map((material) => {
                    const completionPercent = getCompletionPercent(material)

                    return (
                      <CTableRow key={material.id}>
                        <CTableDataCell className="fw-semibold">{material.name}</CTableDataCell>
                        <CTableDataCell>{material.category}</CTableDataCell>
                        <CTableDataCell>{material.unit}</CTableDataCell>
                        <CTableDataCell>{formatCurrency(material.baseCost)}</CTableDataCell>
                        <CTableDataCell>{material.wastePercent}%</CTableDataCell>
                        <CTableDataCell>{material.marginPercent}%</CTableDataCell>
                        <CTableDataCell>{formatCurrency(getCommercialCost(material))}</CTableDataCell>
                        <CTableDataCell>{material.supplier}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getStatusColor(material.status)}>{material.status}</CBadge>
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
                              color="secondary"
                              variant="outline"
                              type="button"
                              onClick={() => handleToggleStatus(material)}
                            >
                              {material.status === 'Activo' ? 'Inactivar' : 'Activar'}
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
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
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
