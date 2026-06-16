import { createLocalId, STORAGE_KEYS } from './storage'

export const TENDER_STORAGE_KEY = STORAGE_KEYS.tenders || 'rubik.erp.tenders'

export const TENDER_STATUSES = [
  'Borrador',
  'En análisis',
  'Consultas',
  'Cotizando',
  'Lista para ofertar',
  'Postulada',
  'Adjudicada',
  'Perdida',
  'Descartada',
]

export const TENDER_RISK_LEVELS = ['Bajo', 'Medio', 'Alto', 'Crítico']

export const emptyTender = {
  id: '',
  tenderId: '',
  title: '',
  buyer: '',
  buyerRut: '',
  budget: 0,
  closingDate: '',
  closingTime: '',
  openingDate: '',
  openingTime: '',
  adjudicationDate: '',
  adjudicationTime: '',
  contractSignDate: '',
  questionsDeadline: '',
  answersDate: '',
  status: 'En análisis',
  riskLevel: 'Medio',
  summary: '',
  objectOfContract: '',
  administrativeRequirements: [],
  technicalRequirements: [],
  economicRequirements: [],
  requiredDocuments: [],
  essentialDocuments: [],
  evaluationCriteria: [],
  guarantees: [],
  paymentTerms: [],
  penalties: [],
  technicalItems: [],
  suggestedQuestions: [],
  risks: [],
  observations: '',
  sourceText: '',
  sourceDocuments: [],
  fieldSources: {},
  documentDiagnostics: [],
  globalWarnings: [],
  createdBy: null,
  analyzedBy: null,
  createdAt: '',
  updatedAt: '',
}

const MODIFIED_SCHEDULE_PATTERN = /modific|nuevo|actualiz|rectific|aclaraci[oó]n|corregid/i
const SOURCE_MARKER_PATTERN = /^---\s+.+\|\s+p[áa]gina\s+\d+\s+---$/i

const MONTHS = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
}

const FIELD_LABEL_SOURCES = [
  'id\\s*(?:de\\s+)?licitaci[oó]n',
  'c[oó]digo\\s*(?:de\\s+)?licitaci[oó]n',
  'nombre\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
  't[ií]tulo\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
  'comprador',
  'mandante',
  'organismo\\s+comprador',
  'entidad\\s+licitante',
  'objeto\\s*de\\s+contrataci[oó]n',
  'objeto\\s*(?:de\\s+la\\s+contrataci[oó]n|de\\s+licitaci[oó]n)?',
  'descripci[oó]n\\s+de\\s+licitaci[oó]n',
  'descripci[oó]n\\s*(?:de\\s+la\\s+contrataci[oó]n)?',
  'presupuesto\\s*(?:disponible|estimado|referencial)?',
  'monto\\s*(?:total\\s+)?(?:disponible|estimado|referencial)',
  'fecha\\s+de\\s+cierre',
  'cierre\\s+de\\s+ofertas',
  'recepci[oó]n\\s+de\\s+ofertas',
  'apertura\\s*(?:t[eé]cnica|econ[oó]mica|de\\s+ofertas)?',
  'fecha\\s+de\\s+apertura',
  'fecha\\s+de\\s+adjudicaci[oó]n',
  'adjudicaci[oó]n',
  'firma\\s+de\\s+contrato',
  'suscripci[oó]n\\s+del\\s+contrato',
  'fecha\\s+l[ií]mite\\s+de\\s+contrato',
  'documentos?\\s+(?:administrativos?|t[eé]cnicos?|econ[oó]micos?|obligatorios?|esenciales?)',
  'antecedentes?\\s+(?:administrativos?|t[eé]cnicos?|econ[oó]micos?)',
  'requisitos?\\s+(?:administrativos?|t[eé]cnicos?|econ[oó]micos?)',
  'criterios?\\s+de\\s+evaluaci[oó]n',
  'garant[ií]as?',
  'forma\\s+de\\s+pago',
  'multas?',
  'sanciones?',
  '[ií]tems?',
]

const ensureList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value || '')
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const cleanText = (value) =>
  String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const cleanInline = (value) =>
  cleanText(value)
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,\-.–—]+/, '')
    .replace(/[\s:;,\-.–—]+$/, '')
    .trim()

const normalizeForSearch = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const stripSourceMarkers = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .filter((line) => !SOURCE_MARKER_PATTERN.test(line.trim()))
    .join('\n')

