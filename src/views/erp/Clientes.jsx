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
import { mockClients } from '../../data/mockClients'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'
import { exportListToExcel } from '../../utils/exportListToExcel'

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

  return [
    client.contact,
    client.company,
    client.rut,
    client.phone,
    client.email,
    client.commune,
    client.address,
    client.status,
    client.observations,
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const hasValue = (value) => String(value || '').trim().length > 0

const getCompletionPercent = (client) => {
  const fields = [
    client.contact,
    client.company,
    client.rut,
    client.phone,
    client.email,
    client.commune,
    client.address,
  ]

  const completedFields = fields.filter(hasValue).length

  return Math.round((completedFields / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const getStatusColor = (status) => (status === 'Activo' ? 'success' : 'secondary')

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

  const normalizedClients = useMemo(() => clients.map(normalizeClient), [clients])

  const filteredClients = useMemo(
    () => normalizedClients.filter((client) => searchClient(client, search)),
    [normalizedClients, search],
  )

  const clientSummary = useMemo(() => {
    const total = normalizedClients.length
    const active = normalizedClients.filter((client) => client.status === 'Activo').length
    const inactive = normalizedClients.filter((client) => client.status === 'Inactivo').length
    const withRut = normalizedClients.filter((client) => hasValue(client.rut)).length
    const withEmail = normalizedClients.filter((client) => hasValue(client.email)).length
    const withPhone = normalizedClients.filter((client) => hasValue(client.phone)).length
    const filtered = filteredClients.length

    return {
      total,
      active,
      inactive,
      withRut,
      withEmail,
      withPhone,
      filtered,
      activePercent: total > 0 ? Math.round((active / total) * 100) : 0,
      dataQualityPercent:
        total > 0 ? Math.round(((withRut + withEmail + withPhone) / (total * 3)) * 100) : 0,
    }
  }, [normalizedClients, filteredClients])

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

    setMessage(`Cliente ${nextStatus === 'Activo' ? 'activado' : 'inactivado'} localmente.`)
  }

  const handleExportClientsList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Clientes-ERP-Rubik',
        sheetName: 'Clientes',
        title: 'Listado de clientes ERP Rubik',
        columns: [
          { header: 'Cliente / contacto', key: 'contact', width: 28 },
          { header: 'Empresa', key: 'company', width: 30 },
          { header: 'RUT', key: 'rut', width: 16 },
          { header: 'Teléfono', key: 'phone', width: 18 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Comuna', key: 'commune', width: 20 },
          { header: 'Dirección', key: 'address', width: 36 },
          { header: 'Estado', key: 'status', width: 14 },
          {
            header: 'Completitud ficha',
            key: 'completion',
            width: 18,
            value: (client) => `${getCompletionPercent(client)}%`,
          },
          { header: 'Observaciones', key: 'observations', width: 42 },
        ],
        rows: filteredClients,
        summary: [
          { label: 'Clientes exportados', value: filteredClients.length },
          { label: 'Total clientes guardados', value: clientSummary.total },
          { label: 'Clientes activos', value: clientSummary.active },
          { label: 'Clientes inactivos', value: clientSummary.inactive },
          { label: 'Clientes con RUT', value: clientSummary.withRut },
          { label: 'Clientes con email', value: clientSummary.withEmail },
          { label: 'Clientes con teléfono', value: clientSummary.withPhone },
        ],
      })

      setMessage('Listado de clientes exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando listado de clientes:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de clientes.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Clientes registrados</div>
            <div className="fs-3 fw-semibold">{clientSummary.total}</div>
            <CProgress thin color="primary" value={clientSummary.total > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Clientes activos</div>
            <div className="fs-3 fw-semibold">{clientSummary.active}</div>
            <div className="small text-body-secondary">{clientSummary.activePercent}% de la base</div>
            <CProgress thin color="success" value={clientSummary.activePercent} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Datos de contacto</div>
            <div className="fs-3 fw-semibold">{clientSummary.dataQualityPercent}%</div>
            <div className="small text-body-secondary">RUT, email y teléfono</div>
            <CProgress
              thin
              color={clientSummary.dataQualityPercent >= 70 ? 'success' : 'warning'}
              value={clientSummary.dataQualityPercent}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Resultado filtrado</div>
            <div className="fs-3 fw-semibold">{clientSummary.filtered}</div>
            <div className="small text-body-secondary">según búsqueda actual</div>
            <CProgress
              thin
              color="info"
              value={
                clientSummary.total > 0
                  ? Math.round((clientSummary.filtered / clientSummary.total) * 100)
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
              <strong>Clientes</strong> <small>Base comercial local</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredClients.length} clientes</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportClientsList}
                disabled={filteredClients.length === 0}
              >
                Exportar listado Excel
              </CButton>
              <CButton color="primary" type="button" onClick={openCreateModal}>
                Nuevo cliente
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
                  placeholder="Buscar por cliente, empresa, RUT, teléfono, email o comuna"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>

              <CCol lg={7} className="d-flex align-items-center gap-2 flex-wrap">
                <CBadge color="success">Activos: {clientSummary.active}</CBadge>
                <CBadge color="secondary">Inactivos: {clientSummary.inactive}</CBadge>
                <CBadge color="info">Con RUT: {clientSummary.withRut}</CBadge>
                <CBadge color="primary">Con email: {clientSummary.withEmail}</CBadge>
                <CBadge color="warning">Con teléfono: {clientSummary.withPhone}</CBadge>
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
                  <CTableHeaderCell>Ficha</CTableHeaderCell>
                  <CTableHeaderCell>Observaciones</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredClients.map((client) => {
                  const completionPercent = getCompletionPercent(client)

                  return (
                    <CTableRow key={client.id}>
                      <CTableDataCell className="fw-semibold">{client.contact}</CTableDataCell>
                      <CTableDataCell>{client.company}</CTableDataCell>
                      <CTableDataCell>{client.rut}</CTableDataCell>
                      <CTableDataCell>{client.phone}</CTableDataCell>
                      <CTableDataCell>{client.email}</CTableDataCell>
                      <CTableDataCell>{client.commune}</CTableDataCell>
                      <CTableDataCell>{client.address}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(client.status)}>{client.status}</CBadge>
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