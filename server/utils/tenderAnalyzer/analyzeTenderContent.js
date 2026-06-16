const DOCUMENT_TYPES = {
  MODIFIED_SCHEDULE: 'cronograma_modificado',
  SCHEDULE: 'cronograma',
  BUDGET_CERTIFICATE: 'certificado_presupuestario',
  ADMIN_BASES: 'bases_administrativas',
  TECHNICAL_BASES: 'bases_tecnicas',
  ADMIN_TECHNICAL_BASES: 'bases_administrativas_tecnicas',
  ECONOMIC_ANNEX: 'anexo_economico',
  TECHNICAL_ANNEX: 'anexo_tecnico',
  ADMIN_ANNEX: 'anexo_administrativo',
  GENERAL: 'documento_general',
}

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

const FIELD_PRIORITIES = {
  closingDate: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  openingDate: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  adjudicationDate: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  contractSignDate: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  questionsDeadline: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  answersDate: [
    DOCUMENT_TYPES.MODIFIED_SCHEDULE,
    DOCUMENT_TYPES.SCHEDULE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  budget: [
    DOCUMENT_TYPES.BUDGET_CERTIFICATE,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.ECONOMIC_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  technicalItems: [
    DOCUMENT_TYPES.ECONOMIC_ANNEX,
    DOCUMENT_TYPES.TECHNICAL_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.TECHNICAL_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  technicalRequirements: [
    DOCUMENT_TYPES.TECHNICAL_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.TECHNICAL_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  administrativeRequirements: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.ADMIN_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  economicRequirements: [
    DOCUMENT_TYPES.ECONOMIC_ANNEX,
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  requiredDocuments: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.ADMIN_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  essentialDocuments: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.ADMIN_ANNEX,
    DOCUMENT_TYPES.GENERAL,
  ],
  evaluationCriteria: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  guarantees: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  paymentTerms: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
  penalties: [
    DOCUMENT_TYPES.ADMIN_BASES,
    DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES,
    DOCUMENT_TYPES.GENERAL,
  ],
}

const SECTION_LABELS = [
  'id\\s*(?:de\\s+)?licitaci[oó]n',
  'c[oó]digo\\s*(?:de\\s+)?licitaci[oó]n',
  'nombre\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
  't[ií]tulo\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
  'comprador',
  'rut\\s+comprador',
  'mandante',
  'organismo\\s+comprador',
  'entidad\\s+licitante',
  'objeto\\s*de\\s+contrataci[oó]n',
  'objeto\\s*(?:de\\s+la\\s+contrataci[oó]n|de\\s+licitaci[oó]n)?',
  'descripci[oó]n\\s*(?:de\\s+la\\s+contrataci[oó]n|de\\s+licitaci[oó]n)?',
  'presupuesto\\s*(?:disponible|estimado|referencial)?',
  'monto\\s*(?:total\\s+)?(?:disponible|estimado|referencial)',
  'certificado\\s+presupuestario',
  'cronograma',
  'fecha\\s+de\\s+cierre',
  'cierre\\s+de\\s+ofertas',
  'apertura',
  'adjudicaci[oó]n',
  'firma\\s+de\\s+contrato',
  'consultas?',
  'respuestas?',
  'documentos?',
  'antecedentes?',
  'requisitos?',
  'criterios?',
  'garant[ií]as?',
  'forma\\s+de\\s+pago',
  'multas?',
  'sanciones?',
  '[ií]tems?',
]

const MOJIBAKE_REPLACEMENTS = [
  ['Ã‘', 'Ñ'],
  ['Ã±', 'ñ'],
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Â°', '°'],
  ['Âº', 'º'],
  ['Âª', 'ª'],
  ['Â', ''],
  ['â€“', '-'],
  ['â€”', '-'],
  ['â€¢', '•'],
]

const normalizeEncoding = (value) =>
  MOJIBAKE_REPLACEMENTS.reduce(
    (text, [bad, good]) => text.split(bad).join(good),
    String(value || ''),
  )

const normalizeForSearch = (value) =>
  normalizeEncoding(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const cleanInline = (value) =>
  normalizeEncoding(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/^[\s:;,\-.–—]+/, '')
    .replace(/[\s:;,\-.–—]+$/, '')
    .trim()

const addBreaks = (text) =>
  normalizeEncoding(text)
    .replace(/\s+(?=(?:ID|Código|Codigo)\s+(?:de\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(/\s+(?=(?:Nombre|Título|Titulo)\s+(?:de\s+la\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(
      /\s+(?=(?:Comprador|Mandante|Organismo|Entidad|Rut\s+Comprador|RUT\s+Comprador)\b)/gi,
      '\n',
    )
    .replace(/\s+(?=(?:Objeto|Descripción|Descripcion)\b)/gi, '\n')
    .replace(
      /\s+(?=(?:Presupuesto|Monto|Valor|Certificado\s+Presupuestario|Certificado\s+de\s+Disponibilidad)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Fecha\s+de\s+Cierre|Cierre\s+de\s+Ofertas|Recepci[oó]n\s+de\s+Ofertas|Apertura|Adjudicaci[oó]n|Firma\s+de\s+Contrato|Suscripci[oó]n\s+del\s+Contrato|Consultas?|Respuestas?)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Documentos?|Antecedentes?|Requisitos?|Anexos?|Formulario|Declaraci[oó]n|Certificado|Garant[ií]a|Criterios?|Evaluaci[oó]n|Forma\s+de\s+Pago|Pago\s*:|Multa|Sanci[oó]n|Penalidad)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:[ÍI]tem|Item|Partida|Servicio|Producto|Cantidad|Valor\s+Unitario)\b)/gi,
      '\n',
    )
    .replace(/\s+(?=\d{1,2}[.)]\s+)/g, '\n')

const getChunks = (text) =>
  addBreaks(text)
    .split(/\r?\n|(?<=[.;:])\s+/)
    .map(cleanInline)
    .filter(Boolean)

const limitValue = (value, maxLength = 300) => {
  const cleaned = cleanInline(value).replace(/\s+/g, ' ')
  return cleaned.length <= maxLength ? cleaned : cleanInline(cleaned.slice(0, maxLength))
}

const unique = (values) => [...new Set(values.filter(Boolean))]

const normalizeDate = (value) => {
  if (!value) return ''

  const text = normalizeEncoding(value)
  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)

  if (numeric) {
    const [, day, month, year] = numeric
    const normalizedYear = year.length === 2 ? `20${year}` : year
    return `${normalizedYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const named = normalizeForSearch(text).match(
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/,
  )

  if (!named) return ''

  const [, day, monthName, year] = named
  return `${year}-${MONTHS[monthName]}-${String(day).padStart(2, '0')}`
}

const normalizeTime = (value) => {
  const match = String(value || '').match(/\b([01]?\d|2[0-3])[:.](\d{2})(?:\s*(?:hrs?|horas?))?\b/i)
  if (!match) return ''
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`
}

const normalizeMoney = (value) => {
  const match = String(value || '').match(/(?:\$|clp)?\s*([\d.]{4,}(?:,\d+)?)/i)
  if (!match?.[1]) return 0
  return Number(match[1].replace(/[^\d]/g, '')) || 0
}

const classifyDocument = ({ fileName = '', extractedText = '' }) => {
  const target = normalizeForSearch(`${fileName}\n${extractedText.slice(0, 8000)}`)
  const hasAdminBases = /bases?\s+administrativas?/.test(target)
  const hasTechnicalBases = /bases?\s+tecnicas?|especificaciones?\s+tecnicas?/.test(target)

  if (
    /cronograma\s+modificado|modificacion\s+.*cronograma|nuevo\s+cronograma|cronograma\s+actualizado/.test(
      target,
    )
  ) {
    return { type: DOCUMENT_TYPES.MODIFIED_SCHEDULE, confidence: 0.95 }
  }
  if (
    /fecha\s+de\s+cierre|apertura\s+de\s+ofertas|adjudicacion/.test(target) &&
    /cronograma|calendario|fechas/.test(target)
  ) {
    return { type: DOCUMENT_TYPES.SCHEDULE, confidence: 0.86 }
  }
  if (
    /certificado\s+de\s+disponibilidad\s+presupuestaria|certificado\s+presupuestario/.test(target)
  ) {
    return { type: DOCUMENT_TYPES.BUDGET_CERTIFICATE, confidence: 0.95 }
  }
  if (hasAdminBases && hasTechnicalBases) {
    return { type: DOCUMENT_TYPES.ADMIN_TECHNICAL_BASES, confidence: 0.9 }
  }
  if (hasAdminBases) {
    return { type: DOCUMENT_TYPES.ADMIN_BASES, confidence: 0.88 }
  }
  if (hasTechnicalBases) {
    return { type: DOCUMENT_TYPES.TECHNICAL_BASES, confidence: 0.88 }
  }
  if (
    /anexo\s+economico|oferta\s+economica|itemizado|valor\s+unitario|formulario\s+economico/.test(
      target,
    )
  ) {
    return { type: DOCUMENT_TYPES.ECONOMIC_ANNEX, confidence: 0.9 }
  }
  if (/anexo\s+tecnico|ficha\s+tecnica|especificacion/.test(target)) {
    return { type: DOCUMENT_TYPES.TECHNICAL_ANNEX, confidence: 0.8 }
  }
  if (/anexo\s+administrativo|declaracion\s+jurada|antecedentes\s+administrativos/.test(target)) {
    return { type: DOCUMENT_TYPES.ADMIN_ANNEX, confidence: 0.8 }
  }

  return { type: DOCUMENT_TYPES.GENERAL, confidence: 0.45 }
}

const buildSourceSegments = (source) => {
  if (source.segments?.length > 0) {
    return source.segments.map((segment, index) => ({
      text: cleanInline(segment.text),
      sourceFile: source.fileName,
      sourcePage: segment.page || null,
      sourceSheet: segment.sheet || null,
      sourceRow: segment.row || null,
      sourceCell: segment.cell || null,
      sourceIndex: index,
      documentType: source.documentType,
      documentConfidence: source.documentConfidence,
    }))
  }

  return getChunks(source.extractedText).map((text, index) => ({
    text,
    sourceFile: source.fileName,
    sourcePage: null,
    sourceSheet: null,
    sourceRow: index + 1,
    sourceCell: null,
    sourceIndex: index,
    documentType: source.documentType,
    documentConfidence: source.documentConfidence,
  }))
}

const sourcePayload = ({ value, segment, confidence = 0.65 }) => ({
  value,
  sourceFile: segment?.sourceFile || '',
  sourcePage: segment?.sourcePage || null,
  sourceSheet: segment?.sourceSheet || null,
  sourceRow: segment?.sourceRow || null,
  sourceCell: segment?.sourceCell || null,
  sourceText: segment?.text || '',
  confidence: Number(confidence.toFixed(2)),
})

const priorityScore = (field, documentType) => {
  const priority = FIELD_PRIORITIES[field] || []
  const index = priority.indexOf(documentType)
  return index === -1 ? priority.length + 4 : index
}

const chooseCandidate = (field, candidates) =>
  candidates
    .filter((candidate) => candidate.value !== '' && candidate.value != null)
    .sort((a, b) => {
      const priorityDiff =
        priorityScore(field, a.segment.documentType) - priorityScore(field, b.segment.documentType)
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })[0]

const findFirstMatch = (segments, patterns, field, formatter = (value) => cleanInline(value)) => {
  const candidates = []

  segments.forEach((segment) => {
    for (const pattern of patterns) {
      const match = segment.text.match(pattern)
      if (!match?.[1]) continue
      const value = formatter(match[1], segment.text)
      if (!value) continue

      candidates.push({
        value,
        segment,
        confidence: 0.68 + Math.min(segment.documentConfidence || 0, 0.25),
      })
    }
  })

  const selected = chooseCandidate(field, candidates)

  if (selected) {
    selected.allCandidates = candidates
  }

  return selected
}

const extractAfterLabel = (segments, labels, field, maxLength = 260) => {
  const candidates = []

  segments.forEach((segment, segmentIndex) => {
    labels.forEach((label) => {
      const labelRegex = new RegExp(`(?:${label})\\s*(?::|-|–|—)?\\s*(.*)`, 'i')
      const match = segment.text.match(labelRegex)
      if (!match) return

      let value = match[1] || segments[segmentIndex + 1]?.text || ''
      const stopIndexes = SECTION_LABELS.map((source) => {
        const stop = value.match(new RegExp(`\\b(?:${source})\\b\\s*(?::|-|–|—)?`, 'i'))
        return stop?.index ?? -1
      }).filter((index) => index > 8)

      if (stopIndexes.length > 0) {
        value = value.slice(0, Math.min(...stopIndexes))
      }

      value = limitValue(value, maxLength)
      if (!value) return

      candidates.push({
        value,
        segment,
        confidence: 0.7 + Math.min(segment.documentConfidence || 0, 0.25),
      })
    })
  })

  const selected = chooseCandidate(field, candidates)

  if (selected) {
    selected.allCandidates = candidates
  }

  return selected
}

const extractDateTime = (segments, labels, field) => {
  const candidates = []
  const datePattern =
    /(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})/i

  segments.forEach((segment, index) => {
    const normalized = normalizeForSearch(segment.text)
    if (!labels.some((label) => label.test(normalized))) return

    const nearbyText = [segment.text, segments[index + 1]?.text, segments[index + 2]?.text]
      .filter(Boolean)
      .join(' ')
    const dateMatch = nearbyText.match(datePattern)
    if (!dateMatch?.[0]) return

    candidates.push({
      value: normalizeDate(dateMatch[0]),
      time: normalizeTime(nearbyText),
      segment,
      confidence: 0.72 + Math.min(segment.documentConfidence || 0, 0.24),
    })
  })

  return chooseCandidate(field, candidates)
}

const extractSectionItems = (segments, keywords, field, limit = 18) => {
  const normalizedKeywords = keywords.map(normalizeForSearch)
  const candidates = []

  segments.forEach((segment, index) => {
    const normalized = normalizeForSearch(segment.text)
    if (!normalizedKeywords.some((keyword) => normalized.includes(keyword))) return

    const localSegments = [segment, segments[index + 1], segments[index + 2], segments[index + 3]]
      .filter(Boolean)
      .filter((item, itemIndex) => {
        if (itemIndex === 0) return true
        const localText = normalizeForSearch(item.text)
        return (
          normalizedKeywords.some((keyword) => localText.includes(keyword)) ||
          /^(?:[-•]|\d{1,2}[.)]|[a-z]\))\s+/i.test(item.text) ||
          /anexo|formulario|declaraci[oó]n|certificado|precio|experiencia|plazo|cumplimiento|porcentaje|%/i.test(
            item.text,
          )
        )
      })

    localSegments.forEach((item) => {
      const value = limitValue(item.text, 320)
      if (!value) return
      candidates.push({
        value,
        segment: item,
        confidence: 0.58 + Math.min(item.documentConfidence || 0, 0.25),
      })
    })
  })

  return candidates
    .sort((a, b) => {
      const priorityDiff =
        priorityScore(field, a.segment.documentType) - priorityScore(field, b.segment.documentType)
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })
    .filter(
      (candidate, index, array) =>
        array.findIndex((item) => item.value === candidate.value) === index,
    )
    .slice(0, limit)
}

const collectContradictions = (label, candidates, globalWarnings) => {
  const values = unique(candidates.map((candidate) => String(candidate.value || '')))
  if (values.length > 1) {
    globalWarnings.push(`${label} tiene valores contradictorios detectados: ${values.join(', ')}.`)
  }
}

const analyzeTenderWithAI = async () => ({
  enabled: false,
  message:
    'Preparado para futura integración IA. No se ejecuta análisis externo porque no hay API key configurada en backend.',
})

const analyzeTenderContent = ({ sources = [], manualText = '' }) => {
  const normalizedSources = sources.map((source) => {
    const extractedText = normalizeEncoding(source.extractedText || source.text || '')
    const classification = classifyDocument({ fileName: source.fileName, extractedText })

    return {
      ...source,
      extractedText,
      documentType: classification.type,
      documentConfidence: classification.confidence,
      extractionWarnings: source.extractionWarnings || source.warnings || [],
      extractionMethod: source.extractionMethod || 'unknown',
      segments: source.segments || [],
    }
  })
  const manualSource = manualText.trim()
    ? {
        fileName: 'texto-manual',
        fileType: 'text/plain',
        extractedText: normalizeEncoding(manualText),
        extractionMethod: 'manual-textarea',
        extractionWarnings: [],
        segments: [],
        documentType: DOCUMENT_TYPES.GENERAL,
        documentConfidence: 0.4,
      }
    : null
  const analysisSources = manualSource ? [...normalizedSources, manualSource] : normalizedSources
  const segments = analysisSources.flatMap(buildSourceSegments)
  const combinedText = analysisSources
    .map((source) => `--- ${source.fileName} | ${source.documentType} ---\n${source.extractedText}`)
    .join('\n\n')
  const globalWarnings = []

  const tenderIdCandidate = findFirstMatch(
    segments,
    [
      /\b(\d{3,8}-\d{1,3}-[A-Z0-9]{2,4}\d*)\b/i,
      /(?:id|c[oó]digo)\s*(?:de\s+)?(?:licitaci[oó]n)?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{5,})/i,
    ],
    'tenderId',
  )
  const titleCandidate =
    extractAfterLabel(
      segments,
      [
        'nombre\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
        't[ií]tulo\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
        'denominaci[oó]n\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
      ],
      'title',
      180,
    ) ||
    findFirstMatch(
      segments,
      [
        /\b((?:ARRIENDO|ADQUISICI[OÓ]N|SERVICIO|SERVICIOS|SUMINISTRO|CONTRATACI[OÓ]N|PRODUCCI[OÓ]N|INSTALACI[OÓ]N|HABILITACI[OÓ]N|MANTENCI[OÓ]N)[A-ZÁÉÍÓÚÑ0-9\s/,\-.]{10,160})/i,
      ],
      'title',
      (value) => limitValue(value, 180),
    )
  const buyerCandidate =
    extractAfterLabel(
      segments,
      [
        'comprador',
        'organismo\\s+comprador',
        'mandante',
        'entidad\\s+licitante',
        'instituci[oó]n\\s+compradora',
      ],
      'buyer',
      170,
    ) ||
    findFirstMatch(
      segments,
      [
        /\b(Fondo\s+de\s+Agua\s+de\s+Santiago)\b/i,
        /\b((?:ilustre\s+)?municipalidad\s+de\s+[^.;\n]{3,90})/i,
        /\b((?:fondo|fundaci[oó]n|corporaci[oó]n|universidad|ministerio|subsecretar[ií]a|direcci[oó]n|servicio|gobierno|hospital|instituto|centro)\s+[^.;\n]{3,100})/i,
      ],
      'buyer',
    )
  const buyerRutMatch = combinedText.match(
    /(?:rut\s+(?:comprador|mandante|organismo)|rut\s+entidad)\s*[:\-]?\s*(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])/i,
  )
  const buyerRutCandidate = buyerRutMatch?.[1]
    ? {
        value: buyerRutMatch[1],
        segment:
          segments.find(
            (segment) =>
              segment.text.includes(buyerRutMatch[1]) ||
              /rut\s+(?:comprador|mandante|organismo)|rut\s+entidad/i.test(segment.text),
          ) || segments[0],
        confidence: 0.88,
      }
    : null
  const objectCandidate =
    extractAfterLabel(
      segments,
      [
        'objeto\\s*de\\s+la\\s+contrataci[oó]n',
        'objeto\\s*de\\s+contrataci[oó]n',
        'objeto\\s*de\\s+contrataci.n',
        'objeto\\s*de\\s+licitaci[oó]n',
        'objeto\\s*de\\s+licitaci.n',
        'objeto',
        'descripci[oó]n\\s+de\\s+licitaci[oó]n',
        'descripci[oó]n\\s+de\\s+la\\s+contrataci[oó]n',
        'descripci[oó]n',
      ],
      'object',
      380,
    ) || titleCandidate
  if (objectCandidate?.value) {
    objectCandidate.value = cleanInline(
      objectCandidate.value.replace(
        /^de\s+(?:la\s+)?(?:contrataci[oó?]n|licitaci[oó?]n)\s*[:\-–—]?\s*/i,
        '',
      ),
    )
  }

  const budgetCandidates = segments
    .map((segment) => {
      const match = segment.text.match(
        /(?:presupuesto|monto\s+(?:total\s+)?disponible|monto\s+estimado|valor\s+estimado|presupuesto\s+referencial|certificado\s+presupuestario)[^\d$]{0,100}(?:\$|clp)?\s*([\d.]{4,}(?:,\d+)?)/i,
      )
      if (!match?.[1]) return null
      return {
        value: normalizeMoney(match[1]),
        segment,
        confidence: 0.7 + Math.min(segment.documentConfidence || 0, 0.25),
      }
    })
    .filter(Boolean)
  const budgetCandidate = chooseCandidate('budget', budgetCandidates)

  const closingCandidate = extractDateTime(
    segments,
    [/fecha de cierre/, /cierre de ofertas/, /recepcion de ofertas/, /cierre/],
    'closingDate',
  )
  const openingCandidate = extractDateTime(
    segments,
    [/apertura tecnica/, /apertura economica/, /fecha de apertura/, /apertura/],
    'openingDate',
  )
  const adjudicationCandidate = extractDateTime(
    segments,
    [/fecha de adjudicacion/, /adjudicacion/],
    'adjudicationDate',
  )
  const contractCandidate = extractDateTime(
    segments,
    [/firma de contrato/, /suscripcion del contrato/, /fecha limite de contrato/, /contrato/],
    'contractSignDate',
  )
  const questionsCandidate = extractDateTime(
    segments,
    [/fecha.*consultas/, /consultas/, /preguntas/],
    'questionsDeadline',
  )
  const answersCandidate = extractDateTime(
    segments,
    [/fecha.*respuestas/, /respuestas/, /aclaraciones/],
    'answersDate',
  )

  collectContradictions('Presupuesto', budgetCandidates, globalWarnings)
  collectContradictions('Fecha de cierre', closingCandidate?.allCandidates || [], globalWarnings)
  collectContradictions('Fecha de apertura', openingCandidate?.allCandidates || [], globalWarnings)
  collectContradictions(
    'Fecha de adjudicación',
    adjudicationCandidate?.allCandidates || [],
    globalWarnings,
  )
  collectContradictions('Firma de contrato', contractCandidate?.allCandidates || [], globalWarnings)

  const listFields = {
    administrativeRequirements: extractSectionItems(
      segments,
      [
        'administrativo',
        'declaración jurada',
        'declaracion jurada',
        'antecedentes',
        'chileproveedores',
        'habilidad',
        'inhabilidad',
      ],
      'administrativeRequirements',
    ),
    technicalRequirements: extractSectionItems(
      segments,
      [
        'técnico',
        'tecnico',
        'especificaciones',
        'ficha técnica',
        'ficha tecnica',
        'requerimiento técnico',
        'stand',
        'stands',
        'montaje',
        'desmontaje',
        'feria',
      ],
      'technicalRequirements',
    ),
    economicRequirements: extractSectionItems(
      segments,
      [
        'económico',
        'economico',
        'oferta económica',
        'oferta economica',
        'precio',
        'presupuesto',
        'formulario económico',
        'formulario economico',
      ],
      'economicRequirements',
    ),
    requiredDocuments: extractSectionItems(
      segments,
      [
        'documentos',
        'anexo',
        'certificado',
        'formulario',
        'declaración',
        'declaracion',
        'antecedente',
        'oferta técnica',
        'oferta tecnica',
        'oferta económica',
        'oferta economica',
      ],
      'requiredDocuments',
    ),
    essentialDocuments: extractSectionItems(
      segments,
      [
        'esencial',
        'obligatorio',
        'inadmisible',
        'excluyente',
        'fuera de bases',
        'requisito de admisibilidad',
      ],
      'essentialDocuments',
    ),
    evaluationCriteria: extractSectionItems(
      segments,
      [
        'criterio',
        'evaluación',
        'evaluacion',
        'ponderación',
        'ponderacion',
        'puntaje',
        'porcentaje',
        '%',
      ],
      'evaluationCriteria',
    ).filter((item) => !/multa|sanci[oó]n|penalidad|atraso/i.test(item.value)),
    guarantees: extractSectionItems(
      segments,
      [
        'garantía',
        'garantia',
        'boleta',
        'seriedad',
        'fiel cumplimiento',
        'vale vista',
        'póliza',
        'poliza',
      ],
      'guarantees',
    ),
    paymentTerms: extractSectionItems(
      segments,
      [
        'pago',
        'factura',
        'recepción conforme',
        'recepcion conforme',
        'estado de pago',
        '30 días',
        '30 dias',
        'contra entrega',
      ],
      'paymentTerms',
    ),
    penalties: extractSectionItems(
      segments,
      ['multa', 'sanción', 'sancion', 'atraso', 'penalidad', 'incumplimiento'],
      'penalties',
    ),
  }
  const technicalItemCandidates = extractSectionItems(
    segments,
    [
      'ítem',
      'item',
      'partida',
      'producto',
      'servicio',
      'suministro',
      'instalación',
      'instalacion',
      'arriendo',
      'stand',
      'stands',
      'feria',
      'mobiliario',
      'módulo',
      'modulo',
      'montaje',
      'desmontaje',
      'gráfica',
      'grafica',
      'valor unitario',
    ],
    'technicalItems',
    22,
  )

  const technicalItems = unique([
    titleCandidate?.value &&
    /arriendo|stand|stands|feria|servicio|suministro|instalaci[oó]n|producci[oó]n/i.test(
      titleCandidate.value,
    )
      ? titleCandidate.value
      : '',
    objectCandidate?.value && objectCandidate.value !== titleCandidate?.value
      ? objectCandidate.value
      : '',
    ...technicalItemCandidates.map((item) => item.value),
  ]).slice(0, 24)
  const technicalItemSources = [
    ...(titleCandidate ? [sourcePayload(titleCandidate)] : []),
    ...(objectCandidate ? [sourcePayload(objectCandidate)] : []),
    ...technicalItemCandidates.map(sourcePayload),
  ].slice(0, 24)

  const risks = unique([
    ...listFields.essentialDocuments.map((item) => `Documento esencial: ${item.value}`),
    ...listFields.guarantees.map((item) => `Garantía requerida: ${item.value}`),
    ...listFields.penalties.map((item) => `Multa o sanción: ${item.value}`),
    /visita\s+(a\s+)?terreno|visita\s+obligatoria/i.test(combinedText)
      ? 'Puede existir visita a terreno obligatoria.'
      : '',
    /muestra|prototipo/i.test(combinedText)
      ? 'Puede existir exigencia de muestra o prototipo.'
      : '',
    /fuera\s+de\s+plazo|no\s+ser[aá]\s+evaluad|inadmisible|rechazo\s+de\s+la\s+oferta|declarada\s+inadmisible/i.test(
      combinedText,
    )
      ? 'Hay cláusulas de inadmisibilidad o rechazo por incumplimiento formal.'
      : '',
    /modific|nuevo|actualiz|rectific|aclaraci[oó]n|corregid/i.test(combinedText)
      ? 'Existe referencia a cronograma modificado; validar que las fechas vigentes sean las últimas.'
      : '',
  ])

  const suggestedQuestions = unique([
    listFields.guarantees.length > 0
      ? 'Confirmar montos, vigencia y formato aceptado para garantías.'
      : '',
    technicalItems.length > 0
      ? 'Solicitar aclaración de cantidades, medidas, materialidad, montaje y desmontaje.'
      : '',
    listFields.paymentTerms.length === 0 ||
    /factura|recepci[oó]n conforme|30|60|contra entrega/i.test(combinedText)
      ? 'Confirmar forma de pago, plazo real de pago y documentación de recepción conforme.'
      : '',
    listFields.evaluationCriteria.length > 0
      ? 'Confirmar fórmula de evaluación económica y documentación que acredita experiencia.'
      : '',
    /visita|terreno/i.test(combinedText)
      ? 'Confirmar si la visita a terreno es obligatoria y cómo se acredita asistencia.'
      : '',
    /cronograma|modific|rectific|aclaraci[oó]n/i.test(combinedText)
      ? 'Confirmar si el cronograma vigente corresponde a una modificación o aclaración posterior.'
      : '',
  ])

  const riskLevel =
    /inadmisible|excluyente|boleta|garant[ií]a|visita obligatoria|fuera de plazo/i.test(
      risks.join(' '),
    )
      ? 'Alto'
      : risks.length >= 4
        ? 'Medio'
        : 'Bajo'
  const tenderData = {
    tenderId: tenderIdCandidate?.value || '',
    title: titleCandidate?.value || '',
    buyer: buyerCandidate?.value || '',
    buyerRut: buyerRutCandidate?.value || '',
    budget: budgetCandidate?.value || 0,
    closingDate: closingCandidate?.value || '',
    closingTime: closingCandidate?.time || '',
    openingDate: openingCandidate?.value || '',
    openingTime: openingCandidate?.time || '',
    adjudicationDate: adjudicationCandidate?.value || '',
    adjudicationTime: adjudicationCandidate?.time || '',
    contractSignDate: contractCandidate?.value || '',
    questionsDeadline: questionsCandidate?.value || '',
    answersDate: answersCandidate?.value || '',
    object: objectCandidate?.value || titleCandidate?.value || '',
    summary: unique([
      titleCandidate?.value,
      buyerCandidate?.value ? `Comprador: ${buyerCandidate.value}` : '',
      objectCandidate?.value ? `Objeto: ${objectCandidate.value}` : '',
      budgetCandidate?.value
        ? `Presupuesto disponible: $${Number(budgetCandidate.value).toLocaleString('es-CL')}`
        : '',
      closingCandidate?.value
        ? `Cierre: ${closingCandidate.value}${closingCandidate.time ? ` ${closingCandidate.time}` : ''}`
        : '',
      `Riesgo preliminar: ${riskLevel}`,
    ]).join('\n'),
    administrativeRequirements: unique(
      listFields.administrativeRequirements.map((item) => item.value),
    ),
    technicalRequirements: unique(listFields.technicalRequirements.map((item) => item.value)),
    economicRequirements: unique(listFields.economicRequirements.map((item) => item.value)),
    requiredDocuments: unique(listFields.requiredDocuments.map((item) => item.value)),
    essentialDocuments: unique(listFields.essentialDocuments.map((item) => item.value)),
    evaluationCriteria: unique(listFields.evaluationCriteria.map((item) => item.value)),
    guarantees: unique(listFields.guarantees.map((item) => item.value)),
    paymentTerms: unique(listFields.paymentTerms.map((item) => item.value)),
    penalties: unique(listFields.penalties.map((item) => item.value)),
    risks,
    suggestedQuestions,
    technicalItems,
    riskLevel,
  }

  const fieldSources = {
    tenderId: tenderIdCandidate ? sourcePayload(tenderIdCandidate) : null,
    title: titleCandidate ? sourcePayload(titleCandidate) : null,
    buyer: buyerCandidate ? sourcePayload(buyerCandidate) : null,
    buyerRut: buyerRutCandidate ? sourcePayload(buyerRutCandidate) : null,
    budget: budgetCandidate ? sourcePayload(budgetCandidate) : null,
    closingDate: closingCandidate ? sourcePayload(closingCandidate) : null,
    closingTime: closingCandidate?.time
      ? sourcePayload({ ...closingCandidate, value: closingCandidate.time })
      : null,
    openingDate: openingCandidate ? sourcePayload(openingCandidate) : null,
    openingTime: openingCandidate?.time
      ? sourcePayload({ ...openingCandidate, value: openingCandidate.time })
      : null,
    adjudicationDate: adjudicationCandidate ? sourcePayload(adjudicationCandidate) : null,
    adjudicationTime: adjudicationCandidate?.time
      ? sourcePayload({ ...adjudicationCandidate, value: adjudicationCandidate.time })
      : null,
    contractSignDate: contractCandidate ? sourcePayload(contractCandidate) : null,
    questionsDeadline: questionsCandidate ? sourcePayload(questionsCandidate) : null,
    answersDate: answersCandidate ? sourcePayload(answersCandidate) : null,
    object: objectCandidate ? sourcePayload(objectCandidate) : null,
    administrativeRequirements: listFields.administrativeRequirements.map(sourcePayload),
    technicalRequirements: listFields.technicalRequirements.map(sourcePayload),
    economicRequirements: listFields.economicRequirements.map(sourcePayload),
    requiredDocuments: listFields.requiredDocuments.map(sourcePayload),
    essentialDocuments: listFields.essentialDocuments.map(sourcePayload),
    evaluationCriteria: listFields.evaluationCriteria.map(sourcePayload),
    guarantees: listFields.guarantees.map(sourcePayload),
    paymentTerms: listFields.paymentTerms.map(sourcePayload),
    penalties: listFields.penalties.map(sourcePayload),
    technicalItems: technicalItemSources,
    risks: [
      ...listFields.essentialDocuments.map((item) =>
        sourcePayload({ ...item, value: `Documento esencial: ${item.value}` }),
      ),
      ...listFields.guarantees.map((item) =>
        sourcePayload({ ...item, value: `Garantía requerida: ${item.value}` }),
      ),
      ...listFields.penalties.map((item) =>
        sourcePayload({ ...item, value: `Multa o sanción: ${item.value}` }),
      ),
    ],
    suggestedQuestions: suggestedQuestions.map((question) => ({
      value: question,
      sourceFile: 'reglas-locales',
      sourcePage: null,
      sourceSheet: null,
      sourceRow: null,
      sourceCell: null,
      sourceText: 'Pregunta sugerida por heurísticas locales del analizador.',
      confidence: 0.55,
    })),
  }

  if (!tenderData.budget) globalWarnings.push('No se detectó presupuesto disponible.')
  if (!tenderData.closingDate) globalWarnings.push('No se detectó fecha de cierre.')
  if (tenderData.evaluationCriteria.length === 0)
    globalWarnings.push('No se detectaron criterios de evaluación.')
  if (tenderData.essentialDocuments.length === 0)
    globalWarnings.push('No se detectaron documentos esenciales.')

  const documentDiagnostics = analysisSources.map((source) => {
    const foundFields = Object.entries(fieldSources)
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.some((item) => item.sourceFile === source.fileName)
        return value?.sourceFile === source.fileName
      })
      .map(([field]) => field)

    if (
      /pdf|image/i.test(source.fileType || '') &&
      (source.extractedText || '').trim().length < 80 &&
      source.fileName !== 'texto-manual'
    ) {
      globalWarnings.push(
        `Texto extraído muy corto en "${source.fileName}". Posible PDF escaneado u OCR débil.`,
      )
    }

    return {
      fileName: source.fileName,
      fileType: source.fileType,
      detectedType: source.documentType,
      confidence: Number((source.documentConfidence || 0).toFixed(2)),
      extractionMethod: source.extractionMethod,
      extractedLength: (source.extractedText || '').length,
      fieldsFound: unique(foundFields),
      extractionWarnings: source.extractionWarnings || [],
    }
  })

  return {
    tenderData,
    fieldSources,
    documentDiagnostics,
    extractedText: combinedText,
    globalWarnings: unique(globalWarnings),
  }
}

module.exports = { analyzeTenderContent, analyzeTenderWithAI, classifyDocument, normalizeEncoding }