const addSyntheticBreaks = (text) =>
  stripSourceMarkers(text)
    .replace(/\s+(?=(?:ID|Código|Codigo)\s+(?:de\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(/\s+(?=(?:Nombre|Título|Titulo)\s+(?:de\s+la\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(/\s+(?=(?:Comprador|Mandante|Organismo|Entidad)\b)/gi, '\n')
    .replace(
      /\s+(?=(?:Objeto|Descripción|Descripcion)\s+(?:de\s+la\s+)?(?:Contrataci[oó]n|Licitaci[oó]n)?\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Presupuesto|Monto|Valor)\s+(?:total\s+)?(?:disponible|estimado|referencial)?\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Fecha\s+de\s+Cierre|Cierre\s+de\s+Ofertas|Recepci[oó]n\s+de\s+Ofertas)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Apertura|Fecha\s+de\s+Apertura|Fecha\s+de\s+Adjudicaci[oó]n|Adjudicaci[oó]n|Firma\s+de\s+Contrato|Suscripci[oó]n\s+del\s+Contrato)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Documentos?|Antecedentes?|Requisitos?|Anexos?|Formulario|Declaraci[oó]n|Certificado)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Criterios?|Evaluaci[oó]n|Ponderaci[oó]n|Garant[ií]a|Forma\s+de\s+Pago|Pago\s*:|Multa|Sanci[oó]n|Penalidad)\b)/gi,
      '\n',
    )
    .replace(/\s+(?=(?:[ÍI]tem|Item|Partida|Servicio|Producto)\b)/gi, '\n')
    .replace(/\s+(?=\d{1,2}[.)]\s+)/g, '\n')
    .replace(/\s+(?=[a-z]\)\s+)/gi, '\n')

const getLines = (text) =>
  addSyntheticBreaks(text)
    .split(/\r?\n/)
    .map((line) => cleanInline(line))
    .filter(Boolean)

const getChunks = (text) =>
  getLines(text)
    .flatMap((line) =>
      line.length > 280
        ? line
            .split(
              /(?<=[.;:])\s+|(?=\b(?:Anexo|Formulario|Documento|Certificado|Declaraci[oó]n|Criterio|Garant[ií]a|Multa|Pago|Ítem|Item)\b)/i,
            )
            .map(cleanInline)
        : [line],
    )
    .filter(Boolean)

const limitValue = (value, maxLength = 220) => {
  const cleaned = cleanInline(value)

  if (cleaned.length <= maxLength) return cleaned

  const truncated = cleaned.slice(0, maxLength)
  const lastBreak = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('; '),
    truncated.lastIndexOf(', '),
  )

  return cleanInline(truncated.slice(0, lastBreak > 80 ? lastBreak : maxLength))
}

const findFirstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern)

    if (match?.[1]) {
      return cleanInline(match[1])
    }
  }

  return ''
}

const extractAfterLabel = (text, labelSources, maxLength = 220) => {
  const flatText = addSyntheticBreaks(text).replace(/\s+/g, ' ')

  for (const labelSource of labelSources) {
    const labelRegex = new RegExp(`(?:${labelSource})\\s*(?::|-|–|—)?\\s*`, 'i')
    const match = flatText.match(labelRegex)

    if (!match) continue

    const valueStart = (match.index || 0) + match[0].length
    let value = flatText.slice(valueStart)
    const stopIndexes = FIELD_LABEL_SOURCES.map((source) => {
      const stopMatch = value.match(new RegExp(`\\b(?:${source})\\b\\s*(?::|-|–|—)?`, 'i'))
      return stopMatch?.index ?? -1
    }).filter((index) => index > 0)
    const stopIndex = stopIndexes.length > 0 ? Math.min(...stopIndexes) : -1

    if (stopIndex > 0) {
      value = value.slice(0, stopIndex)
    }

    const cleaned = limitValue(value, maxLength)

    if (cleaned && !new RegExp(`^(?:${labelSource})$`, 'i').test(cleaned)) {
      return cleaned
    }
  }

  return ''
}

