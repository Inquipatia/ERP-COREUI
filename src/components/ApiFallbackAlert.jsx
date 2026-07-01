import React, { useEffect, useState } from 'react'
import { CAlert } from '@coreui/react'
import { API_FALLBACK_EVENT, API_FALLBACK_MESSAGE } from '../utils/storage'

const ApiFallbackAlert = () => {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleApiFallback = (event) => {
      setMessage(event.detail?.message || API_FALLBACK_MESSAGE)
    }

    window.addEventListener(API_FALLBACK_EVENT, handleApiFallback)
    return () => window.removeEventListener(API_FALLBACK_EVENT, handleApiFallback)
  }, [])

  if (!message) return null

  return (
    <div className="px-3 pt-3">
      <CAlert color="warning" dismissible className="mb-0" onClose={() => setMessage('')}>
        {message}
      </CAlert>
    </div>
  )
}

export default ApiFallbackAlert
