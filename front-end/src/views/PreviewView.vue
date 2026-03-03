<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useTemplatesStore } from '@/stores/templates'
import { useToastStore } from '@/stores/toast'
import Mustache from 'mustache'
import {
  useListStructuresApiV1StructuresGet,
  useListTemplatesApiV1TemplatesGet,
} from '@/api/client'
import type { PreviewDataResponse } from '@/api/client'
import {
  type DesignerFilterOperator,
  parseDesignerModelFromDefinition,
  parseDesignerModelFromHtml,
  renderDesignerModelToHtml,
  serializeDesignerDefinition,
  stripDesignerMeta,
} from '@/utils/designerReport'
import type { DesignerModel } from '@/utils/designerReport'
import { enrichDataForRendering, extractRows } from '@/utils/reportData'
import { extractTemplateStyles, prependStyleBlock } from '@/utils/templateStyles'
import { validateTemplateHtml } from '@/utils/templateValidation'
import { customInstance } from '@/api/axios-instance'

const templatesStore = useTemplatesStore()
const toastStore = useToastStore()

const { data: structures } = useListStructuresApiV1StructuresGet()
const { data: templates } = useListTemplatesApiV1TemplatesGet()

const activeTemplate = computed(() =>
  templates.value?.find((t) => t.id === templatesStore.activeTemplateId) ?? null
)

const previewDataResult = ref<Record<string, unknown>>({})
const loadingData = ref(false)
const exporting = ref(false)
const previewError = ref<string | null>(null)
const pageSize = ref<'A4' | 'Letter'>('A4')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const marginMm = ref(10)
const density = ref<'compact' | 'comfortable'>('compact')
const enablePagination = ref(true)
const rowsPerPage = ref(5)
const previewParameterOverrides = ref<Record<string, string | string[]>>({})
const previewFilterDebug = ref<Record<string, unknown> | null>(null)
const previewExecutedQuery = ref<string>('')
const parameterOptions = ref<Record<string, string[]>>({})
const parameterValidationErrors = ref<Record<string, string>>({})
let filterReloadTimeout: ReturnType<typeof setTimeout> | null = null
let parameterOptionsReloadTimeout: ReturnType<typeof setTimeout> | null = null
let previewLoadRequestSeq = 0
let parameterOptionsRequestSeq = 0

const EXPORT_CHUNK_SIZE = 5000
const MAX_EXPORT_ROWS = 100000

type RuntimeFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'

interface RuntimeFilterPayload {
  field: string
  operator: RuntimeFilterOperator
  value: unknown
}

interface RuntimeSortPayload {
  field: string
  direction: 'asc' | 'desc'
}

const PARAMETER_LABEL_ALIASES: Record<string, string[]> = {
  dept: ['department', 'dept'],
  status: ['status'],
  curr: ['currency', 'curr', 'currency_code'],
  user: ['user', 'user_name', 'created_by', 'owner'],
}

const normalizedMarginMm = computed(() => {
  const parsed = Number(marginMm.value)
  if (!Number.isFinite(parsed)) return 10
  return Math.min(30, Math.max(5, parsed))
})

const normalizedRowsPerPage = computed(() => {
  const parsed = Number(rowsPerPage.value)
  if (!Number.isFinite(parsed)) return 5
  return Math.min(200, Math.max(1, Math.floor(parsed)))
})

function chunkRows(rows: Record<string, unknown>[], size: number): Record<string, unknown>[][] {
  if (size <= 0 || rows.length === 0) return [rows]
  const chunks: Record<string, unknown>[][] = []
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size))
  }
  return chunks
}

interface PreviewStructureFieldNode {
  name: string
  type: string
  children?: PreviewStructureFieldNode[]
}

function flattenStructurePaths(
  fields: PreviewStructureFieldNode[] = [],
  parentPath = '',
): string[] {
  const out: string[] = []
  fields.forEach((field) => {
    const path = parentPath ? `${parentPath}.${field.name}` : field.name
    out.push(path)
    if (Array.isArray(field.children) && field.children.length > 0) {
      out.push(...flattenStructurePaths(field.children, path))
    }
  })
  return out
}

function normalizeToken(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isWildcardParameterValue(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toUpperCase()
  return normalized === 'ALL' || normalized === '(ALL)' || normalized === '*'
}

function normalizeOverrideValue(value: string | string[] | undefined, fallback = ''): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return fallback
}

function parseStaticOptionsCsv(csv: string | undefined): string[] {
  if (!csv) return []
  return Array.from(new Set(csv.split(',').map((item) => item.trim()).filter(Boolean)))
}

function formatParameterKey(index: number, label: string): string {
  return `${index}:${label.trim().toLowerCase()}`
}

function toFilterOperator(operator?: DesignerFilterOperator): RuntimeFilterOperator {
  if (!operator) return 'equals'
  return operator
}

