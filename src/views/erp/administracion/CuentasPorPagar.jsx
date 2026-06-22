import React, { useMemo } from 'react'
import { CAlert, CBadge, CCard, CCardBody, CCardHeader, CCol, CRow, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow } from '@coreui/react'
import { useAuth } from '../../../context/AuthContext'
import { formatCurrency, formatDate } from '../../../utils/financeCalculations'
import { useFinanceMovements } from '../../../utils/financeStorage'

const CuentasPorPagar = () => {
  const { hasPermission } = useAuth()
  const canView = hasPermission('finance.view') || hasPermission('admin.all')
  const [movements] = useFinanceMovements()

  const rows = useMemo(
    () =>
      movements.filter(
        (movement) => movement.type === 'Egreso' && (movement.pendingAmount ?? movement.balanceAmount) > 0,
      ),
    [movements],
  )
  const total = useMemo(
    () =>
      rows.reduce(
        (sum, movement) => sum + Number(movement.pendingAmount ?? movement.balanceAmount ?? 0),
        0,
      ),
    [rows],
  )

  if (!canView) return <CAlert color="danger">Tu perfil no tiene permiso para ver cuentas por pagar.</CAlert>

  return (
    <CRow className="g-4">
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">Total por pagar</div><div className="fs-3 fw-semibold">{formatCurrency(total)}</div></CCardBody></CCard></CCol>
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">Documentos abiertos</div><div className="fs-3 fw-semibold">{rows.length}</div></CCardBody></CCard></CCol>
      <CCol md={4}><CCard><CCardBody><div className="text-body-secondary small">Vencidos</div><div className="fs-3 fw-semibold">{rows.filter((row) => row.status === 'Vencido').length}</div></CCardBody></CCard></CCol>
      <CCol xs={12}>
        <CCard>
          <CCardHeader><strong>Cuentas por pagar</strong> <small>egresos pendientes de pago</small></CCardHeader>
          <CCardBody>
            <CTable responsive hover align="middle">
              <CTableHead color="light"><CTableRow><CTableHeaderCell>Proveedor</CTableHeaderCell><CTableHeaderCell>Documento</CTableHeaderCell><CTableHeaderCell>Descripción</CTableHeaderCell><CTableHeaderCell>Vencimiento</CTableHeaderCell><CTableHeaderCell>Saldo</CTableHeaderCell><CTableHeaderCell>Estado</CTableHeaderCell></CTableRow></CTableHead>
              <CTableBody>
                {rows.map((row) => <CTableRow key={row.id}><CTableDataCell>{row.clientSupplierName || '-'}</CTableDataCell><CTableDataCell>{row.documentNumber || '-'}</CTableDataCell><CTableDataCell>{row.description}</CTableDataCell><CTableDataCell>{formatDate(row.dueDate)}</CTableDataCell><CTableDataCell className="fw-semibold">{formatCurrency(row.pendingAmount ?? row.balanceAmount)}</CTableDataCell><CTableDataCell><CBadge color={row.status === 'Vencido' ? 'danger' : 'warning'}>{row.status}</CBadge></CTableDataCell></CTableRow>)}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CuentasPorPagar
