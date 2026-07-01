import { downloadFile } from './apiClient'

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const getSafePart = (value = 'sin-numero') =>
  String(value || 'sin-numero')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')

const getPayloadQuoteNumber = (payload = {}) =>
  payload.quoteNumber ||
  payload.numeroDocumento ||
  payload.documentNumber ||
  payload.quote?.quoteNumber ||
  payload.quoteData?.quoteNumber ||
  'sin-numero'

export const exportQuotePayloadPdf = (payload) =>
  downloadFile('/export/pdf', {
    auth: true,
    body: payload,
    defaultFileName: `cotizacion-${getSafePart(getPayloadQuoteNumber(payload))}.pdf`,
    expectedContentType: 'application/pdf',
    method: 'POST',
  })

export const exportQuotePayloadExcel = (payload) =>
  downloadFile('/export/excel', {
    auth: true,
    body: payload,
    defaultFileName: `cotizacion-${getSafePart(getPayloadQuoteNumber(payload))}.xlsx`,
    expectedContentType: EXCEL_CONTENT_TYPE,
    method: 'POST',
  })

export const downloadDocumentPdf = (id, fileName = '') =>
  downloadFile(`/export/documents/${encodeURIComponent(id)}/pdf`, {
    defaultFileName: fileName || `documento-${getSafePart(id)}.pdf`,
    expectedContentType: 'application/pdf',
  })

export const downloadDocumentExcel = (id, fileName = '') =>
  downloadFile(`/export/documents/${encodeURIComponent(id)}/excel`, {
    defaultFileName: fileName || `documento-${getSafePart(id)}.xlsx`,
    expectedContentType: EXCEL_CONTENT_TYPE,
  })

export const downloadQuotePdf = (id, fileName = '') =>
  downloadFile(`/export/quotes/${encodeURIComponent(id)}/pdf`, {
    defaultFileName: fileName || `cotizacion-${getSafePart(id)}.pdf`,
    expectedContentType: 'application/pdf',
  })

export const downloadQuoteExcel = (id, fileName = '') =>
  downloadFile(`/export/quotes/${encodeURIComponent(id)}/excel`, {
    defaultFileName: fileName || `cotizacion-${getSafePart(id)}.xlsx`,
    expectedContentType: EXCEL_CONTENT_TYPE,
  })

export default {
  downloadDocumentExcel,
  downloadDocumentPdf,
  downloadQuoteExcel,
  downloadQuotePdf,
  exportQuotePayloadExcel,
  exportQuotePayloadPdf,
}
