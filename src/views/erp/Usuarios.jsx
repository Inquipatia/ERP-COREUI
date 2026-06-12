import React from 'react'
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { erpRoles, mockUsers } from '../../data/mockUsers'

const Usuarios = () => (
  <CRow>
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Usuarios / Perfiles</strong> <small>Roles mock iniciales</small>
        </CCardHeader>
        <CCardBody>
          <div className="mb-3 text-body-secondary">Roles disponibles: {erpRoles.join(', ')}</div>
          <CTable responsive align="middle" hover>
            <CTableHead color="light">
              <CTableRow>
                <CTableHeaderCell>Nombre</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Rol</CTableHeaderCell>
                <CTableHeaderCell>Estado</CTableHeaderCell>
                <CTableHeaderCell>Cargo</CTableHeaderCell>
                <CTableHeaderCell>Área</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {mockUsers.map((user) => (
                <CTableRow key={user.id}>
                  <CTableDataCell className="fw-semibold">{user.name}</CTableDataCell>
                  <CTableDataCell>{user.email}</CTableDataCell>
                  <CTableDataCell>{user.role}</CTableDataCell>
                  <CTableDataCell>
                    <CBadge color={user.status === 'Activo' ? 'success' : 'secondary'}>
                      {user.status}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>{user.position}</CTableDataCell>
                  <CTableDataCell>{user.area}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </CCol>
  </CRow>
)

export default Usuarios
