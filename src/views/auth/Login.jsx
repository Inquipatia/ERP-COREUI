import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { useAuth } from '../../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, login } = useAuth()
  const [email, setEmail] = useState('rsepulveda@rubikcreaciones.cl')
  const [password, setPassword] = useState('123456')
  const [error, setError] = useState('')

  const redirectTo = location.state?.from?.pathname || '/erp/dashboard'

  useEffect(() => {
    if (currentUser) {
      navigate(redirectTo, { replace: true })
    }
  }, [currentUser, navigate, redirectTo])

  const handleSubmit = (event) => {
    event.preventDefault()
    const result = login({ email, password })

    if (!result.ok) {
      setError(result.error)
      return
    }

    setError('')
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8} lg={7}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>ERP Rubik</h1>
                    <p className="text-body-secondary mb-4">Ingreso interno desarrollo local</p>

                    {error && <CAlert color="danger">{error}</CAlert>}

                    <CFormLabel htmlFor="loginEmail">Email</CFormLabel>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        id="loginEmail"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </CInputGroup>

                    <CFormLabel htmlFor="loginPassword">Contraseña</CFormLabel>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        id="loginPassword"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </CInputGroup>

                    <CButton color="primary" type="submit" className="w-100">
                      Iniciar sesión
                    </CButton>
                  </CForm>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5 d-none d-md-flex" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <h2>Rubik Creaciones</h2>
                  <p className="mb-0">
                    MVP local con usuarios, roles y permisos. La contraseña temporal de desarrollo
                    es 123456.
                  </p>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