const normalizeDate = (value) => {
  if (!value) return ''

  const dateText = String(value)
  const numericMatch = dateText.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)

  if (numericMatch) {
    const [, day, month, year] = numericMatch
    const normalizedYear = year.length === 2 ? `20${year}` : year

    return `${normalizedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const monthMatch = normalizeForSearch(dateText).match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/,
  )

  if (!monthMatch) return ''

  const [, day, monthName, year] = monthMatch

  return `${year}-${MONTHS[monthName]}-${String(day).padStart(2, '0')}`
}

const extractDateByLabels = (text, labelPatterns) => {
  const datePattern =
    /(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})/i
  const chunks = getChunks(text)
  const candidates = []

  chunks.forEach((chunk, index) => {
    const normalizedChunk = normalizeForSearch(chunk)

    if (!labelPatterns.some((pattern) => pattern.test(normalizedChunk))) return

    const dateMatch = chunk.match(datePattern) || chunks[index + 1]?.match(datePattern)

    if (!dateMatch?.[0]) return

    const context = [chunks[index - 2], chunks[index - 1], chunk, chunks[index + 1]]
      .filter(Boolean)
      .join(' ')

    candidates.push({
      value: dateMatch[0],
      modified: MODIFIED_SCHEDULE_PATTERN.test(context),
    })
  })

  const modifiedCandidate = candidates.find((candidate) => candidate.modified)
  const candidate = modifiedCandidate || candidates[0]

  return normalizeDate(candidate?.value || '')
}

const extractBudget = (text) => {
  const budgetText = extractAfterLabel(
    text,
    [
      'presupuesto\\s*(?:disponible|estimado|referencial)?',
      'monto\\s*(?:total\\s+)?(?:disponible|estimado|referencial)',
      'valor\\s*(?:estimado|referencial)',
    ],
    120,
  )
  const match =
    budgetText.match(/(?:\$|clp)?\s*([\d.]{4,}(?:,\d+)?)/i) ||
    String(text || '').match(
      /(?:presupuesto|monto\s+(?:total\s+)?disponible|monto\s+estimado|valor\s+estimado|presupuesto\s+referencial)[^\d$]{0,80}(?:\$|clp)?\s*([\d.]{4,}(?:,\d+)?)/i,
    )

  if (!match?.[1]) return 0

  return Number(match[1].replace(/[^\d]/g, '')) || 0
}

const extractTitle = (text) => {
  const labeledTitle = extractAfterLabel(
    text,
    [
      'nombre\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
      't[ií]tulo\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
      'denominaci[oó]n\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
    ],
    180,
  )

  if (labeledTitle && !/\d{3,8}-\d{1,3}-[A-Z0-9]{2,4}\d*/i.test(labeledTitle)) {
    return labeledTitle
  }

  const flatText = addSyntheticBreaks(text).replace(/\s+/g, ' ')
  const phraseMatch = flatText.match(
    /\b((?:ARRIENDO|ADQUISICI[OÓ]N|SERVICIO|SERVICIOS|SUMINISTRO|CONTRATACI[OÓ]N|PRODUCCI[OÓ]N|INSTALACI[OÓ]N|HABILITACI[OÓ]N|MANTENCI[OÓ]N)[A-ZÁÉÍÓÚÑ0-9\s/,\-.]{10,140}?)(?=\s+(?:ID|C[ÓO]DIGO|COMPRADOR|MANDANTE|OBJETO|DESCRIPCI[ÓO]N|PRESUPUESTO|FECHA|BASES|DOCUMENTOS?|CRITERIOS?|GARANT[ÍI]A|FORMA\s+DE\s+PAGO|MULTA)|$)/i,
  )

  if (phraseMatch?.[1]) {
    return limitValue(phraseMatch[1], 160)
  }

  const titleCandidate = getChunks(text).find((chunk) => {
    const normalizedChunk = normalizeForSearch(chunk)
    const hasTenderKeyword =
      /(arriendo|adquisicion|servicio|suministro|contratacion|produccion|instalacion|feria|stand|stands|licitacion)/i.test(
        normalizedChunk,
      )

    return (
      hasTenderKeyword &&
      chunk.length >= 12 &&
      chunk.length <= 180 &&
      !/(fecha|presupuesto|comprador|garant[ií]a|multa|criterio|documento|anexo)/i.test(chunk)
    )
  })

  return titleCandidate || ''
}

const extractBuyer = (text) => {
  const buyer = extractAfterLabel(
    text,
    [
      'comprador',
      'organismo\\s+comprador',
      'mandante',
      'entidad\\s+licitante',
      'instituci[oó]n\\s+compradora',
      'raz[oó]n\\s+social\\s+comprador',
    ],
    160,
  )

  if (buyer) return buyer

  return findFirstMatch(text, [
    /\b(Fondo\s+de\s+Agua\s+de\s+Santiago)\b/i,
    /\b((?:ilustre\s+)?municipalidad\s+de\s+[^.;\n]{3,80})/i,
    /\b((?:fondo|fundaci[oó]n|corporaci[oó]n|universidad|ministerio|subsecretar[ií]a|direcci[oó]n|servicio|gobierno|hospital|instituto|centro)\s+[^.;\n]{3,90})/i,
  ])
}

const extractObjectOfContract = (text, title) => {
  const objectOfContract =
    extractAfterLabel(
      text,
      [
        'objeto\\s*de\\s+la\\s+contrataci[oó]n',
        'objeto\\s*de\\s+contrataci[oó]n',
        'objeto\\s*de\\s+licitaci[oó]n',
        'objeto',
        'descripci[oó]n\\s+de\\s+licitaci[oó]n',
        'descripci[oó]n\\s+de\\s+la\\s+contrataci[oó]n',
        'descripci[oó]n',
      ],
      360,
    ) ||
    findFirstMatch(text, [
      /(?:contrataci[oó]n\s+de|adquisici[oó]n\s+de|servicio\s+de|arriendo\s+de)\s+([^.;\n]{8,220})/i,
    ])

  if (objectOfContract) {
    return cleanInline(
      objectOfContract.replace(
        /^de\s+(?:la\s+)?(?:contrataci[oó?]n|licitaci[oó?]n)\s*[:\-–—]?\s*/i,
        '',
      ),
    )
  }

  return /(arriendo|adquisici[oó]n|servicio|suministro|contrataci[oó]n|producci[oó]n|instalaci[oó]n)/i.test(
    title,
  )
    ? title
    : ''
}

const extractSectionLines = (text, keywords, fallbackLimit = 8) => {
  const chunks = getChunks(text)
  const normalizedKeywords = keywords.map(normalizeForSearch)
  const matches = []

  chunks.forEach((chunk, index) => {
    const normalizedChunk = normalizeForSearch(chunk)

    if (!normalizedKeywords.some((keyword) => normalizedChunk.includes(keyword))) {
      return
    }

    matches.push(limitValue(chunk, 320))

    chunks.slice(index + 1, index + 1 + fallbackLimit).forEach((nextChunk) => {
      const normalizedNextChunk = normalizeForSearch(nextChunk)
      const startsNewMajorSection = FIELD_LABEL_SOURCES.some((source) =>
        new RegExp(`^(?:${source})\\b`, 'i').test(nextChunk),
      )

      if (
        startsNewMajorSection &&
        !normalizedKeywords.some((keyword) => normalizedNextChunk.includes(keyword))
      ) {
        return
      }

      if (
        normalizedKeywords.some((keyword) => normalizedNextChunk.includes(keyword)) ||
        /^(?:[-•]|\d{1,2}[.)]|[a-z]\))\s+/i.test(nextChunk) ||
        /anexo|formulario|declaraci[oó]n|certificado|precio|experiencia|plazo|cumplimiento|porcentaje|%/i.test(
          nextChunk,
        )
      ) {
        matches.push(limitValue(nextChunk, 320))
      }
    })
  })

  return [...new Set(matches.filter(Boolean))].slice(0, 18)
}

const extractPercentCriteria = (text) =>
  getChunks(text)
    .filter((chunk) => /%|\bponderaci[oó]n\b|\bpuntaje\b|\bcriterio\b/i.test(chunk))
    .filter((chunk) =>
      /precio|experiencia|plazo|calidad|t[eé]cnico|cumplimiento|evaluaci[oó]n|oferta/i.test(chunk),
    )
    .map((chunk) => limitValue(chunk, 260))

const extractTechnicalItems = (text, title, objectOfContract) => {
  const itemLines = getChunks(text).filter((line) =>
    /(ítem|item|partida|producto|servicio|suministro|instalaci[oó]n|arriendo|stand|stands|feria|mobiliario|m[oó]dulo|m[oó]dulos|montaje|desmontaje|letrero|señal[eé]tica|impresi[oó]n|vinilo|pend[oó]n|t[oó]tem|adhesivo|acr[ií]lico|estructura|gr[aá]fica)/i.test(
      line,
    ),
  )
  const titleItem =
    /(arriendo|stand|stands|feria|servicio|suministro|instalaci[oó]n|producci[oó]n)/i.test(title)
      ? [title]
      : []
  const objectItem = objectOfContract && objectOfContract !== title ? [objectOfContract] : []

  return [
    ...new Set([...titleItem, ...objectItem, ...itemLines].map((line) => limitValue(line, 260))),
  ]
    .filter(Boolean)
    .slice(0, 18)
}

const inferRiskLevel = (risks) => {
  const riskText = risks.join(' ').toLowerCase()

  if (
    /inadmisible|excluyente|boleta|garant[ií]a|visita obligatoria|fuera de plazo|cr[ií]tico/i.test(
      riskText,
    )
  ) {
    return 'Alto'
  }

  if (risks.length >= 4) {
    return 'Medio'
  }

  return 'Bajo'
}

const buildSuggestedQuestions = (
  text,
  guarantees,
  technicalItems,
  paymentTerms,
  evaluationCriteria,
) => {
  const questions = []

  if (guarantees.length > 0) {
    questions.push('Confirmar montos, vigencia y formato aceptado para garantías.')
  }

  if (technicalItems.length > 0) {
    questions.push(
      'Solicitar aclaración de cantidades, medidas, materialidad, montaje y desmontaje.',
    )
  }

  if (
    paymentTerms.length === 0 ||
    /contra entrega|30|60|factura|recepci[oó]n conforme/i.test(text)
  ) {
    questions.push(
      'Confirmar forma de pago, plazo real de pago y documentación de recepción conforme.',
    )
  }

  if (evaluationCriteria.length > 0) {
    questions.push(
      'Confirmar fórmula de evaluación económica y documentación que acredita experiencia.',
    )
  }

  if (/visita|terreno/i.test(text)) {
    questions.push('Confirmar si la visita a terreno es obligatoria y cómo se acredita asistencia.')
  }

  if (/muestra|prototipo/i.test(text)) {
    questions.push('Confirmar si se exige muestra física, plazo de entrega y costo asociado.')
  }

  if (/cronograma|modific|rectific|aclaraci[oó]n/i.test(text)) {
    questions.push(
      'Confirmar si el cronograma vigente corresponde a una modificación o aclaración posterior.',
    )
  }

  return [...new Set(questions)]
}

const buildExecutiveSummary = ({
  title,
  buyer,
  objectOfContract,
  budget,
  closingDate,
  riskLevel,
}) => {
  const parts = []

  if (title) parts.push(title)
  if (buyer) parts.push(`Comprador: ${buyer}`)
  if (objectOfContract) parts.push(`Objeto: ${objectOfContract}`)
  if (budget) parts.push(`Presupuesto disponible: $${Number(budget).toLocaleString('es-CL')}`)
  if (closingDate) parts.push(`Cierre: ${closingDate}`)
  if (riskLevel) parts.push(`Riesgo preliminar: ${riskLevel}`)

  return parts.join('\n')
}

export const analyzeTenderText = (sourceText = '') => {
  const text = String(sourceText || '')
  const normalizedText = cleanText(stripSourceMarkers(text))
  const tenderId =
    findFirstMatch(text, [
      /\b(\d{3,8}-\d{1,3}-[A-Z0-9]{2,4}\d*)\b/i,
      /(?:id|c[oó]digo)\s*(?:de\s+licitaci[oó]n)?\s*[:\-]?\s*([A-Z0-9\-]{6,})/i,
    ]) || ''
  const title = extractTitle(text)
  const buyer = extractBuyer(text)
  const objectOfContract = extractObjectOfContract(text, title)
  const budget = extractBudget(text)
  const closingDate = extractDateByLabels(text, [
    /fecha de cierre/,
    /cierre de ofertas/,
    /recepcion de ofertas/,
    /fecha cierre/,
    /cierre/,
  ])
  const openingDate = extractDateByLabels(text, [
    /apertura tecnica/,
    /apertura economica/,
    /fecha de apertura/,
    /apertura de ofertas/,
    /apertura/,
  ])
  const adjudicationDate = extractDateByLabels(text, [/fecha de adjudicacion/, /adjudicacion/])
  const contractSignDate = extractDateByLabels(text, [
    /firma de contrato/,
    /suscripcion del contrato/,
    /fecha limite de contrato/,
    /contrato/,
  ])

  const administrativeRequirements = extractSectionLines(text, [
    'administrativo',
    'declaración jurada',
    'declaracion jurada',
    'antecedentes',
    'chileproveedores',
    'habilidad',
    'inhabilidad',
    'rut',
  ])
  const technicalRequirements = extractSectionLines(text, [
    'técnico',
    'tecnico',
    'especificaciones',
    'ficha técnica',
    'ficha tecnica',
    'requerimiento técnico',
    'requerimiento tecnico',
    'características',
    'caracteristicas',
    'stand',
    'stands',
    'montaje',
    'desmontaje',
    'feria',
  ])
  const economicRequirements = extractSectionLines(text, [
    'económico',
    'economico',
    'oferta económica',
    'oferta economica',
    'precio',
    'presupuesto',
    'formulario económico',
    'formulario economico',
    'valor',
  ])
  const requiredDocuments = extractSectionLines(text, [
    'documentos',
    'anexo',
    'certificado',
    'formulario',
    'declaración',
    'declaracion',
    'antecedente',
    'archivo',
    'oferta técnica',
    'oferta tecnica',
    'oferta económica',
    'oferta economica',
  ])
  const essentialDocuments = extractSectionLines(text, [
    'esencial',
    'obligatorio',
    'inadmisible',
    'excluyente',
    'fuera de bases',
    'requisito de admisibilidad',
  ])
  const evaluationCriteria = [
    ...extractSectionLines(text, [
      'criterio',
      'evaluación',
      'evaluacion',
      'ponderación',
      'ponderacion',
      'puntaje',
      'porcentaje',
      '%',
    ]),
    ...extractPercentCriteria(text),
  ]
  const guarantees = extractSectionLines(text, [
    'garantía',
    'garantia',
    'boleta',
    'seriedad',
    'fiel cumplimiento',
    'vale vista',
    'póliza',
    'poliza',
  ])
  const paymentTerms = extractSectionLines(text, [
    'pago',
    'factura',
    'recepción conforme',
    'recepcion conforme',
    'estado de pago',
    '30 días',
    '30 dias',
    'contra entrega',
  ])
  const penalties = extractSectionLines(text, [
    'multa',
    'sanción',
    'sancion',
    'atraso',
    'penalidad',
    'incumplimiento',
    'deducción',
    'deduccion',
  ])
  const technicalItems = extractTechnicalItems(text, title, objectOfContract)

  const risks = [
    ...essentialDocuments.map((document) => `Documento esencial: ${document}`),
    ...guarantees.map((guarantee) => `Garantía requerida: ${guarantee}`),
    ...penalties.map((penalty) => `Multa o sanción: ${penalty}`),
  ]

  if (/visita\s+(a\s+)?terreno|visita\s+obligatoria/i.test(text)) {
    risks.push('Puede existir visita a terreno obligatoria.')
  }

  if (/muestra|prototipo/i.test(text)) {
    risks.push('Puede existir exigencia de muestra o prototipo.')
  }

  if (
    /fuera\s+de\s+plazo|no\s+ser[aá]\s+evaluad|inadmisible|rechazo\s+de\s+la\s+oferta|declarada\s+inadmisible/i.test(
      text,
    )
  ) {
    risks.push('Hay cláusulas de inadmisibilidad o rechazo por incumplimiento formal.')
  }

  if (MODIFIED_SCHEDULE_PATTERN.test(text)) {
    risks.push(
      'Existe referencia a cronograma modificado; validar que las fechas vigentes sean las últimas.',
    )
  }

  const uniqueEvaluationCriteria = [
    ...new Set(
      evaluationCriteria
        .filter(Boolean)
        .filter((criterion) => !/multa|sanci[oó]n|penalidad|atraso/i.test(criterion)),
    ),
  ]
  const uniqueRisks = [...new Set(risks.filter(Boolean))]
  const riskLevel = inferRiskLevel(uniqueRisks)
  const suggestedQuestions = buildSuggestedQuestions(
    text,
    guarantees,
    technicalItems,
    paymentTerms,
    uniqueEvaluationCriteria,
  )

  return normalizeTender({
    tenderId,
    title,
    buyer,
    budget,
    closingDate,
    openingDate,
    adjudicationDate,
    contractSignDate,
    status: 'En análisis',
    riskLevel,
    summary:
      buildExecutiveSummary({ title, buyer, objectOfContract, budget, closingDate, riskLevel }) ||
      normalizedText.slice(0, 700),
    object: objectOfContract,
    objectOfContract,
    administrativeRequirements,
    technicalRequirements,
    economicRequirements,
    requiredDocuments,
    essentialDocuments,
    evaluationCriteria: uniqueEvaluationCriteria,
    guarantees,
    paymentTerms,
    penalties,
    technicalItems,
    suggestedQuestions,
    risks: uniqueRisks,
    sourceText: text,
    observations: '',
  })
}

export const normalizeTender = (tender = {}) => {
  const now = new Date().toISOString()

  return {
    ...emptyTender,
    ...tender,
    id: tender.id || createLocalId('tender'),
    tenderId: String(tender.tenderId || tender.codigo || ''),
    title: tender.title || tender.nombre || '',
    buyer: tender.buyer || tender.comprador || '',
    buyerRut: tender.buyerRut || tender.rutComprador || '',
    budget: Number(tender.budget || tender.presupuesto) || 0,
    closingDate: tender.closingDate || '',
    closingTime: tender.closingTime || '',
    openingDate: tender.openingDate || '',
    openingTime: tender.openingTime || '',
    adjudicationDate: tender.adjudicationDate || '',
    adjudicationTime: tender.adjudicationTime || '',
    contractSignDate: tender.contractSignDate || '',
    questionsDeadline: tender.questionsDeadline || '',
    answersDate: tender.answersDate || '',
    status: tender.status || 'En análisis',
    riskLevel: tender.riskLevel || 'Medio',
    summary: tender.summary || '',
    objectOfContract: tender.objectOfContract || tender.object || tender.contractObject || '',
    administrativeRequirements: ensureList(tender.administrativeRequirements),
    technicalRequirements: ensureList(tender.technicalRequirements),
    economicRequirements: ensureList(tender.economicRequirements),
    requiredDocuments: ensureList(tender.requiredDocuments),
    essentialDocuments: ensureList(tender.essentialDocuments),
    evaluationCriteria: ensureList(tender.evaluationCriteria),
    guarantees: ensureList(tender.guarantees),
    paymentTerms: ensureList(tender.paymentTerms),
    penalties: ensureList(tender.penalties),
    technicalItems: ensureList(tender.technicalItems),
    suggestedQuestions: ensureList(tender.suggestedQuestions),
    risks: ensureList(tender.risks),
    observations: tender.observations || '',
    sourceText: tender.sourceText || '',
    sourceDocuments: ensureList(tender.sourceDocuments),
    fieldSources: tender.fieldSources || {},
    documentDiagnostics: Array.isArray(tender.documentDiagnostics)
      ? tender.documentDiagnostics
      : [],
    globalWarnings: ensureList(tender.globalWarnings),
    createdBy: tender.createdBy || null,
    analyzedBy: tender.analyzedBy || null,
    createdAt: tender.createdAt || now,
    updatedAt: tender.updatedAt || now,
  }
}

const mockTenderText = `
ID Licitación: 1234-56-LP26
Nombre licitación: Producción e instalación de gráfica institucional
Comprador: Municipalidad de Santiago
Objeto de contratación: fabricación, suministro e instalación de gráfica institucional.
Presupuesto estimado: $25.000.000
Fecha de cierre: 30/06/2026
Apertura técnica: 01/07/2026
Fecha de adjudicación: 15/07/2026
Fecha límite de contrato: 30/07/2026
Documentos obligatorios: Anexo administrativo, declaración jurada, oferta económica y ficha técnica.
Criterios de evaluación: precio 40%, experiencia 30%, plazo 20%, cumplimiento formal 10%.
Garantía de seriedad de la oferta: boleta bancaria por $500.000.
Forma de pago: contra recepción conforme y factura a 30 días.
Multa: 1% del monto contratado por cada día de atraso.
Ítem: letreros acrílicos, vinilos impresos e instalación en terreno.
`

export const mockTenders = [
  normalizeTender({
    ...analyzeTenderText(mockTenderText),
    id: 'tender-mock-1234-56-lp26',
    status: 'Cotizando',
    riskLevel: 'Alto',
    observations: 'Mock inicial para validar el flujo del analizador.',
    sourceDocuments: ['bases-administrativas.pdf', 'bases-tecnicas.pdf'],
  }),
]
