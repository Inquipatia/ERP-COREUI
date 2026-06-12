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
import { mockClients } from '../../data/mockClients'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

const emptyClient = {
  contact: '',
  company: '',
  rut: '',
  phone: '',
  email: '',
  commune: '',
  address: '',
  status: 'Activo',
  observations: '',
}

const normalizeClient = (client) => ({
  ...emptyClient,
  ...client,
  contact: client.contact || client.client || '',
  commune: client.commune || client.comuna || '',
  id: client.id || createLocalId('cli'),
})

const searchClient = (client, query) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [client.contact, client.company, client.rut, client.commune].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const Clientes = () => {
  const [clients, setClients] = useLocalStorageState(
    STORAGE_KEYS.clients,
    mockClients.map(normalizeClient),
  )
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyClient)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredClients = useMemo(
    () => clients.map(normalizeClient).filter((client) => searchClient(client, search)),
    [clients, search],
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData(emptyClient)
    setError('')
    setVisible(true)
  }

  const openEditModal = (client) => {
    setEditingId(client.id)
    setFormData(normalizeClient(client))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyClient)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!formData.contact.trim() || !formData.company.trim()) {
      setError('Ingresa al menos cliente/contacto y empresa.')
      return
    }

    const payload = {
      ...normalizeClient(formData),
      id: editingId || createLocalId('cli'),
    }

    setClients((currentClients) => {
      if (editingId) {
        return currentClients.map((client) => (client.id === editingId ? payload : client))
      }

      return [...currentClients, payload]
    })
    setMessage(editingId ? 'Cliente actualizado localmente.' : 'Cliente creado localmente.')
    closeModal()
  }

  const handleDelete = (clientId) => {
    setClients((currentClients) => currentClients.filter((client) => client.id !== clientId))
    setMessage('Cliente eliminado localmente.')
  }

  const handleToggleStatus = (client) => {
    const nextStatus = client.status === 'Activo' ? 'Inactivo' : 'Activo'
    setClients((currentClients) =>
      currentClients.map((currentClient) =>
        currentClient.id === client.id ? { ...currentClient, status: nextStatus } : currentClient,
      ),
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3">
            <div>
              <strong>Clientes</strong> <small>Base comercial local</small>
            </div>
            <CButton color="primary" type="button" onClick={openCreateModal}>
              Nuevo cliente
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
                  placeholder="Buscar por cliente, empresa, RUT o comuna"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>
            </CRow>
            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Cliente / contacto</CTableHeaderCell>
                  <CTableHeaderCell>Empresa</CTableHeaderCell>
                  <CTableHeaderCell>RUT</CTableHeaderCell>
                  <CTableHeaderCell>Teléfono</CTableHeaderCell>
                  <CTableHeaderCell>Email</CTableHeaderCell>
                  <CTableHeaderCell>Comuna</CTableHeaderCell>
                  <CTableHeaderCell>Dirección</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Observaciones</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredClients.map((client) => (
                  <CTableRow key={client.id}>
                    <CTableDataCell className="fw-semibold">{client.contact}</CTableDataCell>
                    <CTableDataCell>{client.company}</CTableDataCell>
                    <CTableDataCell>{client.rut}</CTableDataCell>
                    <CTableDataCell>{client.phone}</CTableDataCell>
                    <CTableDataCell>{client.email}</CTableDataCell>
                    <CTableDataCell>{client.commune}</CTableDataCell>
                    <CTableDataCell>{client.address}</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={client.status === 'Activo' ? 'success' : 'secondary'}>
                        {client.status}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell style={{ minWidth: '220px' }}>
                      {client.observations}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">
                      <CButtonGroup size="sm" role="group" aria-label="Acciones de cliente">
                        <CButton
                          color="primary"
                          variant="outline"
                          type="button"
                          onClick={() => openEditModal(client)}
                        >
                          Editar
                        </CButton>
                        <CButton
                          color="secondary"
                          variant="outline"
                          type="button"
                          onClick={() => handleToggleStatus(client)}
                        >
                          {client.status === 'Activo' ? 'Inactivar' : 'Activar'}
                        </CButton>
                        <CButton
                          color="danger"
                          variant="outline"
                          type="button"
                          onClick={() => handleDelete(client.id)}
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
            <CModalTitle>{editingId ? 'Editar cliente' : 'Nuevo cliente'}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="contact">Cliente / contacto</CFormLabel>
                <CFormInput
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel htmlFor="company">Empresa</CFormLabel>
                <CFormInput
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="rut">RUT</CFormLabel>
                <CFormInput id="rut" name="rut" value={formData.rut} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="phone">Teléfono</CFormLabel>
                <CFormInput
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="email">Email</CFormLabel>
                <CFormInput
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel htmlFor="commune">Comuna</CFormLabel>
                <CFormInput
                  id="commune"
                  name="commune"
                  value={formData.commune}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={5}>
                <CFormLabel htmlFor="address">Dirección</CFormLabel>
                <CFormInput
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
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
              Guardar cliente
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Clientes
