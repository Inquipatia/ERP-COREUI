import React, { useEffect, useMemo, useState } from 'react'
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
import { erpRoles, mockUsers } from '../../data/mockUsers'
import { createLocalId, STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'
import { exportListToExcel } from '../../utils/exportListToExcel'

const USERS_STORAGE_KEY = STORAGE_KEYS.users || 'rubik.erp.users'

const AREA_OPTIONS = [
  'Ventas',
  'Ventas Públicas',
  'Ventas Privadas',
  'Licitaciones',
  'Marketing',
  'Diseño',
  'Diseño Imprenta',
  'Producción',
  'Taller',
  'Instalaciones',
  'Administración',
  'Contabilidad',
  'Finanzas',
  'Gerencia',
  'Desarrollo',
  'Operaciones',
  'Compras',
  'Bodega',
  'Postventa',
  'Otro',
]

const STATUS_OPTIONS = ['Activo', 'Inactivo', 'Pendiente']

const DEFAULT_ROLE = erpRoles[0] || 'Administrador'

const emptyUser = {
  name: '',
  email: '',
  role: DEFAULT_ROLE,
  status: 'Activo',
  position: '',
  area: '',
  observations: '',
}

const hasValue = (value) => String(value || '').trim().length > 0

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())

const normalizeUser = (user) => ({
  ...emptyUser,
  ...user,
  id: user.id || createLocalId('usr'),
  name: user.name || '',
  email: user.email || '',
  role: user.role || DEFAULT_ROLE,
  status: user.status || 'Activo',
  position: user.position || user.cargo || '',
  area: user.area || '',
  observations: user.observations || user.observaciones || '',
})

const mergeBaseUsers = (users) => {
  const usersByEmail = new Map()

  ;(Array.isArray(users) ? users : []).map(normalizeUser).forEach((user) => {
    usersByEmail.set((user.email || user.id).toLowerCase(), user)
  })

  let changed = false

  mockUsers.map(normalizeUser).forEach((baseUser) => {
    const key = (baseUser.email || baseUser.id).toLowerCase()
    const currentUser = usersByEmail.get(key)

    if (!currentUser) {
      usersByEmail.set(key, baseUser)
      changed = true
      return
    }

    const mergedUser = {
      ...currentUser,
      ...baseUser,
      id: currentUser.id || baseUser.id,
      status: currentUser.status || baseUser.status,
      observations: currentUser.observations || baseUser.observations || '',
    }

    if (JSON.stringify(currentUser) !== JSON.stringify(mergedUser)) {
      usersByEmail.set(key, mergedUser)
      changed = true
    }
  })

  return changed ? Array.from(usersByEmail.values()) : users
}

const matchesSearch = (user, query) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    user.name,
    user.email,
    user.role,
    user.status,
    user.position,
    user.area,
    user.observations,
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

const getStatusColor = (status) => {
  if (status === 'Activo') return 'success'
  if (status === 'Pendiente') return 'warning'
  return 'secondary'
}

const getCompletionPercent = (user) => {
  const fields = [user.name, user.email, user.role, user.status, user.position, user.area]
  const completedFields = fields.filter(hasValue).length

  return Math.round((completedFields / fields.length) * 100)
}

const getCompletionColor = (percent) => {
  if (percent >= 85) return 'success'
  if (percent >= 60) return 'warning'
  return 'danger'
}

