import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChatBubble, cilX } from '@coreui/icons'

import AsistenteIA from '../views/erp/asistente/AsistenteIA'
import { useAuth } from '../context/AuthContext'

const AssistantFloatingChat = () => {
  const { currentUser, hasPermission } = useAuth()
  const [open, setOpen] = useState(false)

  if (!currentUser || !hasPermission('ai.chat')) {
    return null
  }

  return (
    <>
      {!open && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            zIndex: 2000,
          }}
        >
          <CButton
            color="primary"
            shape="rounded-pill"
            className="shadow-lg d-flex align-items-center gap-2 px-4 py-3"
            onClick={() => setOpen(true)}
          >
            <CIcon icon={cilChatBubble} />
            Asistente IA
          </CButton>
        </div>
      )}

      {open && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            width: '520px',
            maxWidth: 'calc(100vw - 32px)',
            height: '680px',
            maxHeight: 'calc(100vh - 48px)',
            zIndex: 2000,
          }}
        >
          <CCard className="shadow-lg border-0 h-100">
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div>
                <strong>Asistente IA Rubik</strong>
                <div className="small text-body-secondary">Disponible en todo el ERP</div>
              </div>

              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
              >
                <CIcon icon={cilX} />
              </CButton>
            </CCardHeader>

            <CCardBody
              style={{
                overflowY: 'auto',
                padding: '1rem',
              }}
            >
              <AsistenteIA />
            </CCardBody>
          </CCard>
        </div>
      )}
    </>
  )
}

export default AssistantFloatingChat