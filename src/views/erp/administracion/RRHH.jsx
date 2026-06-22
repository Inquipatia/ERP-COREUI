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
import { formatCurrency, validateRut } from '../../../utils/financeCalculations'
import {
  CONTRACT_TYPES,
  EMPLOYEE_STATUSES,
  emptyEmployee,
  employeeMatchesSearch,
  HR_AREAS,
  normalizeEmployee,
  useEmployees,
} from '../../../utils/hrStorage'

const getStatusColor = (status) => {
  if (status === 'Activo') return 'success'
  if (status === 'Licencia' || status === 'Vacaciones') return 'warning'
  if (status === 'Finiquitado') return 'danger'
  return 'secondary'
}

const RRHH = () => {
  const { hasPermission } = useAuth()
  const canView = hasPermission('hr.view') || hasPermission('finance.view') || hasPermission('admin.all')
  const canManage = hasPermission('hr.manage') || hasPermission('finance.manage') || hasPermission('admin.all')
  const [employees, setEmployees] = useEmployees()
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyEmployee)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const filteredEmployees = useMemo(
    () => employees.filter((employee) => employeeMatchesSearch(employee, search)),
    [employees, search],
  )

  const summary = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((employee) => employee.status === 'Activo').length,
      inactive: employees.filter((employee) => employee.status !== 'Activo').length,
    }),
    [employees],
  )

  const openCreateModal = () => {
    if (!canManage) {
      setMessage('Tu perfil no permite crear trabajadores.')
      return
    }
    setEditingId(null)
    setFormData(emptyEmployee)
    setError('')
    setVisible(true)
  }

  const openEditModal = (employee) => {
    if (!canManage) {
      setMessage('Tu perfil no permite editar trabajadores.')
      return
    }
    setEditingId(employee.id)
    setFormData(normalizeEmployee(employee))
    setError('')
    setVisible(true)
  }

  const closeModal = () => {
    setVisible(false)
    setEditingId(null)
    setFormData(emptyEmployee)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canManage) {
      setError('Tu perfil no permite guardar trabajadores.')
      return
    }
    if (!formData.name.trim()) {
      setError('Ingresa nombre del trabajador.')
      return
    }
    if (formData.rut && !validateRut(formData.rut)) {
      setError('El RUT del trabajador no parece válido. Puedes dejarlo vacío si aún no lo tienes.')
      return
    }

    const payload = normalizeEmployee({
      ...formData,
      id: editingId || undefined,
      updatedAt: new Date().toISOString(),
    })

    setEmployees((currentEmployees) => {
      if (editingId) {
        return currentEmployees.map((employee) => (employee.id === editingId ? payload : employee))
      }
      return [payload, ...currentEmployees]
    })

    setMessage(editingId ? 'Ficha de trabajador actualizada.' : 'Trabajador creado.')
    closeModal()
  }

  const handleDelete = (employeeId) => {
    if (!canManage) {
      setMessage('Tu perfil no permite eliminar trabajadores.')
      return
    }
    setEmployees((currentEmployees) => currentEmployees.filter((employee) => employee.id !== employeeId))
    setMessage('Trabajador eliminado localmente.')
  }

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver RRHH.</CAlert>

  return (
    <CRow className="g-4">
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">Trabajadores</div><div className="fs-3 fw-semibold">{summary.total}</div></CCardBody></CCard></CCol>
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">Activos</div><div className="fs-3 fw-semibold">{summary.active}</div></CCardBody></CCard></CCol>
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">No activos</div><div className="fs-3 fw-semibold">{summary.inactive}</div></CCardBody></CCard></CCol>

      <CCol xs={12}>
        <CCard>
          <CCardHeader className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div><strong>RRHH</strong> <small>fichas internas, cargos, contratos y montos base</small></div>
            <div className="d-flex gap-2 flex-wrap"><CBadge color="primary">{filteredEmployees.length} fichas</CBadge>{canManage && <CButton color="primary" onClick={openCreateModal}>Nuevo trabajador</CButton>}</div>
          </CCardHeader>
          <CCardBody>
            {message && <CAlert color="success" dismissible onClose={() => setMessage('')}>{message}</CAlert>}
            <CAlert color="warning">Los cálculos de remuneración son internos y estimativos. Las tasas legales deben validarse y/o cargarse según la configuración vigente de la empresa.</CAlert>
            <CFormLabel>Búsqueda</CFormLabel>
            <CFormInput className="mb-3" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, RUT, cargo, área o estado" />
            <CTable responsive hover align="middle">
              <CTableHead color="light"><CTableRow><CTableHeaderCell>Trabajador</CTableHeaderCell><CTableHeaderCell>Cargo / área</CTableHeaderCell><CTableHeaderCell>Contrato</CTableHeaderCell><CTableHeaderCell>Sueldo base</CTableHeaderCell><CTableHeaderCell>Contacto</CTableHeaderCell><CTableHeaderCell>Estado</CTableHeaderCell><CTableHeaderCell className="text-end">Acciones</CTableHeaderCell></CTableRow></CTableHead>
              <CTableBody>
                {filteredEmployees.map((employee) => (
                  <CTableRow key={employee.id}>
                    <CTableDataCell><div className="fw-semibold">{employee.name}</div><div className="small text-body-secondary">{employee.rut || '-'}</div></CTableDataCell>
                    <CTableDataCell>{employee.position || '-'}<div className="small text-body-secondary">{employee.area}</div></CTableDataCell>
                    <CTableDataCell>{employee.contractType}<div className="small text-body-secondary">Ingreso {employee.startDate || '-'}</div></CTableDataCell>
                    <CTableDataCell>{formatCurrency(employee.baseSalary)}</CTableDataCell>
                    <CTableDataCell>{employee.email || '-'}<div className="small text-body-secondary">{employee.phone || '-'}</div></CTableDataCell>
                    <CTableDataCell><CBadge color={getStatusColor(employee.status)}>{employee.status}</CBadge></CTableDataCell>
                    <CTableDataCell className="text-end"><CButtonGroup size="sm">{canManage && <CButton color="secondary" variant="outline" onClick={() => openEditModal(employee)}>Editar</CButton>}{canManage && <CButton color="danger" variant="outline" onClick={() => handleDelete(employee.id)}>Eliminar</CButton>}</CButtonGroup></CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={closeModal} size="xl">
        <CForm onSubmit={handleSubmit}>
          <CModalHeader><CModalTitle>{editingId ? 'Editar ficha trabajador' : 'Nuevo trabajador'}</CModalTitle></CModalHeader>
          <CModalBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            <CRow className="g-3">
              <CCol md={5}><CFormLabel>Nombre completo</CFormLabel><CFormInput name="name" value={formData.name} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>RUT</CFormLabel><CFormInput name="rut" value={formData.rut} onChange={handleChange} /></CCol>
              <CCol md={4}><CFormLabel>Email</CFormLabel><CFormInput name="email" value={formData.email} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Teléfono</CFormLabel><CFormInput name="phone" value={formData.phone} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Cargo</CFormLabel><CFormInput name="position" value={formData.position} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Área</CFormLabel><CFormSelect name="area" value={formData.area} onChange={handleChange}>{HR_AREAS.map((area) => <option key={area}>{area}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Tipo contrato</CFormLabel><CFormSelect name="contractType" value={formData.contractType} onChange={handleChange}>{CONTRACT_TYPES.map((type) => <option key={type}>{type}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Fecha ingreso</CFormLabel><CFormInput type="date" name="startDate" value={formData.startDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Fecha término</CFormLabel><CFormInput type="date" name="endDate" value={formData.endDate} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Estado</CFormLabel><CFormSelect name="status" value={formData.status} onChange={handleChange}>{EMPLOYEE_STATUSES.map((status) => <option key={status}>{status}</option>)}</CFormSelect></CCol>
              <CCol md={3}><CFormLabel>Sueldo base</CFormLabel><CFormInput type="number" name="baseSalary" value={formData.baseSalary} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>AFP monto estimado</CFormLabel><CFormInput type="number" name="afpAmount" value={formData.afpAmount} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Salud monto estimado</CFormLabel><CFormInput type="number" name="healthAmount" value={formData.healthAmount} onChange={handleChange} /></CCol>
              <CCol md={3}><CFormLabel>Seguro cesantía</CFormLabel><CFormInput type="number" name="unemploymentInsurance" value={formData.unemploymentInsurance} onChange={handleChange} /></CCol>
              <CCol md={6}><CFormLabel>Contacto emergencia</CFormLabel><CFormInput name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} /></CCol>
              <CCol md={6}><CFormLabel>Documentos asociados</CFormLabel><CFormInput name="documentNames" value={formData.documentNames} onChange={handleChange} placeholder="Contrato, anexos, documentos internos" /></CCol>
              <CCol xs={12}><CFormLabel>Observaciones</CFormLabel><CFormTextarea rows={3} name="notes" value={formData.notes} onChange={handleChange} /></CCol>
            </CRow>
          </CModalBody>
          <CModalFooter><CButton color="secondary" variant="outline" onClick={closeModal}>Cancelar</CButton><CButton color="primary" type="submit">Guardar</CButton></CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default RRHH
