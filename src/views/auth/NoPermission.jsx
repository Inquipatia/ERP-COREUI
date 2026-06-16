import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CBadge, CButton, CCard, CCardBody, CCol, CContainer, CRow } from '@coreui/react'
import { useAuth } from '../../context/AuthContext'

const NoPermission = () => {
  const navigate = useNavigate()
  const { currentUser, getDefaultRoute, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={7} lg={6}>
            <CCard>
              <CCardBody className="p-4 text-center">
                <div className="display-6 fw-semibold mb-3">Sin permiso</div>
                <p className="text-body-secondary mb-1">
                  Tu perfil no tiene acceso a esta sección del ERP Rubik.
                </p>

                {currentUser && (
                  <div className="mb-4">
                    <div className="fw-semibold">{currentUser.name}</div>
                    <div className="small text-body-secondary">{currentUser.email}</div>
                    <div className="d-flex justify-content-center gap-2 flex-wrap mt-2">
                      <CBadge color="primary">{currentUser.role}</CBadge>
                      <CBadge color="secondary">{currentUser.area || 'Sin área'}</CBadge>
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <CButton
                    color="primary"
                    type="button"
                    onClick={() => navigate(getDefaultRoute ? getDefaultRoute() : '/erp/dashboard')}
                  >
                    Ir a mi inicio
                  </CButton>
                  <CButton color="secondary" type="button" variant="outline" onClick={handleLogout}>
                    Cerrar sesión
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default NoPermission
