const MODIFIED_SCHEDULE_PATTERN = /modific|nuevo|actualiz|rectific|aclaraci[oó]n|corregid/i
const BUDGET_FILE_PATTERN = /certificado|presupuest/i
const ECONOMIC_FILE_PATTERN = /econ[oó]mic|precio|presupuesto|item|ítem|anexo/i

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

const SECTION_LABELS = [
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

const normalizeForSearch = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const cleanInline = (value) =>
  String(value || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/^[\s:;,\-.–—]+/, '')
    .replace(/[\s:;,\-.–—]+$/, '')
    .trim()

const addBreaks = (text) =>
  String(text || '')
    .replace(/\s+(?=(?:ID|Código|Codigo)\s+(?:de\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(/\s+(?=(?:Nombre|Título|Titulo)\s+(?:de\s+la\s+)?Licitaci[oó]n\b)/gi, '\n')
    .replace(/\s+(?=(?:Comprador|Mandante|Organismo|Entidad)\b)/gi, '\n')
    .replace(/\s+(?=(?:Objeto|Descripción|Descripcion)\b)/gi, '\n')
    .replace(/\s+(?=(?:Presupuesto|Monto|Valor)\b)/gi, '\n')
    .replace(
      /\s+(?=(?:Fecha\s+de\s+Cierre|Cierre\s+de\s+Ofertas|Recepci[oó]n\s+de\s+Ofertas|Apertura|Adjudicaci[oó]n|Firma\s+de\s+Contrato|Suscripci[oó]n\s+del\s+Contrato)\b)/gi,
      '\n',
    )
    .replace(
      /\s+(?=(?:Documentos?|Antecedentes?|Requisitos?|Anexos?|Formulario|Declaraci[oó]n|Certificado|Garant[ií]a|Criterios?|Evaluaci[oó]n|Forma\s+de\s+Pago|Pago\s*:|Multa|Sanci[oó]n|Penalidad)\b)/gi,
      '\n',
    )
    .replace(/\s+(?=(?:[ÍI]tem|Item|Partida|Servicio|Producto)\b)/gi, '\n')
    .replace(/\s+(?=\d{1,2}[.)]\s+)/g, '\n')

const getChunks = (text) =>
  addBreaks(text)
    .split(/\r?\n|(?<=[.;:])\s+/)
    .map(cleanInline)
    .filter(Boolean)

const limitValue = (value, maxLength = 260) => {
  const cleaned = cleanInline(value).replace(/\s+/g, ' ')

  if (cleaned.length <= maxLength) return cleaned

  return cleanInline(cleaned.slice(0, maxLength))
}

const sourceForText = (value, sources = []) => {
  const normalizedValue = normalizeForSearch(value)

  if (!normalizedValue) return ''

  const source = sources.find((item) =>
    normalizeForSearch(item.text).includes(normalizedValue.slice(0, 80)),
  )

  return source?.fileName || ''
}

const firstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern)

    if (match?.[1]) return cleanInline(match[1])
  }

  return ''
}

const extractAfterLabel = (text, labels, maxLength = 260) => {
  const flatText = addBreaks(text).replace(/\s+/g, ' ')

  for (const label of labels) {
    const labelRegex = new RegExp(`(?:${label})\\s*(?::|-|–|—)?\\s*`, 'i')
    const match = flatText.match(labelRegex)

    if (!match) continue

    const start = (match.index || 0) + match[0].length
    let value = flatText.slice(start)
    const stopIndexes = SECTION_LABELS.map((source) => {
      const stop = value.match(new RegExp(`\\b(?:${source})\\b\\s*(?::|-|–|—)?`, 'i'))
      return stop?.index ?? -1
    }).filter((index) => index > 0)

    if (stopIndexes.length > 0) {
      value = value.slice(0, Math.min(...stopIndexes))
    }

    const cleaned = limitValue(value, maxLength)

    if (cleaned) return cleaned
  }

  return ''
}

const normalizeDate = (value) => {
  if (!value) return ''

  const text = String(value)
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

const extractDate = (sources, labelPatterns) => {
  const datePattern =
    /(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})/i
  const candidates = []

  sources.forEach((source) => {
    const chunks = getChunks(source.text)

    chunks.forEach((chunk, index) => {
      const normalizedChunk = normalizeForSearch(chunk)

      if (!labelPatterns.some((pattern) => pattern.test(normalizedChunk))) return

      const dateMatch = chunk.match(datePattern) || chunks[index + 1]?.match(datePattern)

      if (!dateMatch?.[0]) return

      const context = [
        source.fileName,
        chunks[index - 2],
        chunks[index - 1],
        chunk,
        chunks[index + 1],
      ]
        .filter(Boolean)
        .join(' ')

      candidates.push({
        value: dateMatch[0],
        source: source.fileName,
        modified: MODIFIED_SCHEDULE_PATTERN.test(context),
      })
    })
  })

  const candidate =
    candidates.find((item) => item.modified) ||
    candidates.find((item) => MODIFIED_SCHEDULE_PATTERN.test(item.source)) ||
    candidates[0]

  return { value: normalizeDate(candidate?.value), source: candidate?.source || '' }
}

const extractBudget = (sources, combinedText) => {
  const budgetRegex =
    /(?:presupuesto|monto\s+(?:total\s+)?disponible|monto\s+estimado|valor\s+estimado|presupuesto\s+referencial)[^\d$]{0,80}(?:\$|clp)?\s*([\d.]{4,}(?:,\d+)?)/i
  const candidates = []

  sources.forEach((source) => {
    const match = source.text.match(budgetRegex)

    if (!match?.[1]) return

    candidates.push({
      value: Number(match[1].replace(/[^\d]/g, '')) || 0,
      source: source.fileName,
      certificate: BUDGET_FILE_PATTERN.test(source.fileName),
    })
  })

  if (candidates.length === 0) {
    const match = combinedText.match(budgetRegex)
    const value = match?.[1] ? Number(match[1].replace(/[^\d]/g, '')) || 0 : 0

    return { value, source: '' }
  }

  const candidate = candidates.find((item) => item.certificate) || candidates[0]

  return { value: candidate.value, source: candidate.source }
}

const extractTitle = (text) => {
  const labeled = extractAfterLabel(
    text,
    [
      'nombre\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
      't[ií]tulo\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
      'denominaci[oó]n\\s*(?:de\\s+la\\s+)?licitaci[oó]n',
    ],
    180,
  )

  if (labeled && !/\d{3,8}-\d{1,3}-[A-Z0-9]{2,4}\d*/i.test(labeled)) return labeled

  return (
    firstMatch(text, [
      /\b((?:ARRIENDO|ADQUISICI[OÓ]N|SERVICIO|SERVICIOS|SUMINISTRO|CONTRATACI[OÓ]N|PRODUCCI[OÓ]N|INSTALACI[OÓ]N|HABILITACI[OÓ]N|MANTENCI[OÓ]N)[A-ZÁÉÍÓÚÑ0-9\s/,\-.]{10,140}?)(?=\s+(?:ID|C[ÓO]DIGO|COMPRADOR|MANDANTE|OBJETO|DESCRIPCI[ÓO]N|PRESUPUESTO|FECHA|BASES|DOCUMENTOS?|CRITERIOS?|GARANT[ÍI]A|FORMA\s+DE\s+PAGO|MULTA)|$)/i,
    ]) ||
    getChunks(text).find((chunk) => {
      const normalized = normalizeForSearch(chunk)

      return (
        /(arriendo|adquisicion|servicio|suministro|contratacion|produccion|instalacion|feria|stand|stands|licitacion)/i.test(
          normalized,
        ) &&
        chunk.length >= 12 &&
        chunk.length <= 180 &&
        !/(fecha|presupuesto|comprador|garant[ií]a|multa|criterio|documento|anexo)/i.test(chunk)
      )
    }) ||
    ''
  )
}

const extractSection = (text, keywords, limit = 18) => {
  const normalizedKeywords = keywords.map(normalizeForSearch)
  const matches = []
  const chunks = getChunks(text)

  chunks.forEach((chunk, index) => {
    const normalized = normalizeForSearch(chunk)

    if (!normalizedKeywords.some((keyword) => normalized.includes(keyword))) return

    matches.push(limitValue(chunk, 320))

    chunks.slice(index + 1, index + 6).forEach((nextChunk) => {
      const normalizedNext = normalizeForSearch(nextChunk)
      const isBullet = /^(?:[-•]|\d{1,2}[.)]|[a-z]\))\s+/i.test(nextChunk)

      if (
        normalizedKeywords.some((keyword) => normalizedNext.includes(keyword)) ||
        isBullet ||
        /anexo|formulario|declaraci[oó]n|certificado|precio|experiencia|plazo|cumplimiento|porcentaje|%/i.test(
          nextChunk,
        )
      ) {
        matches.push(limitValue(nextChunk, 320))
      }
    })
  })

  return [...new Set(matches.filter(Boolean))].slice(0, limit)
}

const extractEconomicItems = (sources, combinedText, title, object) => {
  const fromEconomicFiles = sources
    .filter((source) => ECONOMIC_FILE_PATTERN.test(source.fileName))
    .flatMap((source) =>
      getChunks(source.text)
        .filter((chunk) =>
          /ítem|item|partida|producto|servicio|cantidad|valor|precio|total|stand|stands/i.test(
            chunk,
          ),
        )
        .map((chunk) => `${limitValue(chunk, 260)} (${source.fileName})`),
    )
  const fromText = getChunks(combinedText)
    .filter((chunk) =>
      /(ítem|item|partida|producto|servicio|suministro|instalaci[oó]n|arriendo|stand|stands|feria|mobiliario|m[oó]dulo|montaje|desmontaje|gr[aá]fica)/i.test(
        chunk,
      ),
    )
    .map((chunk) => limitValue(chunk, 260))
  const titleItems =
    /(arriendo|stand|stands|feria|servicio|suministro|instalaci[oó]n|producci[oó]n)/i.test(title)
      ? [title]
      : []
  const objectItems = object && object !== title ? [object] : []

  return [...new Set([...fromEconomicFiles, ...titleItems, ...objectItems, ...fromText])]
    .filter(Boolean)
    .slice(0, 22)
}

const buildSuggestedQuestions = ({
  text,
  guarantees,
  technicalItems,
  paymentTerms,
  evaluationCriteria,
}) => {
  const questions = []

  if (guarantees.length > 0)
    questions.push('Confirmar montos, vigencia y formato aceptado para garantías.')
  if (technicalItems.length > 0)
    questions.push(
      'Solicitar aclaración de cantidades, medidas, materialidad, montaje y desmontaje.',
    )
  if (
    paymentTerms.length === 0 ||
    /factura|recepci[oó]n conforme|30|60|contra entrega/i.test(text)
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
  if (/visita|terreno/i.test(text))
    questions.push('Confirmar si la visita a terreno es obligatoria y cómo se acredita asistencia.')
  if (/muestra|prototipo/i.test(text))
    questions.push('Confirmar si se exige muestra física, plazo de entrega y costo asociado.')
  if (/cronograma|modific|rectific|aclaraci[oó]n/i.test(text)) {
    questions.push(
      'Confirmar si el cronograma vigente corresponde a una modificación o aclaración posterior.',
    )
  }

  return [...new Set(questions)]
}

const analyzeTenderWithAI = async () => ({
  enabled: false,
  message:
    'Preparado para futura integración IA. No se ejecuta análisis externo porque no hay API key configurada en backend.',
})

const analyzeTenderContent = ({ sources = [], manualText = '' }) => {
  const normalizedSources = sources.filter((source) => source.text?.trim())
  const combinedText = [
    ...normalizedSources.map((source) => `--- ${source.fileName} ---\n${source.text}`),
    manualText ? `--- texto-manual ---\n${manualText}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const sourceFiles = sources.map((source) => ({
    name: source.fileName,
    type: source.fileType,
    warningCount: source.warnings?.length || 0,
  }))
  const tenderId =
    firstMatch(combinedText, [
      /\b(\d{3,8}-\d{1,3}-[A-Z0-9]{2,4}\d*)\b/i,
      /(?:id|c[oó]digo)\s*(?:de\s+licitaci[oó]n)?\s*[:\-]?\s*([A-Z0-9\-]{6,})/i,
    ]) || ''
  const title = extractTitle(combinedText)
  const buyer =
    extractAfterLabel(
      combinedText,
      [
        'comprador',
        'organismo\\s+comprador',
        'mandante',
        'entidad\\s+licitante',
        'instituci[oó]n\\s+compradora',
      ],
      170,
    ) ||
    firstMatch(combinedText, [
      /\b(Fondo\s+de\s+Agua\s+de\s+Santiago)\b/i,
      /\b((?:ilustre\s+)?municipalidad\s+de\s+[^.;\n]{3,90})/i,
      /\b((?:fondo|fundaci[oó]n|corporaci[oó]n|universidad|ministerio|subsecretar[ií]a|direcci[oó]n|servicio|gobierno|hospital|instituto|centro)\s+[^.;\n]{3,100})/i,
    ])
  const object =
    extractAfterLabel(
      combinedText,
      [
        'objeto\\s*de\\s+la\\s+contrataci[oó]n',
        'objeto\\s*de\\s+contrataci[oó]n',
        'objeto\\s*de\\s+licitaci[oó]n',
        'objeto',
        'descripci[oó]n\\s+de\\s+licitaci[oó]n',
        'descripci[oó]n\\s+de\\s+la\\s+contrataci[oó]n',
        'descripci[oó]n',
      ],
      380,
    ).replace(/^de\s+(?:la\s+)?(?:contrataci[oó?]n|licitaci[oó?]n)\s*[:\-–—]?\s*/i, '') || title
  const budget = extractBudget(normalizedSources, combinedText)
  const closingDate = extractDate(normalizedSources, [
    /fecha de cierre/,
    /cierre de ofertas/,
    /recepcion de ofertas/,
    /cierre/,
  ])
  const openingDate = extractDate(normalizedSources, [
    /apertura tecnica/,
    /apertura economica/,
    /fecha de apertura/,
    /apertura/,
  ])
  const adjudicationDate = extractDate(normalizedSources, [/fecha de adjudicacion/, /adjudicacion/])
  const contractSignDate = extractDate(normalizedSources, [
    /firma de contrato/,
    /suscripcion del contrato/,
    /fecha limite de contrato/,
    /contrato/,
  ])
  const administrativeRequirements = extractSection(combinedText, [
    'administrativo',
    'declaración jurada',
    'declaracion jurada',
    'antecedentes',
    'chileproveedores',
    'habilidad',
    'inhabilidad',
  ])
  const technicalRequirements = extractSection(combinedText, [
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
  ])
  const economicRequirements = extractSection(combinedText, [
    'económico',
    'economico',
    'oferta económica',
    'oferta economica',
    'precio',
    'presupuesto',
    'formulario económico',
    'formulario economico',
  ])
  const requiredDocuments = extractSection(combinedText, [
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
  ])
  const essentialDocuments = extractSection(combinedText, [
    'esencial',
    'obligatorio',
    'inadmisible',
    'excluyente',
    'fuera de bases',
    'requisito de admisibilidad',
  ])
  const evaluationCriteria = [
    ...extractSection(combinedText, [
      'criterio',
      'evaluación',
      'evaluacion',
      'ponderación',
      'ponderacion',
      'puntaje',
      'porcentaje',
      '%',
    ]),
  ].filter((item) => !/multa|sanci[oó]n|penalidad|atraso/i.test(item))
  const guarantees = extractSection(combinedText, [
    'garantía',
    'garantia',
    'boleta',
    'seriedad',
    'fiel cumplimiento',
    'vale vista',
    'póliza',
    'poliza',
  ])
  const paymentTerms = extractSection(combinedText, [
    'pago',
    'factura',
    'recepción conforme',
    'recepcion conforme',
    'estado de pago',
    '30 días',
    '30 dias',
    'contra entrega',
  ])
  const penalties = extractSection(combinedText, [
    'multa',
    'sanción',
    'sancion',
    'atraso',
    'penalidad',
    'incumplimiento',
  ])
  const technicalItems = extractEconomicItems(normalizedSources, combinedText, title, object)
  const risks = [
    ...essentialDocuments.map((item) => `Documento esencial: ${item}`),
    ...guarantees.map((item) => `Garantía requerida: ${item}`),
    ...penalties.map((item) => `Multa o sanción: ${item}`),
  ]

  if (/visita\s+(a\s+)?terreno|visita\s+obligatoria/i.test(combinedText))
    risks.push('Puede existir visita a terreno obligatoria.')
  if (/muestra|prototipo/i.test(combinedText))
    risks.push('Puede existir exigencia de muestra o prototipo.')
  if (
    /fuera\s+de\s+plazo|no\s+ser[aá]\s+evaluad|inadmisible|rechazo\s+de\s+la\s+oferta|declarada\s+inadmisible/i.test(
      combinedText,
    )
  ) {
    risks.push('Hay cláusulas de inadmisibilidad o rechazo por incumplimiento formal.')
  }
  if (MODIFIED_SCHEDULE_PATTERN.test(combinedText)) {
    risks.push(
      'Existe referencia a cronograma modificado; validar que las fechas vigentes sean las últimas.',
    )
  }

  const riskLevel =
    /inadmisible|excluyente|boleta|garant[ií]a|visita obligatoria|fuera de plazo/i.test(
      risks.join(' '),
    )
      ? 'Alto'
      : risks.length >= 4
        ? 'Medio'
        : 'Bajo'
  const summary = [
    title,
    buyer ? `Comprador: ${buyer}` : '',
    object ? `Objeto: ${object}` : '',
    budget.value ? `Presupuesto disponible: $${Number(budget.value).toLocaleString('es-CL')}` : '',
    closingDate.value ? `Cierre: ${closingDate.value}` : '',
    `Riesgo preliminar: ${riskLevel}`,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    tenderId,
    title,
    buyer,
    budget: budget.value,
    closingDate: closingDate.value,
    openingDate: openingDate.value,
    adjudicationDate: adjudicationDate.value,
    contractSignDate: contractSignDate.value,
    object,
    summary,
    administrativeRequirements,
    technicalRequirements,
    economicRequirements,
    requiredDocuments,
    essentialDocuments,
    evaluationCriteria: [...new Set(evaluationCriteria)],
    guarantees,
    paymentTerms,
    penalties,
    risks: [...new Set(risks)],
    suggestedQuestions: buildSuggestedQuestions({
      text: combinedText,
      guarantees,
      technicalItems,
      paymentTerms,
      evaluationCriteria,
    }),
    technicalItems,
    sourceFiles,
    extractedText: combinedText,
    fieldSources: {
      tenderId: sourceForText(tenderId, normalizedSources),
      title: sourceForText(title, normalizedSources),
      buyer: sourceForText(buyer, normalizedSources),
      budget: budget.source,
      closingDate: closingDate.source,
      openingDate: openingDate.source,
      adjudicationDate: adjudicationDate.source,
      contractSignDate: contractSignDate.source,
      object: sourceForText(object, normalizedSources),
    },
  }
}

module.exports = { analyzeTenderContent, analyzeTenderWithAI }