const Usuarios = () => {
  const [users, setUsers] = useLocalStorageState(USERS_STORAGE_KEY, mockUsers.map(normalizeUser))
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyUser)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setUsers((currentUsers) => mergeBaseUsers(currentUsers))
  }, [setUsers])

  const normalizedUsers = useMemo(() => users.map(normalizeUser), [users])

  const filteredUsers = useMemo(
    () =>
      normalizedUsers.filter((user) => {
        const matchesText = matchesSearch(user, search)
        const matchesRole = !roleFilter || user.role === roleFilter
        const matchesStatus = !statusFilter || user.status === statusFilter

        return matchesText && matchesRole && matchesStatus
      }),
    [normalizedUsers, search, roleFilter, statusFilter],
  )

  const roleOptions = useMemo(
    () => [...new Set([...erpRoles, ...normalizedUsers.map((user) => user.role)].filter(Boolean))],
    [normalizedUsers],
  )

  const areaOptions = useMemo(
    () => [
      ...new Set([...AREA_OPTIONS, ...normalizedUsers.map((user) => user.area)].filter(Boolean)),
    ],
    [normalizedUsers],
  )

  const userSummary = useMemo(() => {
    const total = normalizedUsers.length
    const active = normalizedUsers.filter((user) => user.status === 'Activo').length
    const inactive = normalizedUsers.filter((user) => user.status === 'Inactivo').length
    const pending = normalizedUsers.filter((user) => user.status === 'Pendiente').length
    const withEmail = normalizedUsers.filter((user) => hasValue(user.email)).length
    const withArea = normalizedUsers.filter((user) => hasValue(user.area)).length
    const withPosition = normalizedUsers.filter((user) => hasValue(user.position)).length

    return {
      total,
      active,
      inactive,
      pending,
      withEmail,
      withArea,
      withPosition,
      filtered: filteredUsers.length,
      activePercent: total > 0 ? Math.round((active / total) * 100) : 0,
      profileQualityPercent:
        total > 0 ? Math.round(((withEmail + withArea + withPosition) / (total * 3)) * 100) : 0,
    }
  }, [normalizedUsers, filteredUsers])

  const roleSummary = useMemo(
    () =>
      roleOptions.map((role) => ({
        role,
        count: normalizedUsers.filter((user) => user.role === role).length,
      })),
    [normalizedUsers, roleOptions],
  )

  const openCreateModal = () => {
    setEditingId(null)
    setFormData(emptyUser)
    setError('')
    setVisible(true)
  }

  const openEditModal = (user) => {
    setEditingId(user.id)
    setFormData(normalizeUser(user))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyUser)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const validateUser = () => {
    if (!formData.name.trim()) {
      return 'Ingresa el nombre del usuario.'
    }

    if (!formData.email.trim()) {
      return 'Ingresa el email del usuario.'
    }

    if (!isValidEmail(formData.email)) {
      return 'Ingresa un email válido.'
    }

    if (!formData.role.trim()) {
      return 'Selecciona un rol para el usuario.'
    }

    const normalizedEmail = formData.email.trim().toLowerCase()
    const duplicatedEmail = normalizedUsers.some(
      (user) => user.email.trim().toLowerCase() === normalizedEmail && user.id !== editingId,
    )

    if (duplicatedEmail) {
      return 'Ya existe un usuario con ese email.'
    }

    return ''
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const validationError = validateUser()

    if (validationError) {
      setError(validationError)
      return
    }

    const payload = normalizeUser({
      ...formData,
      id: editingId || createLocalId('usr'),
      email: formData.email.trim().toLowerCase(),
    })

    setUsers((currentUsers) => {
      if (editingId) {
        return currentUsers.map((user) => (user.id === editingId ? payload : user))
      }

      return [...currentUsers, payload]
    })

    setMessage(editingId ? 'Usuario actualizado localmente.' : 'Usuario creado localmente.')
    closeModal()
  }

  const handleDelete = (userId) => {
    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId))
    setMessage('Usuario eliminado localmente.')
  }

  const handleToggleStatus = (user) => {
    const nextStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo'

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id ? { ...currentUser, status: nextStatus } : currentUser,
      ),
    )

    setMessage(`Usuario ${nextStatus === 'Activo' ? 'activado' : 'inactivado'} localmente.`)
  }

  const handleExportUsersList = async () => {
    try {
      await exportListToExcel({
        fileName: 'Listado-Usuarios-ERP-Rubik',
        sheetName: 'Usuarios',
        title: 'Listado de usuarios ERP Rubik',
        columns: [
          { header: 'Nombre', key: 'name', width: 28 },
          { header: 'Email', key: 'email', width: 32 },
          { header: 'Rol', key: 'role', width: 24 },
          { header: 'Estado', key: 'status', width: 16 },
          { header: 'Cargo', key: 'position', width: 26 },
          { header: 'Área', key: 'area', width: 22 },
          {
            header: 'Completitud perfil',
            key: 'completion',
            width: 20,
            value: (user) => `${getCompletionPercent(user)}%`,
          },
          { header: 'Observaciones', key: 'observations', width: 42 },
        ],
        rows: filteredUsers,
        summary: [
          { label: 'Usuarios exportados', value: filteredUsers.length },
          { label: 'Total usuarios guardados', value: userSummary.total },
          { label: 'Usuarios activos', value: userSummary.active },
          { label: 'Usuarios inactivos', value: userSummary.inactive },
          { label: 'Usuarios pendientes', value: userSummary.pending },
          { label: 'Usuarios con email', value: userSummary.withEmail },
          { label: 'Usuarios con área', value: userSummary.withArea },
          { label: 'Usuarios con cargo', value: userSummary.withPosition },
        ],
      })

      setMessage('Listado de usuarios exportado correctamente.')
    } catch (exportError) {
      console.error('Error exportando listado de usuarios:', exportError)
      setMessage(exportError.message || 'No se pudo exportar el listado de usuarios.')
    }
  }

  return (
    <CRow className="g-4">
      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Usuarios registrados</div>
            <div className="fs-3 fw-semibold">{userSummary.total}</div>
            <CProgress thin color="primary" value={userSummary.total > 0 ? 100 : 0} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Usuarios activos</div>
            <div className="fs-3 fw-semibold">{userSummary.active}</div>
            <div className="small text-body-secondary">{userSummary.activePercent}% de la base</div>
            <CProgress thin color="success" value={userSummary.activePercent} />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Calidad de perfiles</div>
            <div className="fs-3 fw-semibold">{userSummary.profileQualityPercent}%</div>
            <div className="small text-body-secondary">email, cargo y área</div>
            <CProgress
              thin
              color={userSummary.profileQualityPercent >= 70 ? 'success' : 'warning'}
              value={userSummary.profileQualityPercent}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={3} sm={6}>
        <CCard className="h-100">
          <CCardBody>
            <div className="text-body-secondary small">Resultado filtrado</div>
            <div className="fs-3 fw-semibold">{userSummary.filtered}</div>
            <div className="small text-body-secondary">según búsqueda actual</div>
            <CProgress
              thin
              color="info"
              value={
                userSummary.total > 0
                  ? Math.round((userSummary.filtered / userSummary.total) * 100)
                  : 0
              }
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <strong>Usuarios / Perfiles</strong> <small>Roles y accesos del ERP</small>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <CBadge color="primary">{filteredUsers.length} usuarios</CBadge>
              <CButton
                color="success"
                type="button"
                variant="outline"
                onClick={handleExportUsersList}
                disabled={filteredUsers.length === 0}
              >
                Exportar listado Excel
              </CButton>
              <CButton color="primary" type="button" onClick={openCreateModal}>
                Nuevo usuario
              </CButton>
            </div>
          </CCardHeader>

          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}

            <CRow className="g-3 mb-3">
              <CCol lg={4}>
                <CFormLabel htmlFor="userSearch">Búsqueda inteligente</CFormLabel>
                <CFormInput
                  id="userSearch"
                  placeholder="Buscar por nombre, email, rol, cargo o área"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>

              <CCol lg={3} md={6}>
                <CFormLabel htmlFor="roleFilter">Rol</CFormLabel>
                <CFormSelect
                  id="roleFilter"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol lg={3} md={6}>
                <CFormLabel htmlFor="statusFilter">Estado</CFormLabel>
                <CFormSelect
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">Todos</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol lg={2} className="d-flex align-items-end">
                <CButton
                  color="secondary"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setRoleFilter('')
                    setStatusFilter('')
                  }}
                >
                  Limpiar filtros
                </CButton>
              </CCol>
            </CRow>

            <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
              <CBadge color="success">Activos: {userSummary.active}</CBadge>
              <CBadge color="secondary">Inactivos: {userSummary.inactive}</CBadge>
              <CBadge color="warning">Pendientes: {userSummary.pending}</CBadge>
              <CBadge color="info">Con email: {userSummary.withEmail}</CBadge>
              <CBadge color="primary">Con área: {userSummary.withArea}</CBadge>
              <CBadge color="dark">Con cargo: {userSummary.withPosition}</CBadge>
            </div>

            <div className="mb-3">
              <div className="small text-body-secondary mb-2">Distribución por rol</div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {roleSummary.map((item) => (
                  <CBadge color="light" textColor="dark" key={item.role}>
                    {item.role}: {item.count}
                  </CBadge>
                ))}
              </div>
            </div>

            <CTable responsive align="middle" hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Email</CTableHeaderCell>
                  <CTableHeaderCell>Rol</CTableHeaderCell>
                  <CTableHeaderCell>Estado</CTableHeaderCell>
                  <CTableHeaderCell>Cargo</CTableHeaderCell>
                  <CTableHeaderCell>Área</CTableHeaderCell>
                  <CTableHeaderCell>Perfil</CTableHeaderCell>
                  <CTableHeaderCell>Observaciones</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>

              <CTableBody>
                {filteredUsers.map((user) => {
                  const completionPercent = getCompletionPercent(user)

                  return (
                    <CTableRow key={user.id}>
                      <CTableDataCell className="fw-semibold">{user.name}</CTableDataCell>
                      <CTableDataCell>{user.email}</CTableDataCell>
                      <CTableDataCell>{user.role}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={getStatusColor(user.status)}>{user.status}</CBadge>
                      </CTableDataCell>
                      <CTableDataCell>{user.position}</CTableDataCell>
                      <CTableDataCell>{user.area}</CTableDataCell>
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
                        {user.observations}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        <CButtonGroup size="sm" role="group" aria-label="Acciones de usuario">
                          <CButton
                            color="primary"
                            variant="outline"
                            type="button"
                            onClick={() => openEditModal(user)}
                          >
                            Editar
                          </CButton>
                          <CButton
                            color="secondary"
                            variant="outline"
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'Activo' ? 'Inactivar' : 'Activar'}
                          </CButton>
                          <CButton
                            color="danger"
                            variant="outline"
                            type="button"
                            onClick={() => handleDelete(user.id)}
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
            <CModalTitle>{editingId ? 'Editar usuario' : 'Nuevo usuario'}</CModalTitle>
          </CModalHeader>

          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="name">Nombre</CFormLabel>
                <CFormInput id="name" name="name" value={formData.name} onChange={handleChange} />
              </CCol>

              <CCol md={6}>
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
                <CFormLabel htmlFor="role">Rol</CFormLabel>
                <CFormSelect id="role" name="role" value={formData.role} onChange={handleChange}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="status">Estado</CFormLabel>
                <CFormSelect
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="area">Área</CFormLabel>
                <CFormSelect id="area" name="area" value={formData.area} onChange={handleChange}>
                  <option value="">Seleccionar área</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="position">Cargo</CFormLabel>
                <CFormInput
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Ej: Ejecutivo comercial, Diseñador, Administrador"
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="customArea">Área personalizada</CFormLabel>
                <CFormInput
                  id="customArea"
                  value={AREA_OPTIONS.includes(formData.area) ? '' : formData.area}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, area: event.target.value }))
                  }
                  placeholder="Usar solo si el área no está en la lista"
                />
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
              Guardar usuario
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Usuarios