function renderTemplateWithPaging(
  templateHtml: string,
  data: Record<string, unknown>,
  options: { paginate: boolean; rowsPerPage: number },
  definitionJson?: unknown,
): string {
  const validation = validateTemplateHtml(templateHtml)
  if (!validation.isValid) {
    throw new Error(`Template validation failed: ${validation.errors[0]}`)
  }

  const designerModel = parseDesignerModelFromDefinition(definitionJson)
    ?? parseDesignerModelFromHtml(templateHtml)
  const totalFields = designerModel?.showGrandTotal ? designerModel.totalFields : []
  const enrichmentOptions = {
    totalFields,
    groupByField: designerModel?.groupByField,
    showGroupSubtotals: designerModel?.showGroupSubtotals,
    sortByField: designerModel?.sortByField,
    sortDirection: designerModel?.sortDirection,
    conditionalRules: designerModel?.conditionalRules || [],
  }
  const parameterContext: Record<string, unknown> = {}
  designerModel?.parameters.forEach((param) => {
    if (!param.label) return
    parameterContext[param.label] = param.value
  })
  const enrichedData = {
    ...enrichDataForRendering(data, enrichmentOptions),
    ...parameterContext,
  }

  const strippedHtml = stripDesignerMeta(templateHtml).trim()
  const generatedDesignerHtml = designerModel
    ? stripDesignerMeta(renderDesignerModelToHtml(designerModel)).trim()
    : ''
  const templateWithMeta = strippedHtml || generatedDesignerHtml || templateHtml
  const { html: templateBody, css } = extractTemplateStyles(templateWithMeta)

  if (!options.paginate) {
    return prependStyleBlock(Mustache.render(templateBody, enrichedData), css)
  }

  const rows = extractRows(enrichedData)
  if (rows.length === 0) {
    return prependStyleBlock(Mustache.render(templateBody, {
      ...enrichedData,
      page_number: 1,
      total_pages: 1,
      rows: [],
    }), css)
  }

  const pages = chunkRows(rows, options.rowsPerPage)
  const totalRows = rows.length
  const totalPages = pages.length

  const pageHtml = pages.map((pageRows, pageIndex) => {
    const start = pageIndex * options.rowsPerPage
    const rowsWithMeta = pageRows.map((row, idx) => ({
      ...row,
      _index: start + idx + 1,
      _total: totalRows,
    }))
    const pageEnriched = enrichDataForRendering(
      {
        ...data,
        rows: rowsWithMeta,
      },
      enrichmentOptions,
    )

    return Mustache.render(templateBody, {
      ...enrichedData,
      ...pageEnriched,
      rows: rowsWithMeta,
      page_number: pageIndex + 1,
      total_pages: totalPages,
    })
  })

  const pagedHtml = pageHtml
    .map((html, index) => {
      const isLast = index === pageHtml.length - 1
      return `<div class="ssrs-page-shell${isLast ? ' is-last' : ''}">${html}</div>`
    })
    .join('\n')

  return prependStyleBlock(pagedHtml, css)
}

async function loadPreview() {
  const template = activeTemplate.value
  if (!template) { previewDataResult.value = {}; return }
  const requestSeq = ++previewLoadRequestSeq
  const templateId = template.id!
  loadingData.value = true
  try {
    previewError.value = null
    const previewLimit = enablePagination.value
      ? Math.min(120, Math.max(10, normalizedRowsPerPage.value * 3))
      : 10
    const result = await fetchPreviewData(
      templateId,
      previewLimit,
      previewRuntimeFilters.value,
      previewRuntimeGroupBy.value,
      previewRuntimeSorts.value,
      0,
    )
    if (requestSeq !== previewLoadRequestSeq || templateId !== activeTemplate.value?.id) {
      return
    }
    previewDataResult.value = result.data ?? {}
    previewExecutedQuery.value = result.executed_query || ''
    previewFilterDebug.value = (result.filter_debug || null) as Record<string, unknown> | null
  } catch (err) {
    if (requestSeq !== previewLoadRequestSeq || templateId !== activeTemplate.value?.id) {
      return
    }
    previewError.value = err instanceof Error ? err.message : 'Failed to load preview data'
    previewDataResult.value = {}
    previewExecutedQuery.value = ''
    previewFilterDebug.value = null
  } finally {
    if (requestSeq === previewLoadRequestSeq) {
      loadingData.value = false
    }
  }
}

interface ExtendedPreviewResponse extends PreviewDataResponse {
  query?: string | null
  executed_query?: string
  filter_debug?: Record<string, unknown>
  row_count?: number
}

async function fetchPreviewData(
  templateId: string,
  limit: number,
  filters: RuntimeFilterPayload[],
  groupBy?: string,
  sorts: RuntimeSortPayload[] = [],
  offset = 0,
): Promise<ExtendedPreviewResponse> {
  return customInstance<ExtendedPreviewResponse>({
    url: `/api/v1/templates/${templateId}/preview-data`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      limit,
      offset,
      filters,
      group_by: groupBy || undefined,
      sorts,
    },
  })
}

async function fetchAllDataForExport(
  templateId: string,
  filters: RuntimeFilterPayload[],
  groupBy?: string,
  sorts: RuntimeSortPayload[] = [],
): Promise<ExtendedPreviewResponse> {
  let offset = 0
  let firstResponse: ExtendedPreviewResponse | null = null
  let latestExecutedQuery = ''
  let latestFilterDebug: Record<string, unknown> | undefined
  const allRows: Record<string, unknown>[] = []

  while (offset < MAX_EXPORT_ROWS) {
    const chunk = await fetchPreviewData(
      templateId,
      EXPORT_CHUNK_SIZE,
      filters,
      groupBy,
      sorts,
      offset,
    )
    if (!firstResponse) firstResponse = chunk
    latestExecutedQuery = chunk.executed_query || latestExecutedQuery
    latestFilterDebug = chunk.filter_debug || latestFilterDebug

    const chunkRows = Array.isArray(chunk.data?.rows)
      ? (chunk.data?.rows as Record<string, unknown>[])
      : []
    if (!chunkRows.length) break

    allRows.push(...chunkRows)
    offset += chunkRows.length
    if (chunkRows.length < EXPORT_CHUNK_SIZE) break
  }

  if (!firstResponse) {
    return { data: { rows: [] }, row_count: 0 }
  }

  if (allRows.length >= MAX_EXPORT_ROWS) {
    toastStore.warning(`Export capped at ${MAX_EXPORT_ROWS.toLocaleString()} rows`)
  }

  const normalizedRows = allRows.map((row, idx) => ({
    ...row,
    _index: idx + 1,
    _total: allRows.length,
  }))

  return {
    ...firstResponse,
    data: {
      ...(firstResponse.data || {}),
      rows: normalizedRows,
    },
    row_count: normalizedRows.length,
    executed_query: latestExecutedQuery || firstResponse.executed_query,
    filter_debug: latestFilterDebug || firstResponse.filter_debug,
  }
}

async function fetchParameterOptions(
  templateId: string,
  field: string,
  filters: RuntimeFilterPayload[],
): Promise<string[]> {
  const result = await customInstance<{ field: string; values: string[] }>({
    url: `/api/v1/templates/${templateId}/parameter-options`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      field,
      limit: 100,
      filters,
    },
  })
  return result.values || []
}

watch(
  [() => activeTemplate.value?.id, () => enablePagination.value, () => normalizedRowsPerPage.value],
  () => { loadPreview() },
  { immediate: true }
)

const templateOptions = computed(() =>
  (templates.value ?? []).filter((t): t is typeof t & { id: string } => Boolean(t.id))
)

watch(templateOptions, (options) => {
  if (!options.length) return
  const current = templatesStore.activeTemplateId
  const stillExists = options.some((t) => t.id === current)
  if (!stillExists) {
    templatesStore.setActiveTemplate(options[0].id)
  }
}, { immediate: true })

const activeStructure = computed(() => {
  if (!activeTemplate.value) return null
  return structures.value?.find((item) => item.id === activeTemplate.value!.structure_id) ?? null
})

function parameterOverrideKey(index: number, label: string): string {
  return formatParameterKey(index, label)
}

function resolveDesignerModel(template: NonNullable<typeof activeTemplate.value>): DesignerModel | null {
  return parseDesignerModelFromDefinition(template.definition_json)
    ?? parseDesignerModelFromHtml(template.html_content ?? '')
}

const activeDesignerModel = computed<DesignerModel | null>(() => {
  if (!activeTemplate.value) return null
  return resolveDesignerModel(activeTemplate.value)
})

const previewRuntimeDesignerModel = computed<DesignerModel | null>(() => {
  const model = activeDesignerModel.value
  if (!model) return null
  if (!model.parameters.length) return model
  return {
    ...model,
    parameters: model.parameters.map((param, index) => {
      const key = parameterOverrideKey(index, param.label)
      const override = previewParameterOverrides.value[key]
      const fallback = param.defaultValue || param.value
      return {
        ...param,
        value: normalizeOverrideValue(override, fallback),
      }
    }),
  }
})

const hasPreviewParameters = computed(() => {
  return (previewRuntimeDesignerModel.value?.parameters.length ?? 0) > 0
})

const filterCandidateFields = computed(() => {
  const candidateSet = new Set<string>()

  const structureFields = (activeStructure.value?.fields ?? []) as unknown as PreviewStructureFieldNode[]
  flattenStructurePaths(structureFields).forEach((path) => {
    const topLevel = path.split('.')[0]
    if (topLevel) candidateSet.add(topLevel)
  })

  previewRuntimeDesignerModel.value?.columns?.forEach((column) => {
    const topLevel = (column.key || '').split('.')[0]
    if (topLevel) candidateSet.add(topLevel)
  })

  const firstRow = Array.isArray(previewDataResult.value.rows)
    ? (previewDataResult.value.rows[0] as Record<string, unknown> | undefined)
    : undefined
  if (firstRow) {
    Object.keys(firstRow)
      .filter((key) => !key.startsWith('_'))
      .forEach((key) => candidateSet.add(key))
  }

  return Array.from(candidateSet)
})

function inferFilterFieldFromLabel(label: string): string | null {
  const candidates = filterCandidateFields.value
  if (!candidates.length) return null

  const normalizedToField = new Map<string, string>()
  candidates.forEach((field) => {
    normalizedToField.set(normalizeToken(field), field)
  })

  const labelToken = normalizeToken(label)
  if (!labelToken) return null

  const aliasTokens = PARAMETER_LABEL_ALIASES[labelToken] ?? []
  const preferredTokens = [labelToken, ...aliasTokens.map((item) => normalizeToken(item))]

  for (const token of preferredTokens) {
    const exact = normalizedToField.get(token)
    if (exact) return exact
  }

  const fuzzy = candidates.find((field) => {
    const fieldToken = normalizeToken(field)
    return fieldToken.includes(labelToken) || labelToken.includes(fieldToken)
  })
  return fuzzy ?? null
}

function effectiveFilterFieldForParam(param: { label: string; filterField?: string }): string {
  const explicitField = (param.filterField || '').trim()
  if (explicitField) return explicitField
  return inferFilterFieldFromLabel(param.label) || ''
}

function effectiveOptionsFieldForParam(
  param: { label: string; optionsSourceField?: string; filterField?: string },
): string {
  const explicit = (param.optionsSourceField || '').trim()
  if (explicit) return explicit
  return effectiveFilterFieldForParam(param)
}

function resolveParameterRawValue(
  param: { label: string; value: string; defaultValue?: string },
  index: number,
): string | string[] {
  const key = parameterOverrideKey(index, param.label)
  const override = previewParameterOverrides.value[key]
  if (Array.isArray(override)) return override
  if (typeof override === 'string') return override
  return param.defaultValue || param.value
}

function normalizeTypedParameterValue(
  value: string | string[],
  dataType: string | undefined,
  allowMultiple: boolean | undefined,
): { normalized: unknown; error?: string } {
  if (allowMultiple) {
    const list = Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
    return { normalized: list }
  }

  const text = Array.isArray(value) ? value.join(',') : String(value || '')
  const trimmed = text.trim()
  if (!trimmed) return { normalized: '' }

  if (dataType === 'number') {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) {
      return { normalized: trimmed, error: 'Must be a valid number' }
    }
    return { normalized: numeric }
  }
  if (dataType === 'date') {
    const parsed = Date.parse(trimmed)
    if (Number.isNaN(parsed)) {
      return { normalized: trimmed, error: 'Must be a valid date' }
    }
    return { normalized: trimmed }
  }
  if (dataType === 'boolean') {
    const lower = trimmed.toLowerCase()
    if (['true', '1', 'yes'].includes(lower)) return { normalized: true }
    if (['false', '0', 'no'].includes(lower)) return { normalized: false }
    return { normalized: trimmed, error: 'Must be true or false' }
  }
  return { normalized: trimmed }
}

function collectRuntimeFilters(
  model: DesignerModel | null,
  options?: { skipParameterIndex?: number; collectErrors?: boolean },
): { filters: RuntimeFilterPayload[]; errors: Record<string, string> } {
  if (!model) return { filters: [], errors: {} }
  const skipIndex = options?.skipParameterIndex ?? -1
  const collectErrors = Boolean(options?.collectErrors)
  const nextErrors: Record<string, string> = {}
  const filters: RuntimeFilterPayload[] = []

  model.parameters.forEach((param, index) => {
    if (index === skipIndex) return
    const key = parameterOverrideKey(index, param.label)
    const rawValue = resolveParameterRawValue(param, index)
    const { normalized, error } = normalizeTypedParameterValue(rawValue, param.dataType, param.allowMultiple)
    const normalizedString = Array.isArray(normalized) ? normalized.join(',') : String(normalized ?? '')

    if (param.required && (!normalizedString || normalizedString.trim() === '')) {
      if (collectErrors) nextErrors[key] = 'This parameter is required'
      return
    }
    if (error) {
      if (collectErrors) nextErrors[key] = error
      return
    }

    const field = effectiveFilterFieldForParam(param)
    if (!field) return
    if (normalized === null || normalized === undefined || normalizedString.trim() === '') return
    if (isWildcardParameterValue(normalized)) return

    let operator = toFilterOperator(param.filterOperator)
    if (param.allowMultiple && operator === 'equals') {
      operator = 'in'
    }
    if (operator === 'equals' && typeof normalized === 'string' && normalized.includes(',')) {
      operator = 'in'
    }

    filters.push({
      field,
      operator,
      value: normalized,
    })
  })

  return { filters, errors: nextErrors }
}

const previewRuntimeFilters = computed<RuntimeFilterPayload[]>(() => {
  const { filters, errors } = collectRuntimeFilters(previewRuntimeDesignerModel.value, { collectErrors: true })
  parameterValidationErrors.value = errors
  return filters
})

const previewRuntimeGroupBy = computed(() => {
  const group = (previewRuntimeDesignerModel.value?.groupByField || '').trim()
  return group || undefined
})

const previewRuntimeSorts = computed<RuntimeSortPayload[]>(() => {
  const model = previewRuntimeDesignerModel.value
  if (!model) return []
  const sortField = (model.sortByField || '').trim()
  if (!sortField) return []
  return [{
    field: sortField,
    direction: model.sortDirection === 'desc' ? 'desc' : 'asc',
  }]
})

const previewRuntimeQuerySignature = computed(() => JSON.stringify({
  filters: previewRuntimeFilters.value,
  groupBy: previewRuntimeGroupBy.value,
  sorts: previewRuntimeSorts.value,
}))

function seedParameterOverrides() {
  const model = activeDesignerModel.value
  if (!model) {
    previewParameterOverrides.value = {}
    return
  }
  const seeded: Record<string, string | string[]> = {}
  model.parameters.forEach((param, index) => {
    const initial = param.defaultValue || param.value
    seeded[parameterOverrideKey(index, param.label)] = param.allowMultiple
      ? parseStaticOptionsCsv(initial)
      : initial
  })
  previewParameterOverrides.value = seeded
}

function resetParameterOverrides() {
  seedParameterOverrides()
}

watch(() => activeTemplate.value?.id, () => {
  parameterOptions.value = {}
  parameterOptionsRequestSeq += 1
  seedParameterOverrides()
}, { immediate: true })

function isDependencySatisfied(model: DesignerModel, index: number): boolean {
  const param = model.parameters[index]
  const dependencyLabel = (param.dependsOn || '').trim().toLowerCase()
  if (!dependencyLabel) return true
  const depIndex = model.parameters.findIndex(
    (item) => item.label.trim().toLowerCase() === dependencyLabel,
  )
  if (depIndex < 0) return true
  const depValue = resolveParameterRawValue(model.parameters[depIndex], depIndex)
  if (Array.isArray(depValue)) return depValue.length > 0
  if (!depValue || !String(depValue).trim()) return false
  return !isWildcardParameterValue(depValue)
}

async function reloadParameterOptions() {
  const model = previewRuntimeDesignerModel.value
  const templateId = activeTemplate.value?.id
  const requestSeq = ++parameterOptionsRequestSeq
  if (!model || !templateId) {
    if (requestSeq === parameterOptionsRequestSeq) {
      parameterOptions.value = {}
    }
    return
  }

  const nextOptions: Record<string, string[]> = {}
  for (let index = 0; index < model.parameters.length; index++) {
    if (requestSeq !== parameterOptionsRequestSeq || templateId !== activeTemplate.value?.id) return
    const param = model.parameters[index]
    const key = parameterOverrideKey(index, param.label)
    const staticOptions = param.staticOptions || []
    if (staticOptions.length > 0) {
      nextOptions[key] = staticOptions
      continue
    }

    const optionsField = effectiveOptionsFieldForParam(param)
    if (!optionsField) continue
    if (!isDependencySatisfied(model, index)) {
      nextOptions[key] = []
      continue
    }

    try {
      const cascadeFilters = collectRuntimeFilters(model, { skipParameterIndex: index }).filters
      nextOptions[key] = await fetchParameterOptions(templateId, optionsField, cascadeFilters)
      if (requestSeq !== parameterOptionsRequestSeq || templateId !== activeTemplate.value?.id) return
    } catch {
      nextOptions[key] = []
    }
  }

  if (requestSeq === parameterOptionsRequestSeq && templateId === activeTemplate.value?.id) {
    parameterOptions.value = nextOptions
  }
}

function queueReloadParameterOptions() {
  if (parameterOptionsReloadTimeout) clearTimeout(parameterOptionsReloadTimeout)
  parameterOptionsReloadTimeout = setTimeout(() => {
    reloadParameterOptions()
  }, 200)
}

function parameterOptionsFor(index: number, label: string): string[] {
  return parameterOptions.value[parameterOverrideKey(index, label)] || []
}

function updateParameterOverride(index: number, label: string, value: string) {
  previewParameterOverrides.value[parameterOverrideKey(index, label)] = value
}

function updateMultiSelectOverride(index: number, label: string, event: Event) {
  const target = event.target as HTMLSelectElement
  const selected = Array.from(target.selectedOptions).map((option) => option.value)
  previewParameterOverrides.value[parameterOverrideKey(index, label)] = selected
}

function parameterInputType(param: { dataType?: string }): 'text' | 'number' | 'date' {
  if (param.dataType === 'number') return 'number'
  if (param.dataType === 'date') return 'date'
  return 'text'
}

const hasParameterErrors = computed(() => Object.keys(parameterValidationErrors.value).length > 0)

const renderedResult = computed((): { html: string; error: string | null } => {
  if (!activeTemplate.value) {
    return { html: '', error: null }
  }
  try {
    const runtimeModel = previewRuntimeDesignerModel.value
    const templateHtml = resolveTemplateHtml(activeTemplate.value, runtimeModel)
    const runtimeDefinition = runtimeModel
      ? serializeDesignerDefinition(runtimeModel)
      : activeTemplate.value.definition_json
    return {
      html: renderTemplateWithPaging(
        templateHtml,
        previewDataResult.value,
        {
          paginate: enablePagination.value,
          rowsPerPage: normalizedRowsPerPage.value,
        },
        runtimeDefinition,
      ),
      error: null,
    }
  } catch (err) {
    return {
      html: '',
      error: err instanceof Error ? err.message : 'Template render failed',
    }
  }
})

const renderedHtml = computed(() => renderedResult.value.html)

watch(renderedResult, (result) => {
  previewError.value = result.error
}, { immediate: true })

watch(
  () => previewRuntimeQuerySignature.value,
  () => {
    if (!activeTemplate.value) return
    if (hasParameterErrors.value) return
    if (filterReloadTimeout) clearTimeout(filterReloadTimeout)
    filterReloadTimeout = setTimeout(() => {
      loadPreview()
    }, 250)
  },
)

watch(
  () => JSON.stringify({
    templateId: activeTemplate.value?.id || '',
    overrides: previewParameterOverrides.value,
    model: previewRuntimeDesignerModel.value?.parameters ?? [],
  }),
  () => {
    queueReloadParameterOptions()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (filterReloadTimeout) clearTimeout(filterReloadTimeout)
  if (parameterOptionsReloadTimeout) clearTimeout(parameterOptionsReloadTimeout)
})

const SCRIPT_END = '</' + 'script>'

const CHART_RENDER_SCRIPT = `
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js">${SCRIPT_END}
<script>
document.addEventListener('DOMContentLoaded', function() {
  var COLORS = [
    'rgba(52,152,219,0.8)','rgba(46,204,113,0.8)','rgba(155,89,182,0.8)',
    'rgba(241,196,15,0.8)','rgba(231,76,60,0.8)','rgba(26,188,156,0.8)',
    'rgba(230,126,34,0.8)'
  ];
  var BORDERS = [
    'rgba(52,152,219,1)','rgba(46,204,113,1)','rgba(155,89,182,1)',
    'rgba(241,196,15,1)','rgba(231,76,60,1)','rgba(26,188,156,1)',
    'rgba(230,126,34,1)'
  ];

  function parse(el) {
    var l = (el.getAttribute('data-labels') || '').replace(/^\\[|]$/g, '');
    var v = (el.getAttribute('data-values') || '').replace(/^\\[|]$/g, '');
    return {
      labels: l.split(',').map(function(s){return s.trim()}).filter(Boolean),
      values: v.split(',').map(function(s){return s.trim()}).filter(Boolean).map(Number)
    };
  }

  function render(selector, type) {
    document.querySelectorAll(selector).forEach(function(el) {
      var d = parse(el);
      if (!d.labels.length) return;
      var canvas = document.createElement('canvas');
      canvas.style.maxHeight = '300px';
      el.innerHTML = '';
      el.appendChild(canvas);
      new Chart(canvas, {
        type: type,
        data: {
          labels: d.labels,
          datasets: [{
            data: d.values,
            backgroundColor: COLORS.slice(0, d.values.length),
            borderColor: type === 'pie' ? '#fff' : BORDERS.slice(0, d.values.length),
            borderWidth: type === 'pie' ? 2 : 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: type === 'pie', position: 'bottom' } },
          scales: type === 'bar' ? { y: { beginAtZero: true } } : {}
        }
      });
    });
  }

  render('.report-bar-chart', 'bar');
  render('.report-pie-chart', 'pie');
});
${SCRIPT_END}`

const pageDimensionsMm = computed(() => {
  const portrait = pageSize.value === 'A4'
    ? { width: 210, height: 297 }
    : { width: 216, height: 279 }
  return orientation.value === 'portrait'
    ? portrait
    : { width: portrait.height, height: portrait.width }
})

const pageSetupSummary = computed(() =>
  `${pageSize.value} ${orientation.value} • ${normalizedMarginMm.value}mm margin • ${density.value} density • ${
    enablePagination.value ? `${normalizedRowsPerPage.value} rows/page` : 'pagination off'
  }`
)

const reportStyles = computed(() => {
  const { width, height } = pageDimensionsMm.value
  const contentWidthMm = Math.max(120, width - (normalizedMarginMm.value * 2))
  const pagePadding = density.value === 'compact' ? '16px 20px' : '24px 28px'
  return `
  @page { size: ${pageSize.value} ${orientation.value}; margin: ${normalizedMarginMm.value}mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #212529; font-size: 14px; overflow-x: hidden; }

  .report-page {
    width: ${width}mm;
    min-height: ${height}mm;
    margin: 16px auto;
    background: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    page-break-after: auto;
    break-after: auto;
    padding: ${pagePadding};
    position: relative;
    overflow: hidden;
  }
  .report-page:last-child { page-break-after: auto; break-after: auto; }

  h1, h2, h3 { color: #2d3e50; }
  h1 { font-weight: 700; }

  .report-tile {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
  }
  .report-tile.tile-primary {
    background: linear-gradient(135deg, #2d3e50 0%, #34495e 100%);
    box-shadow: 0 4px 15px rgba(45, 62, 80, 0.3);
  }
  .report-tile.tile-success {
    background: linear-gradient(135deg, #27ae60 0%, #1e8449 100%);
    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
  }
  .report-tile.tile-warning {
    background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
    box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
  }
  .report-tile.tile-danger {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
  }
  .report-tile-title {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .report-tile-value { font-size: 2rem; font-weight: 700; }

  .report-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  .report-table thead { background: #2d3e50; color: white; }
  .report-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.875rem; }
  .report-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #eee; }
  .ssrs-page-shell { margin: 0 0 16px 0; }
  .ssrs-page-shell.is-last { margin-bottom: 0; }
  .ssrs-page-break { display: none; }

  .chart-container { background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; overflow: hidden; }
  .chart-title { font-size: 1rem; font-weight: 600; color: #2d3e50; margin-bottom: 1rem; }
  .report-bar-chart, .report-pie-chart { position: relative; width: 100%; max-height: 300px; }

  .page-number { text-align: center; font-size: 0.75rem; color: #999; padding-top: 1.5rem; margin-top: auto; border-top: 1px solid #eee; }

  @media print {
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
    }

    .gl-report-shell,
    .report-preview,
    .report-preview-wrapper {
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
      min-height: 0 !important;
      display: block !important;
      box-shadow: none !important;
    }

    .ssrs-page-shell {
      margin: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .ssrs-page-shell.is-last {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .ssrs-page-break {
      display: none !important;
    }

    .report-page {
      width: ${contentWidthMm}mm !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }

    .gl-report-page {
      width: ${contentWidthMm}mm !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
      break-inside: avoid-page !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }

    .gl-footer-container,
    .footer-container,
    .page-number {
      position: static !important;
      bottom: auto !important;
      left: auto !important;
      right: auto !important;
      margin-top: 10mm !important;
    }

    .row { display: flex !important; flex-wrap: wrap !important; }
    [class*="col-"] { flex-shrink: 0; }
    .col-1, .col-sm-1, .col-md-1, .col-lg-1 { width: 8.3333% !important; }
    .col-2, .col-sm-2, .col-md-2, .col-lg-2 { width: 16.6667% !important; }
    .col-3, .col-sm-3, .col-md-3, .col-lg-3 { width: 25% !important; }
    .col-4, .col-sm-4, .col-md-4, .col-lg-4 { width: 33.3333% !important; }
    .col-5, .col-sm-5, .col-md-5, .col-lg-5 { width: 41.6667% !important; }
    .col-6, .col-sm-6, .col-md-6, .col-lg-6 { width: 50% !important; }
    .col-7, .col-sm-7, .col-md-7, .col-lg-7 { width: 58.3333% !important; }
    .col-8, .col-sm-8, .col-md-8, .col-lg-8 { width: 66.6667% !important; }
    .col-9, .col-sm-9, .col-md-9, .col-lg-9 { width: 75% !important; }
    .col-10, .col-sm-10, .col-md-10, .col-lg-10 { width: 83.3333% !important; }
    .col-11, .col-sm-11, .col-md-11, .col-lg-11 { width: 91.6667% !important; }
    .col-12, .col-sm-12, .col-md-12, .col-lg-12 { width: 100% !important; }
    .d-flex { display: flex !important; }
    .gap-2 { gap: 0.5rem !important; }
    .g-3 { --bs-gutter-x: 1rem; --bs-gutter-y: 1rem; }
    .report-table thead { display: table-header-group !important; }
    .report-table tfoot { display: table-footer-group !important; }
  }
`
})

function buildPrintDocument(bodyHtml: string, title = 'Report'): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
<style>${reportStyles.value}</style>
</head>
<body>${bodyHtml}${CHART_RENDER_SCRIPT}</body></html>`
}

const previewDocument = computed(() => {
  if (!renderedHtml.value) return ''
  return buildPrintDocument(renderedHtml.value, activeTemplate.value?.name ?? 'Report')
})

function selectTemplate(id: string) {
  if (!id) return
  templatesStore.setActiveTemplate(id)
}

function resolveTemplateHtml(
  template: NonNullable<typeof activeTemplate.value>,
  runtimeDesignerModel?: DesignerModel | null,
): string {
  const existingBody = stripDesignerMeta(template.html_content ?? '').trim()
  if (existingBody) {
    return template.html_content ?? ''
  }
  if (runtimeDesignerModel) {
    return renderDesignerModelToHtml(runtimeDesignerModel)
  }
  const parsedDefinition = parseDesignerModelFromDefinition(template.definition_json)
  if (parsedDefinition) {
    return renderDesignerModelToHtml(parsedDefinition)
  }
  return template.html_content ?? ''
}

async function exportToPdf() {
  if (!activeTemplate.value) { toastStore.warning('No template selected'); return }

  exporting.value = true
  try {
    const result = await fetchAllDataForExport(
      activeTemplate.value.id!,
      previewRuntimeFilters.value,
      previewRuntimeGroupBy.value,
      previewRuntimeSorts.value,
    )

    const runtimeModel = previewRuntimeDesignerModel.value
    const runtimeDefinition = runtimeModel
      ? serializeDesignerDefinition(runtimeModel)
      : activeTemplate.value.definition_json
    const templateHtml = resolveTemplateHtml(activeTemplate.value, runtimeModel)
    const fullHtml = renderTemplateWithPaging(
      templateHtml,
      result.data ?? {},
      {
        paginate: enablePagination.value,
        rowsPerPage: normalizedRowsPerPage.value,
      },
      runtimeDefinition,
    )
    const doc = buildPrintDocument(fullHtml, activeTemplate.value.name)

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;'
    document.body.appendChild(iframe)

    iframe.srcdoc = doc
    iframe.onload = () => {
      const win = iframe.contentWindow!
      const waitForCharts = () => {
        const pending = win.document.querySelectorAll('.report-bar-chart:empty, .report-pie-chart:empty')
        if (pending.length > 0 && attempts < 20) {
          attempts++
          setTimeout(waitForCharts, 150)
          return
        }
        win.focus()
        win.print()
        setTimeout(() => {
          try { document.body.removeChild(iframe) } catch { /* already removed */ }
        }, 2000)
      }
      let attempts = 0
      setTimeout(waitForCharts, 1000)
    }
  } catch {
    toastStore.warning('Failed to generate PDF')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="preview-view">
    <div class="premium-toolbar mb-4">
      <div class="toolbar-header mb-3 d-flex justify-content-between align-items-center">
        <h4 class="toolbar-title mb-0">
          <i class="bi bi-file-earmark-pdf me-2"></i> Preview & Export
        </h4>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm px-3" @click="exportToPdf" :disabled="!activeTemplate || exporting">
            <span v-if="exporting" class="spinner-border spinner-border-sm me-1" role="status"></span>
            <i v-else class="bi bi-file-earmark-pdf me-1"></i>
            {{ exporting ? 'Generating PDF...' : 'Export PDF' }}
          </button>
        </div>
      </div>

      <div class="toolbar-controls d-flex gap-3 align-items-center flex-wrap">
        <div class="control-group">
          <label class="control-label">Template</label>
          <select
            :value="activeTemplate?.id || ''"
            class="ep-select"
            style="width: 200px"
            @change="selectTemplate(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Select Template</option>
            <option v-for="t in templateOptions" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div class="control-divider"></div>

        <div class="d-flex align-items-center gap-3 page-setup-controls">
          <div class="control-group">
            <label class="control-label">Size</label>
            <select v-model="pageSize" class="ep-select w-auto">
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div class="control-group">
            <label class="control-label">Orientation</label>
            <select v-model="orientation" class="ep-select w-auto">
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="control-group">
            <label class="control-label">Margin (mm)</label>
            <input
              v-model.number="marginMm"
              type="number"
              class="ep-input w-auto"
              min="5"
              max="30"
              step="1"
            >
          </div>
          <div class="control-group">
            <label class="control-label">Density</label>
            <select v-model="density" class="ep-select w-auto">
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>
          
          <div class="control-divider"></div>

          <div class="control-group switch-group">
            <label for="paginateRowsToggle" class="control-label">Paginate</label>
            <div class="form-check form-switch m-0 d-flex align-items-center">
              <input id="paginateRowsToggle" v-model="enablePagination" class="form-check-input m-0" type="checkbox" style="cursor: pointer;">
            </div>
          </div>
          <div class="control-group" :class="{ 'opacity-50': !enablePagination }">
            <label class="control-label">Rows / Page</label>
            <input
              v-model.number="rowsPerPage"
              type="number"
              class="ep-input w-auto"
              min="1"
              max="200"
              step="1"
              :disabled="!enablePagination"
            >
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTemplate" class="premium-info-banner mb-4 d-flex align-items-center">
      <i class="bi bi-info-circle text-muted me-3"></i>
      <div class="banner-content">
        <strong class="text-primary me-2">{{ activeTemplate.name }}</strong>
        <span class="text-secondary" v-if="loadingData">Loading data from Unity Catalog...</span>
        <span class="text-secondary" v-else>Preview shows first 10 rows. Export PDF generates the full report.</span>
        <span class="text-tertiary ms-2">({{ pageSetupSummary }})</span>
      </div>
    </div>

    <div v-if="activeTemplate && hasPreviewParameters" class="card mb-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="bi bi-sliders me-2"></i>Parameter Test (Preview/Export only)</span>
        <button class="btn btn-sm btn-outline-secondary" @click="resetParameterOverrides">
          Reset
        </button>
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div
            v-for="(param, index) in previewRuntimeDesignerModel?.parameters ?? []"
            :key="`${param.label}-${index}`"
            class="col-md-4"
          >
            <label class="form-label form-label-sm fw-semibold">{{ param.label }}</label>
            <template v-if="param.dataType === 'boolean'">
              <select
                class="form-select form-select-sm"
                :value="normalizeOverrideValue(previewParameterOverrides[parameterOverrideKey(index, param.label)], param.defaultValue || param.value)"
                @change="updateParameterOverride(index, param.label, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">(empty)</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </template>
            <template v-else-if="parameterOptionsFor(index, param.label).length > 0 && param.allowMultiple">
              <select
                class="form-select form-select-sm"
                multiple
                size="4"
                @change="updateMultiSelectOverride(index, param.label, $event)"
              >
                <option
                  v-for="option in parameterOptionsFor(index, param.label)"
                  :key="`multi-${param.label}-${option}`"
                  :value="option"
                  :selected="Array.isArray(previewParameterOverrides[parameterOverrideKey(index, param.label)]) && (previewParameterOverrides[parameterOverrideKey(index, param.label)] as string[]).includes(option)"
                >
                  {{ option }}
                </option>
              </select>
            </template>
            <template v-else-if="parameterOptionsFor(index, param.label).length > 0">
              <select
                class="form-select form-select-sm"
                :value="normalizeOverrideValue(previewParameterOverrides[parameterOverrideKey(index, param.label)], param.defaultValue || param.value)"
                @change="updateParameterOverride(index, param.label, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">(empty)</option>
                <option
                  v-for="option in parameterOptionsFor(index, param.label)"
                  :key="`single-${param.label}-${option}`"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </template>
            <template v-else>
              <input
                :value="normalizeOverrideValue(previewParameterOverrides[parameterOverrideKey(index, param.label)], param.defaultValue || param.value)"
                :type="parameterInputType(param)"
                class="form-control form-control-sm"
                :placeholder="param.defaultValue || param.value"
                @input="updateParameterOverride(index, param.label, ($event.target as HTMLInputElement).value)"
              >
            </template>
            <div class="small text-danger mt-1" v-if="parameterValidationErrors[parameterOverrideKey(index, param.label)]">
              {{ parameterValidationErrors[parameterOverrideKey(index, param.label)] }}
            </div>
            <div v-if="effectiveFilterFieldForParam(param)" class="small text-muted mt-1">
              Dataset filter: <code>{{ effectiveFilterFieldForParam(param) }}</code>
              <span class="text-uppercase">({{ param.filterOperator || 'equals' }})</span>
              <span v-if="!param.filterField"> (auto)</span>
            </div>
            <div v-if="effectiveOptionsFieldForParam(param)" class="small text-muted">
              Options source: <code>{{ effectiveOptionsFieldForParam(param) }}</code>
              <span v-if="param.dependsOn"> | depends on <code>{{ param.dependsOn }}</code></span>
            </div>
          </div>
        </div>
        <p class="small text-muted mb-0 mt-2">
          Changes here are not saved to template metadata. Parameters with dataset filter mapping are applied on backend query.
        </p>
        <p class="small text-danger mb-0 mt-1" v-if="hasParameterErrors">
          Fix parameter validation errors to refresh preview.
        </p>
      </div>
    </div>

    <div v-if="activeTemplate && previewFilterDebug" class="card mb-3">
      <div class="card-header">
        <span><i class="bi bi-bug me-2"></i>Filter Debug & Query Trace</span>
      </div>
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-12">
            <div class="small text-muted mb-1">Applied Filter Payload</div>
            <pre class="mb-2 small p-2 bg-light border rounded">{{ JSON.stringify(previewRuntimeFilters, null, 2) }}</pre>
          </div>
          <div class="col-md-12" v-if="previewFilterDebug['where_clause']">
            <div class="small text-muted mb-1">WHERE Clause</div>
            <pre class="mb-2 small p-2 bg-light border rounded">{{ String(previewFilterDebug['where_clause']) }}</pre>
          </div>
          <div class="col-md-12" v-if="previewFilterDebug['order_by_clause']">
            <div class="small text-muted mb-1">ORDER BY Clause</div>
            <pre class="mb-2 small p-2 bg-light border rounded">{{ String(previewFilterDebug['order_by_clause']) }}</pre>
          </div>
          <div class="col-md-12" v-if="previewExecutedQuery">
            <div class="small text-muted mb-1">Executed SQL (limited)</div>
            <pre class="mb-0 small p-2 bg-light border rounded">{{ previewExecutedQuery }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-container card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="bi bi-file-richtext me-2"></i> Report Preview</span>
        <span v-if="activeTemplate" class="text-muted small">
          Structure: {{ structures?.find(s => s.id === activeTemplate!.structure_id)?.name }}
        </span>
      </div>
      <div class="card-body p-0">
        <div v-if="!activeTemplate" class="empty-state">
          <i class="bi bi-file-earmark-x d-block"></i>
          <p>Select a template to preview</p>
        </div>
        <div v-else-if="loadingData" class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
          <div class="spinner-border" role="status"></div>
        </div>
        <div v-else-if="previewError" class="alert alert-danger m-3">
          <strong>Preview render error:</strong> {{ previewError }}
        </div>
        <div v-else-if="!renderedHtml" class="empty-state">
          <i class="bi bi-file-earmark-break d-block"></i>
          <p>Template selected but no output rendered.</p>
        </div>
        <iframe
          v-else-if="previewDocument"
          class="pdf-preview-frame"
          :srcdoc="previewDocument"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-view { max-width: 1200px; margin: 0 auto; }

/* Premium Toolbar */
.premium-toolbar {
  background: white;
  border: 1px solid var(--ep-border-base);
  border-radius: var(--ep-radius-md);
  padding: 16px 20px;
  box-shadow: var(--ep-shadow-sm);
}

.toolbar-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ep-text-primary);
  letter-spacing: -0.5px;
}

.toolbar-title i {
  color: var(--ep-text-secondary);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ep-text-tertiary);
}

.control-divider {
  width: 1px;
  height: 32px;
  background-color: var(--ep-border-base);
  margin: 0 4px;
}

.ep-select, .ep-input {
  height: 32px;
  padding: 4px 10px;
  font-size: 13px;
  color: var(--ep-text-primary);
  background-color: var(--ep-bg-surface);
  border: 1px solid var(--ep-border-strong);
  border-radius: var(--ep-radius-sm);
  transition: all var(--trans-fast);
  outline: none;
}

.ep-select:focus, .ep-input:focus {
  border-color: var(--ep-primary);
  box-shadow: 0 0 0 2px rgba(0,0,0,0.05); /* very subtle dark focus */
}

.ep-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 12px 12px;
  padding-right: 24px;
}

.ep-input[type="number"] {
  width: 70px;
}

/* Form Check override to match premium height */
.switch-group .form-switch {
  height: 32px;
  display: flex;
  align-items: center;
}

/* Premium Info Banner */
.premium-info-banner {
  background: var(--ep-bg-surface-active);
  border: 1px solid var(--ep-border-base);
  border-radius: var(--ep-radius-md);
  padding: 12px 16px;
}

.banner-content {
  font-size: 13px;
}

.text-tertiary {
  color: var(--ep-text-tertiary);
}
.preview-container { min-height: 600px; }
.preview-container .card-body {
  background: #e0e0e0;
  overflow: hidden;
  padding: 0 !important;
}
.pdf-preview-frame {
  width: 100%;
  height: calc(100vh - 280px);
  border: none;
  display: block;
  background: white;
}
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6c757d;
}
.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

@media (max-width: 1200px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
}
</style>
