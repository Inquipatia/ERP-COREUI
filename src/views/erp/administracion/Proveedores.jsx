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

import { useAuth } from '../../../context/AuthContext'
import { validateRut } from '../../../utils/financeCalculations'
import {
  emptySupplier,
  FINANCE_CATEGORIES,
  normalizeSupplier,
  supplierMatchesSearch,
  useSuppliers,
} from '../../../utils/financeStorage'

const Proveedores = () => {
  const { hasPermission } = useAuth()
  const canView =
    hasPermission('suppliers.view') ||
    hasPermission('suppliers.manage') ||
    hasPermission('admin.all')
  const canManage = hasPermission('suppliers.manage') || hasPermission('admin.all')
  const [suppliers, setSuppliers] = useSuppliers()
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptySupplier)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplierMatchesSearch(supplier, search)),
    [suppliers, search],
  )

  const openCreateModal = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite crear proveedores.')
      return
    }
    setEditingId(null)
    setFormData(emptySupplier)
    setError('')
    setVisible(true)
  }

  const openEditModal = (supplier) => {
    if (!canManage) {
      setMessage('Tu perfil no permite editar proveedores.')
      return
    }
    setEditingId(supplier.id)
    setFormData(normalizeSupplier(supplier))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptySupplier)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite guardar proveedores.')
      return
    }
    if (!formData.name.trim()) {
      setError('Ingresa el nombre o razón social del proveedor.')
      return
    }
    if (formData.rut && !validateRut(formData.rut)) {
      setError('El RUT del proveedor no parece válido. Puedes dejarlo vacío si no corresponde.')
      return
    }

    const normalizedRut = String(formData.rut || '')
      .replace(/[.\-\s]/g, '')
      .toLowerCase()
    const duplicatedRut =
      normalizedRut &&
      suppliers.some((supplier) => {
        const currentRut = String(supplier.rut || '')
          .replace(/[.\-\s]/g, '')
          .toLowerCase()

        return currentRut === normalizedRut && supplier.id !== editingId
      })

    if (duplicatedRut) {
      setError('Ya existe un proveedor con ese RUT.')
      return
    }

    const payload = normalizeSupplier({
      ...formData,
      id: editingId || undefined,
      updatedAt: new Date().toISOString(),
    })

    setSuppliers((currentSuppliers) => {
      if (editingId) {
        return currentSuppliers.map((supplier) => (supplier.id === editingId ? payload : supplier))
      }
      return [payload, ...currentSuppliers]
    })

    setMessage(editingId ? 'Proveedor actualizado.' : 'Proveedor creado.')
    closeModal()
  }

  const handleDelete = (supplierId) => {
    if (!canManage) {
      setMessage('Tu perfil no permite eliminar proveedores.')
      return
    }
    setSuppliers((currentSuppliers) => currentSuppliers.filter((supplier) => supplier.id !== supplierId))
    setMessage('Proveedor eliminado localmente.')
  }

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver proveedores.</CAlert>

  return (
    <CRow className="g-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div><strong>Proveedores</strong> <small>datos bancarios, contactos y condiciones de pago</small></div>
            <div className="d-flex gap-2 flex-wrap">
              <CBadge color="primary">{filteredSuppliers.length} proveedores</CBadge>
              {canManage && <CButton color="primary" onClick={openCreateModal}>Nuevo proveedor</CButton>}
            </div>
          </CCardHeader>
          <CCardBody>
            {message && <CAlert color="success" dismissible onClose={() => setMessage('')}>{message}</CAlert>}
            <CFormLabel>Búsqueda</CFormLabel>
            <CFormInput className="mb-3" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por proveedor, RUT, contacto, categoría" />
            <CTable responsive hover align="middle">
              <CTableHead color="light"><CTableRow><CTableHeaderCell>Proveedor</CTableHeaderCell><CTableHeaderCell>Contacto</CTableHeaderCell><CTableHeaderCell>Categoría</CTableHeaderCell><CTableHeaderCell>Condición pago</CTableHeaderCell><CTableHeaderCell>Banco</CTableHeaderCell><CTableHeaderCell>Estado</CTableHeaderCell><CTableHeaderCell className="text-end">Acciones</CTableHeaderCell></CTableRow></CTableHead>
              <CTableBody>
                {filteredSuppliers.map((supplier) => (
                  <CTableRow key={supplier.id}>
                    <CTableDataCell><div className="fw-semibold">{supplier.name}</div><div className="small text-body-secondary">{supplier.rut || '-'}</div></CTableDataCell>
                    <CTableDataCell>{supplier.contactName || '-'}<div className="small text-body-secondary">{supplier.email || supplier.phone || '-'}</div></CTableDataCell>
                    <CTableDataCell><CBadge color="light" textColor="dark">{supplier.category}</CBadge></CTableDataCell>
                    <CTableDataCell>{supplier.paymentTerms}</CTableDataCell>
                    <CTableDataCell>{supplier.bankName || '-'}<div className="small text-body-secondary">{supplier.bankAccountType || ''} {supplier.bankAccountNumber || ''}</div></CTableDataCell>
                    <CTableDataCell><CBadge color={supplier.status === 'Activo' ? 'success' : 'secondary'}>{supplier.status}</CBadge></CTableDataCell>
                    <CTableDataCell className="text-end"><CButtonGroup size="sm">{canManage && <CButton color="secondary" variant="outline" onClick={() => openEditModal(supplier)}>Editar</CButton>}{canManage && <CButton color="danger" variant="outline" onClick={() => handleDelete(supplier.id)}>Eliminar</CButton>}</CButtonGroup></CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="lg">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader><CModalTitle>{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</CModalTitle></CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={8}><CFormLabel>Razón social / proveedor</CFormLabel><CFormInput name="name" value={formData.name} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>RUT</CFormLabel><CFormInput name="rut" value={formData.rut} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Contacto</CFormLabel><CFormInput name="contactName" value={formData.contactName} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Teléfono</CFormLabel><CFormInput name="phone" value={formData.phone} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Email</CFormLabel><CFormInput name="email" value={formData.email} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Categoría</CFormLabel><CFormSelect name="category" value={formData.category} onChange={handleChange}>{FINANCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</CFormSelect></CCol>
              <CCol md={4}><CFormLabel>Condición pago</CFormLabel><CFormInput name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Estado</CFormLabel><CFormSelect name="status" value={formData.status} onChange={handleChange}><option>Activo</option><option>Inactivo</option></CFormSelect></CCol>
              <CCol md={4}><CFormLabel>Banco</CFormLabel><CFormInput name="bankName" value={formData.bankName} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Tipo cuenta</CFormLabel><CFormInput name="bankAccountType" value={formData.bankAccountType} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>N° cuenta</CFormLabel><CFormInput name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} /></CCol>
              <CCol md={6}><CFormLabel>Email cuenta</CFormLabel><CFormInput name="bankAccountEmail" value={formData.bankAccountEmail} onChange={handleChange} /></CCol>
              <CCol xs={12}><CFormLabel>Observaciones</CFormLabel><CFormTextarea rows={3} name="notes" value={formData.notes} onChange={handleChange} /></CCol>
            </CRow>
          </CModalBody>
          <CModalFooter><CButton color="secondary" variant="outline" onClick={closeModal}>Cancelar</CButton><CButton color="primary" type="submit">Guardar</CButton></CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Proveedores
