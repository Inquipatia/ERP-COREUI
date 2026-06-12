import React, { useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { rubikCommercialSettings, rubikCompany } from '../../data/rubikCompany'
import { STORAGE_KEYS, useLocalStorageState } from '../../utils/storage'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const normalizeSettings = (settings) => ({
  ivaRate: Number(settings.ivaRate) || 19,
  generalMargin: Number(settings.generalMargin) || 0,
  tenderMargin: Number(settings.tenderMargin) || 0,
  graphicWaste: Number(settings.graphicWaste) || 0,
  rigidWaste: Number(settings.rigidWaste) || 0,
  baseDispatch: Number(settings.baseDispatch) || 0,
  installationHourValue: Number(settings.installationHourValue) || 0,
})

const companyRows = [
  ['Razón social', rubikCompany.businessName],
  ['RUT', rubikCompany.rut],
  ['Teléfono', rubikCompany.phone],
  ['Email', rubikCompany.email],
  ['Dirección', rubikCompany.address],
]

const ConfiguracionRubik = () => {
  const [settings, setSettings] = useLocalStorageState(
    STORAGE_KEYS.commercialSettings,
    normalizeSettings(rubikCommercialSettings),
  )
  const [formData, setFormData] = useState(() => normalizeSettings(settings))
  const [message, setMessage] = useState('')

  const commercialRows = [
    ['IVA', `${settings.ivaRate}%`],
    ['Margen general', `${settings.generalMargin}%`],
    ['Margen licitación', `${settings.tenderMargin}%`],
    ['Merma gráfica', `${settings.graphicWaste}%`],
    ['Merma rígidos', `${settings.rigidWaste}%`],
    ['Despacho base', formatCurrency(settings.baseDispatch)],
    ['Valor hora instalación', formatCurrency(settings.installationHourValue)],
  ]

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextSettings = normalizeSettings(formData)
    setSettings(nextSettings)
    setFormData(nextSettings)
    setMessage('Variables comerciales guardadas localmente.')
  }

  return (
    <CRow className="g-4">
      <CCol lg={5}>
        <CCard className="h-100">
          <CCardHeader>
            <strong>Configuración Rubik</strong> <small>Datos empresa</small>
          </CCardHeader>
          <CCardBody>
            <CTable responsive>
              <CTableBody>
                {companyRows.map(([label, value]) => (
                  <CTableRow key={label}>
                    <CTableHeaderCell scope="row" style={{ width: '35%' }}>
                      {label}
                    </CTableHeaderCell>
                    <CTableDataCell>{value}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={7}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Variables comerciales</strong>
          </CCardHeader>
          <CCardBody>
            {message && (
              <CAlert color="success" dismissible onClose={() => setMessage('')}>
                {message}
              </CAlert>
            )}
            <CForm onSubmit={handleSubmit}>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="ivaRate">IVA %</CFormLabel>
                  <CFormInput
                    id="ivaRate"
                    name="ivaRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ivaRate}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="generalMargin">Margen general %</CFormLabel>
                  <CFormInput
                    id="generalMargin"
                    name="generalMargin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.generalMargin}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="tenderMargin">Margen licitación %</CFormLabel>
                  <CFormInput
                    id="tenderMargin"
                    name="tenderMargin"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tenderMargin}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="graphicWaste">Merma gráfica %</CFormLabel>
                  <CFormInput
                    id="graphicWaste"
                    name="graphicWaste"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.graphicWaste}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="rigidWaste">Merma rígidos %</CFormLabel>
                  <CFormInput
                    id="rigidWaste"
                    name="rigidWaste"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rigidWaste}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="baseDispatch">Despacho base</CFormLabel>
                  <CFormInput
                    id="baseDispatch"
                    name="baseDispatch"
                    type="number"
                    min="0"
                    value={formData.baseDispatch}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="installationHourValue">Valor hora instalación</CFormLabel>
                  <CFormInput
                    id="installationHourValue"
                    name="installationHourValue"
                    type="number"
                    min="0"
                    value={formData.installationHourValue}
                    onChange={handleChange}
                  />
                </CCol>
                <CCol xs={12} className="text-end">
                  <CButton color="primary" type="submit">
                    Guardar configuración
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader>
            <strong>Valores actuales</strong>
          </CCardHeader>
          <CCardBody>
            <CTable responsive hover>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Variable</CTableHeaderCell>
                  <CTableHeaderCell>Valor actual</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {commercialRows.map(([label, value]) => (
                  <CTableRow key={label}>
                    <CTableDataCell className="fw-semibold">{label}</CTableDataCell>
                    <CTableDataCell>{value}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ConfiguracionRubik
