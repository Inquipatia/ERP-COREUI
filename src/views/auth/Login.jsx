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
import { getDefaultRouteForUser } from '../../utils/authStorage'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requestedPath = location.state?.from?.pathname

  useEffect(() => {
    if (currentUser) {
      navigate(requestedPath || getDefaultRouteForUser(currentUser), { replace: true })
    }
  }, [currentUser, navigate, requestedPath])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = await login({ email, password })

      if (!result.ok) {
        setError(result.error)
        return
      }

      navigate(requestedPath || getDefaultRouteForUser(result.user), { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={8} xl={7}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h1>ERP Rubik</h1>
                    <p className="text-body-secondary mb-4">
                      Acceso interno con roles, permisos y datos por perfil.
                    </p>

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

                    <CButton color="primary" type="submit" className="w-100" disabled={isSubmitting}>
                      {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </CButton>
                  </CForm>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5 d-none d-md-flex" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <h2>Rubik Creaciones</h2>
                  <p className="mb-0">
                    Acceso protegido para usuarios autorizados del ERP Rubik.
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
