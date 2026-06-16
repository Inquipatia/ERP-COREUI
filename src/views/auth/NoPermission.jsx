import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCol, CContainer, CRow } from '@coreui/react'
import { useAuth } from '../../context/AuthContext'

const NoPermission = () => {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

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
                  <p className="text-body-secondary mb-4">
                    {currentUser.name} · {currentUser.role} · {currentUser.area}
                  </p>
                )}
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <CButton color="primary" type="button" onClick={() => navigate('/erp/dashboard')}>
                    Ir al dashboard
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
