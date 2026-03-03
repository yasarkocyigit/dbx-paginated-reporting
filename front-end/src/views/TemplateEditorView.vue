<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useTemplatesStore } from '@/stores/templates'
import { useToastStore } from '@/stores/toast'
import ReportPreview from '@/components/ReportPreview.vue'
import AgentChatPanel from '@/components/AgentChatPanel.vue'
import Mustache from 'mustache'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { indentWithTab } from '@codemirror/commands'
import {
  useListStructuresApiV1StructuresGet,
  useListTemplatesApiV1TemplatesGet,
  useCreateTemplateApiV1TemplatesPost,
  useUpdateTemplateApiV1TemplatesTemplateIdPut,
  useDeleteTemplateApiV1TemplatesTemplateIdDelete,
  getListTemplatesApiV1TemplatesGetQueryKey,
  previewDataApiV1TemplatesTemplateIdPreviewDataPost,
} from '@/api/client'
import type { PreviewDataResponse } from '@/api/client'
import {
  createDefaultDesignerModel,
  parseDesignerModelFromDefinition,
  parseDesignerModelFromHtml,
  renderDesignerModelToHtml,
  serializeDesignerDefinition,
  suggestLabelFromPath,
  stripDesignerMeta,
} from '@/utils/designerReport'
import type { DesignerAlignment, DesignerModel } from '@/utils/designerReport'
import type { DesignerParameterType } from '@/utils/designerReport'
import type { DesignerFilterOperator } from '@/utils/designerReport'
import { enrichDataForRendering } from '@/utils/reportData'
import { validateTemplateHtml } from '@/utils/templateValidation'

const queryClient = useQueryClient()
const templatesStore = useTemplatesStore()
const toastStore = useToastStore()

// -- Queries ------------------------------------------------------------------
const { data: structures } = useListStructuresApiV1StructuresGet()
const { data: templates } = useListTemplatesApiV1TemplatesGet()

const activeTemplate = computed(() =>
  templates.value?.find((t) => t.id === templatesStore.activeTemplateId) ?? null
)

// -- Mutations ----------------------------------------------------------------
const { mutateAsync: createTemplateMutation } = useCreateTemplateApiV1TemplatesPost({
  mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTemplatesApiV1TemplatesGetQueryKey() }),
  },
})
const { mutateAsync: updateTemplateMutation } = useUpdateTemplateApiV1TemplatesTemplateIdPut({
  mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTemplatesApiV1TemplatesGetQueryKey() }),
  },
})
const { mutateAsync: deleteTemplateMutation } = useDeleteTemplateApiV1TemplatesTemplateIdDelete({
  mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTemplatesApiV1TemplatesGetQueryKey() }),
  },
})

// -- Editor state -------------------------------------------------------------
const htmlContent = ref('')
const selectedStructureId = ref('')
const templateName = ref('')

const splitRatio = ref(50)
const isDragging = ref(false)
const splitViewRef = ref<HTMLElement | null>(null)
const canvasViewMode = ref<'editor' | 'split' | 'preview'>('split')

const showNewTemplateModal = ref(false)
const newTemplateName = ref('')
const isCreatingTemplate = ref(false)
const newTemplateStructureId = ref('')

const showDeleteTemplateModal = ref(false)

const showMustacheHelp = ref(false)
const showStructureHint = ref(false)
const showAgentChat = ref(false)
const editorMode = ref<'designer' | 'html'>('designer')
const designerModel = ref<DesignerModel>(createDefaultDesignerModel([]))
const newColumnFieldPath = ref('')
const newParameterLabel = ref('')
const newParameterValue = ref('')
const newParameterFieldPath = ref('')
const newParameterFilterField = ref('')
const newParameterFilterOperator = ref<DesignerFilterOperator>('equals')
const newParameterDataType = ref<DesignerParameterType>('string')
const newParameterRequired = ref(false)
const newParameterAllowMultiple = ref(false)
const newParameterDefaultValue = ref('')
const newParameterStaticOptionsCsv = ref('')
const newParameterOptionsSourceField = ref('')
const newParameterDependsOn = ref('')
const newConditionalField = ref('')
const newConditionalOperator = ref<'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'>('equals')
const newConditionalValue = ref('')
const newConditionalCssClass = ref('')

const editorEl = ref<HTMLElement>()
const cmView = ref<EditorView>()
const editableCompartment = new Compartment()

interface StructureFieldNode {
  name: string
  type: string
  children?: StructureFieldNode[]
}

interface FlatField {
  path: string
  label: string
  type: string
}

watch(htmlContent, (newVal) => {
  if (!cmView.value) return
  const current = cmView.value.state.doc.toString()
  if (current !== newVal) {
    cmView.value.dispatch({ changes: { from: 0, to: current.length, insert: newVal } })
  }
})

watch(
  () => activeTemplate.value,
  (template) => {
    cmView.value?.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!!template)),
    })
  },
)


const previewDataResult = ref<Record<string, unknown>>({})
const previewLoading = ref(false)
const previewCache = new Map<string, Record<string, unknown>>()

const activeStructure = computed(() =>
  structures.value?.find((s) => s.id === selectedStructureId.value) ?? null
)

function flattenStructureFields(
  fields: StructureFieldNode[] = [],
  parentPath = '',
): FlatField[] {
  const out: FlatField[] = []
  for (const field of fields) {
    const path = parentPath ? `${parentPath}.${field.name}` : field.name
    const hasChildren = Array.isArray(field.children) && field.children.length > 0
    if (!hasChildren || field.type === 'array') {
      out.push({
        path,
        label: suggestLabelFromPath(path),
        type: field.type,
      })
      continue
    }
    out.push(...flattenStructureFields(field.children!, path))
  }
  return out
}

const designerAvailableFields = computed<FlatField[]>(() => {
  const rawFields = (activeStructure.value?.fields ?? []) as unknown as StructureFieldNode[]
  return flattenStructureFields(rawFields)
})

const parameterFilterOperators: Array<{ value: DesignerFilterOperator; label: string }> = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'in', label: 'in (csv)' },
]

const parameterDataTypes: Array<{ value: DesignerParameterType; label: string }> = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'date', label: 'date' },
  { value: 'boolean', label: 'boolean' },
  { value: 'enum', label: 'enum' },
]

const conditionalOperators: Array<{ value: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'; label: string }> = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
]

const addableDesignerFields = computed(() => {
  const used = new Set(designerModel.value.columns.map((col) => col.key))
  return designerAvailableFields.value.filter((field) => !used.has(field.path))
})
const hasColumnOverflowRisk = computed(() => designerModel.value.columns.length > 8)

const parameterLabelOptions = computed(() =>
  designerModel.value.parameters.map((param) => param.label).filter(Boolean),
)

function parseCsvOptions(csv: string): string[] {
  return Array.from(new Set(csv.split(',').map((item) => item.trim()).filter(Boolean)))
}

function designerFieldLabel(path: string): string {
  return designerAvailableFields.value.find((f) => f.path === path)?.label ?? suggestLabelFromPath(path)
}

function ensureDesignerColumns() {
  const available = designerAvailableFields.value
  if (!available.length) return
  if (!newColumnFieldPath.value) {
    newColumnFieldPath.value = available[0]?.path ?? ''
  }
  const availableSet = new Set(available.map((f) => f.path))
  const current = designerModel.value.columns.filter((col) => availableSet.has(col.key))
  if (current.length) {
    designerModel.value.columns = current
    syncDesignerTotalFields()
    return
  }
  designerModel.value.columns = available.slice(0, 6).map((f) => ({
    key: f.path,
    label: f.label,
    align: /amount|total|debit|credit|balance|qty|count/i.test(f.path) ? 'right' : 'left',
  }))
  designerModel.value.totalFields = designerModel.value.columns
    .filter((col) => /amount|total|debit|credit|balance|qty|count/i.test(col.key))
    .map((col) => col.key)
}

function addDesignerColumn() {
  const available = designerAvailableFields.value
  if (!available.length) return
  const selectedPath = newColumnFieldPath.value.trim()
  const next = available.find((f) => f.path === selectedPath)
  if (!next) {
    toastStore.warning('Select a field from the dropdown before adding a column')
    return
  }
  if (designerModel.value.columns.some((col) => col.key === next.path)) {
    toastStore.warning('This field is already in the report columns')
    return
  }

  designerModel.value.columns.push({
    key: next.path,
    label: next.label,
    align: /amount|total|debit|credit|balance|qty|count/i.test(next.path) ? 'right' : 'left',
  })
  if (
    designerModel.value.showGrandTotal &&
    /amount|total|debit|credit|balance|qty|count/i.test(next.path) &&
    !designerModel.value.totalFields.includes(next.path)
  ) {
    designerModel.value.totalFields.push(next.path)
  }

  const remaining = addableDesignerFields.value
  newColumnFieldPath.value = remaining[0]?.path ?? next.path
}

function removeDesignerColumn(index: number) {
  if (designerModel.value.columns.length <= 1) return
  designerModel.value.columns.splice(index, 1)
  syncDesignerTotalFields()
}

function moveDesignerColumn(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= designerModel.value.columns.length) return
  const items = [...designerModel.value.columns]
  const [item] = items.splice(index, 1)
  items.splice(nextIndex, 0, item)
  designerModel.value.columns = items
}

function alignDesignerColumn(index: number, align: DesignerAlignment) {
  designerModel.value.columns[index].align = align
}

function syncDesignerTotalFields() {
  const activeKeys = new Set(designerModel.value.columns.map((col) => col.key))
  designerModel.value.totalFields = designerModel.value.totalFields.filter((path) => activeKeys.has(path))
}

function isColumnInTotals(path: string): boolean {
  return designerModel.value.totalFields.includes(path)
}

function toggleColumnTotal(path: string) {
  if (isColumnInTotals(path)) {
    designerModel.value.totalFields = designerModel.value.totalFields.filter((item) => item !== path)
    return
  }
  designerModel.value.totalFields.push(path)
}

function resetColumnLabel(index: number) {
  const path = designerModel.value.columns[index]?.key
  if (!path) return
  designerModel.value.columns[index].label = designerFieldLabel(path)
}

function addDesignerParameter() {
  const fieldPath = newParameterFieldPath.value.trim()
  const hasFieldBinding = fieldPath.length > 0

  let label = newParameterLabel.value.trim()
  if (!label && hasFieldBinding) {
    label = suggestLabelFromPath(fieldPath).toUpperCase()
  }
  if (!label) {
    label = `PARAM_${designerModel.value.parameters.length + 1}`
  }

  const duplicate = designerModel.value.parameters.some(
    (param) => param.label.trim().toLowerCase() === label.toLowerCase(),
  )
  if (duplicate) {
    toastStore.warning(`Parameter "${label}" already exists`)
    return
  }

  const providedValue = newParameterValue.value.trim()
  const value = hasFieldBinding
    ? `{{${fieldPath}}}`
    : (providedValue || 'VALUE')

  const filterField = (newParameterFilterField.value.trim() || fieldPath || '') || undefined
  const optionsSourceField = (newParameterOptionsSourceField.value.trim() || filterField || '') || undefined
  const staticOptions = parseCsvOptions(newParameterStaticOptionsCsv.value)

  designerModel.value.parameters.push({
    label,
    value,
    defaultValue: newParameterDefaultValue.value.trim() || value,
    dataType: newParameterDataType.value,
    required: newParameterRequired.value,
    allowMultiple: newParameterAllowMultiple.value,
    staticOptions: staticOptions.length ? staticOptions : undefined,
    optionsSourceField,
    dependsOn: newParameterDependsOn.value.trim() || undefined,
    filterField,
    filterOperator: filterField ? newParameterFilterOperator.value : undefined,
  })
  newParameterLabel.value = ''
  newParameterValue.value = ''
  newParameterFieldPath.value = ''
  newParameterFilterField.value = ''
  newParameterFilterOperator.value = 'equals'
  newParameterDataType.value = 'string'
  newParameterRequired.value = false
  newParameterAllowMultiple.value = false
  newParameterDefaultValue.value = ''
  newParameterStaticOptionsCsv.value = ''
  newParameterOptionsSourceField.value = ''
  newParameterDependsOn.value = ''
}

function removeDesignerParameter(index: number) {
  designerModel.value.parameters.splice(index, 1)
}

function addConditionalRule() {
  const field = newConditionalField.value.trim()
  const cssClass = newConditionalCssClass.value.trim().replace(/[^\w-]/g, '')
  if (!field || !cssClass) {
    toastStore.warning('Conditional rule requires field and css class')
    return
  }
  const nextRules = designerModel.value.conditionalRules ? [...designerModel.value.conditionalRules] : []
  nextRules.push({
    field,
    operator: newConditionalOperator.value,
    value: newConditionalValue.value.trim(),
    cssClass,
  })
  designerModel.value.conditionalRules = nextRules
  newConditionalField.value = ''
  newConditionalOperator.value = 'equals'
  newConditionalValue.value = ''
  newConditionalCssClass.value = ''
}

function removeConditionalRule(index: number) {
  const nextRules = designerModel.value.conditionalRules ? [...designerModel.value.conditionalRules] : []
  nextRules.splice(index, 1)
  designerModel.value.conditionalRules = nextRules
}

function setEditorMode(mode: 'designer' | 'html') {
  if (mode === editorMode.value) return
  if (mode === 'html') {
    htmlContent.value = designerHtml.value
    toastStore.info('Switched to HTML advanced mode')
  } else {
    const parsed = parseDesignerModelFromHtml(htmlContent.value)
    if (parsed) {
      designerModel.value = parsed
    } else {
      ensureDesignerColumns()
    }
    toastStore.info('Switched to designer mode')
  }
  editorMode.value = mode
}

function applyDesignerToHtml() {
  htmlContent.value = designerHtml.value
  toastStore.success('Designer output pushed to HTML advanced mode')
}

function loadDesignerFromHtml() {
  const parsed = parseDesignerModelFromHtml(htmlContent.value)
  if (!parsed) {
    toastStore.warning('No designer metadata found in this HTML template')
    return
  }
  designerModel.value = parsed
  toastStore.success('Designer model loaded from HTML metadata')
}

const designerHtml = computed(() => renderDesignerModelToHtml(designerModel.value))
const effectiveHtmlContent = computed(() =>
  editorMode.value === 'designer' ? designerHtml.value : htmlContent.value
)
const designerDefinitionPayload = computed(() => serializeDesignerDefinition(designerModel.value))
const activeDesignerMeta = computed(() =>
  editorMode.value === 'designer'
    ? designerModel.value
    : parseDesignerModelFromHtml(effectiveHtmlContent.value)
      ?? parseDesignerModelFromDefinition(activeTemplate.value?.definition_json)
)

function fieldTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    string: 'bi-fonts', number: 'bi-123', boolean: 'bi-toggle-on',
    date: 'bi-calendar', array: 'bi-list-ul', object: 'bi-braces',
  }
  return icons[type] || 'bi-question'
}

function showTemplateValidationError(errors: string[]) {
  const firstThree = errors.slice(0, 3)
  const suffix = errors.length > 3 ? ` (+${errors.length - 3} more)` : ''
  toastStore.warning(`Template validation failed: ${firstThree.join(' ')}${suffix}`)
}

async function loadPreviewData(force = false) {
  if (!activeTemplate.value) { previewDataResult.value = {}; return }
  const cacheKey = `${activeTemplate.value.id}:${activeTemplate.value.structure_id}`
  if (!force && previewCache.has(cacheKey)) {
    previewDataResult.value = previewCache.get(cacheKey)!
    return
  }
  previewLoading.value = true
  try {
    const result = (await previewDataApiV1TemplatesTemplateIdPreviewDataPost(activeTemplate.value.id!, { limit: 50 })) as unknown as PreviewDataResponse
    previewCache.set(cacheKey, result.data)
    previewDataResult.value = result.data
  } catch {
    previewDataResult.value = {}
  } finally {
    previewLoading.value = false
  }
}

function getStructureName(structureId: string): string {
  return structures.value?.find((s) => s.id === structureId)?.name || 'Unknown'
}

const renderedHtml = computed(() => {
  if (!effectiveHtmlContent.value) {
    return '<div class="empty-state"><i class="bi bi-eye-slash"></i><p>Start typing to see preview</p></div>'
  }
  try {
    const validation = validateTemplateHtml(effectiveHtmlContent.value)
    if (!validation.isValid) {
      return `<div class="alert alert-warning m-3"><i class="bi bi-exclamation-triangle me-2"></i>${validation.errors[0]}</div>`
    }
    const totalFields = activeDesignerMeta.value?.showGrandTotal
      ? activeDesignerMeta.value.totalFields
      : []
    const renderData = enrichDataForRendering(previewDataResult.value, {
      totalFields,
      groupByField: activeDesignerMeta.value?.groupByField,
      showGroupSubtotals: activeDesignerMeta.value?.showGroupSubtotals,
      sortByField: activeDesignerMeta.value?.sortByField,
      sortDirection: activeDesignerMeta.value?.sortDirection,
      conditionalRules: activeDesignerMeta.value?.conditionalRules,
    })
    return Mustache.render(stripDesignerMeta(effectiveHtmlContent.value), renderData)
  } catch (error) {
    return `<div class="alert alert-danger m-3"><i class="bi bi-exclamation-triangle me-2"></i>Template Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
  }
})

function startDrag(e: MouseEvent) {
  if (!isSplitLayout.value) return
  isDragging.value = true
  e.preventDefault()
}
function onDrag(e: MouseEvent) {
  if (!isDragging.value || !splitViewRef.value || !isSplitLayout.value) return
  const rect = splitViewRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  splitRatio.value = Math.min(80, Math.max(20, (x / rect.width) * 100))
}
function stopDrag() { isDragging.value = false }
function setSplitRatio(ratio: number) { splitRatio.value = ratio }
function setCanvasViewMode(mode: 'editor' | 'split' | 'preview') {
  canvasViewMode.value = mode
  if (mode !== 'split') isDragging.value = false
}
function switchToPreview() {
  setCanvasViewMode('preview')
}
function switchToEditor() {
  setCanvasViewMode('editor')
}

const isSplitLayout = computed(() => canvasViewMode.value === 'split')
const showEditorPane = computed(() => canvasViewMode.value !== 'preview')
const showPreviewPane = computed(() => canvasViewMode.value !== 'editor')

watch(
  () => activeTemplate.value?.id,
  (id) => {
    const template = activeTemplate.value
    if (template && id) {
      htmlContent.value = template.html_content ?? ''
      selectedStructureId.value = template.structure_id
      templateName.value = template.name
      const parsedDesigner =
        parseDesignerModelFromDefinition(template.definition_json)
        ?? parseDesignerModelFromHtml(template.html_content ?? '')
      if (parsedDesigner) {
        designerModel.value = parsedDesigner
        editorMode.value = 'designer'
      } else {
        designerModel.value = createDefaultDesignerModel(designerAvailableFields.value.map((f) => f.path))
        ensureDesignerColumns()
        // Non-designer templates should open in HTML mode to avoid showing
        // the same generated default designer layout for every template.
        editorMode.value = 'html'
      }
      loadPreviewData()
    }
  },
  { immediate: true },
)

watch(designerAvailableFields, () => {
  ensureDesignerColumns()
})

watch(() => designerModel.value.columns.map((col) => col.key).join('|'), () => {
  syncDesignerTotalFields()
})

watch(addableDesignerFields, (fields) => {
  if (!fields.length) {
    newColumnFieldPath.value = ''
    return
  }
  if (!fields.some((field) => field.path === newColumnFieldPath.value)) {
    newColumnFieldPath.value = fields[0].path
  }
}, { immediate: true })

watch(designerAvailableFields, (fields) => {
  if (!newParameterFieldPath.value) return
  const exists = fields.some((field) => field.path === newParameterFieldPath.value)
  if (!exists) newParameterFieldPath.value = ''
})

watch(newParameterFieldPath, (fieldPath) => {
  if (!fieldPath) return
  if (!newParameterFilterField.value) {
    newParameterFilterField.value = fieldPath
  }
  if (!newParameterOptionsSourceField.value) {
    newParameterOptionsSourceField.value = fieldPath
  }
})

watch(designerAvailableFields, (fields) => {
  const valid = new Set(fields.map((field) => field.path))
  if (newParameterFilterField.value && !valid.has(newParameterFilterField.value)) {
    newParameterFilterField.value = ''
  }
  if (newParameterOptionsSourceField.value && !valid.has(newParameterOptionsSourceField.value)) {
    newParameterOptionsSourceField.value = ''
  }
  if (designerModel.value.groupByField && !valid.has(designerModel.value.groupByField)) {
    designerModel.value.groupByField = undefined
  }
  if (designerModel.value.sortByField && !valid.has(designerModel.value.sortByField)) {
    designerModel.value.sortByField = undefined
  }
  designerModel.value.conditionalRules = (designerModel.value.conditionalRules || []).filter((rule) =>
    valid.has(rule.field),
  )
  designerModel.value.parameters = designerModel.value.parameters.map((param) => {
    const staticOptions = (param.staticOptions || []).map((item) => item.trim()).filter(Boolean)
    const base = {
      ...param,
      staticOptions: staticOptions.length ? staticOptions : undefined,
      optionsSourceField: param.optionsSourceField && valid.has(param.optionsSourceField)
        ? param.optionsSourceField
        : undefined,
    }
    if (!param.filterField) return base
    if (!valid.has(param.filterField)) {
      return {
        ...base,
        filterField: undefined,
        filterOperator: undefined,
      }
    }
    return base
  })
})

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let autoSaveRequestSeq = 0

watch(() => activeTemplate.value?.id, () => {
  autoSaveRequestSeq += 1
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
})

watch(effectiveHtmlContent, (nextHtml) => {
  const templateSnapshot = activeTemplate.value
  if (!templateSnapshot) return
  if (nextHtml === (templateSnapshot.html_content ?? '')) return

  const templateIdSnapshot = templateSnapshot.id
  const htmlSnapshot = nextHtml
  const editorModeSnapshot = editorMode.value
  const definitionSnapshot = templateSnapshot.definition_json
  const designerDefinitionSnapshot = editorModeSnapshot === 'designer'
    ? serializeDesignerDefinition(designerModel.value)
    : undefined
  const requestSeq = ++autoSaveRequestSeq

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    if (requestSeq !== autoSaveRequestSeq) return

    const validation = validateTemplateHtml(htmlSnapshot)
    if (!validation.isValid) {
      return
    }
    const parsedFromHtml = parseDesignerModelFromHtml(htmlSnapshot)
    const definitionPayload = (
      editorModeSnapshot === 'designer'
        ? designerDefinitionSnapshot
        : parsedFromHtml
          ? serializeDesignerDefinition(parsedFromHtml)
          : definitionSnapshot
    ) ?? {}

    try {
      await updateTemplateMutation({
        templateId: templateIdSnapshot,
        data: {
          html_content: htmlSnapshot,
          definition_json: definitionPayload,
        },
      })
    } catch {
      // Silent fail; explicit Save button provides user-visible feedback.
    }
  }, 500)
})

async function createTemplate() {
  if (!newTemplateName.value.trim()) { toastStore.warning('Please enter a template name'); return }
  if (!newTemplateStructureId.value) { toastStore.warning('Please select a data structure'); return }
  if (isCreatingTemplate.value) return
  isCreatingTemplate.value = true
  try {
    const selectedStructure = structures.value?.find((s) => s.id === newTemplateStructureId.value)
    const selectedFields = flattenStructureFields(
      ((selectedStructure?.fields ?? []) as unknown as StructureFieldNode[]),
    ).map((f) => f.path)
    const initialDesigner = createDefaultDesignerModel(selectedFields)
    const created = await createTemplateMutation({
      data: {
        name: newTemplateName.value.trim(),
        structure_id: newTemplateStructureId.value,
        html_content: renderDesignerModelToHtml(initialDesigner),
        definition_json: serializeDesignerDefinition(initialDesigner),
      },
    })
    templatesStore.setActiveTemplate(created.id)
    toastStore.success(`Created template "${newTemplateName.value}"`)
    newTemplateName.value = ''
    newTemplateStructureId.value = ''
    showNewTemplateModal.value = false
  } finally {
    isCreatingTemplate.value = false
  }
}

async function saveTemplate() {
  if (!activeTemplate.value) return
  const htmlToSave = effectiveHtmlContent.value
  const validation = validateTemplateHtml(htmlToSave)
  if (!validation.isValid) {
    showTemplateValidationError(validation.errors)
    return
  }
  const parsedFromHtml = parseDesignerModelFromHtml(htmlToSave)
  const definitionPayload = (
    editorMode.value === 'designer'
      ? designerDefinitionPayload.value
      : parsedFromHtml
        ? serializeDesignerDefinition(parsedFromHtml)
        : activeTemplate.value?.definition_json
  )
  await updateTemplateMutation({
    templateId: activeTemplate.value.id,
    data: {
      name: templateName.value,
      structure_id: selectedStructureId.value,
      html_content: htmlToSave,
      definition_json: definitionPayload,
    },
  })
  toastStore.success('Template saved!')
}

function deleteTemplate() {
  if (!activeTemplate.value) return
  showDeleteTemplateModal.value = true
}

async function confirmDeleteTemplate() {
  if (!activeTemplate.value) return
  const id = activeTemplate.value.id
  showDeleteTemplateModal.value = false
  await deleteTemplateMutation({ templateId: id })
  templatesStore.setActiveTemplate(null)
  toastStore.success('Template deleted')
  htmlContent.value = ''
  selectedStructureId.value = ''
  templateName.value = ''
  designerModel.value = createDefaultDesignerModel([])
  editorMode.value = 'designer'
}


const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

function formatHtml() {
  if (!htmlContent.value.trim() || !cmView.value) return
  const INDENT = '  '

  const normalized = htmlContent.value.replace(/<([a-zA-Z][^>]*)>/gs, (match) =>
    match.replace(/\s*\n\s*/g, ' '),
  )

  const tokens = normalized
    .replace(/>\s*</g, '>\n<')
    .replace(/>\s*(\{\{)/g, '>\n$1')
    .replace(/(\}\})\s*</g, '$1\n<')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)

  let depth = 0
  const lines: string[] = []

  for (const token of tokens) {
    // Collect all opening tags (non-void, non-self-closing)
    const openNames: string[] = []
    const openRe = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g
    let m: RegExpExecArray | null
    while ((m = openRe.exec(token)) !== null) {
      const name = m[1].toLowerCase()
      if (!VOID_TAGS.has(name) && !m[0].endsWith('/>')) openNames.push(name)
    }

    // Collect all closing tags
    const closeNames: string[] = []
    const closeRe = /<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g
    while ((m = closeRe.exec(token)) !== null) closeNames.push(m[1].toLowerCase())

    // Cancel matched open/close pairs within the same token
    const unpairedOpens = [...openNames]
    const unpairedCloses = [...closeNames]
    for (const name of openNames) {
      const i = unpairedCloses.indexOf(name)
      if (i !== -1) { unpairedCloses.splice(i, 1); unpairedOpens.splice(unpairedOpens.indexOf(name), 1) }
    }

    // Mustache block open {{# and close {{/
    const mustacheOpen = /^\{\{#/.test(token) ? 1 : 0
    const mustacheClose = /^\{\{\//.test(token) ? 1 : 0

    depth = Math.max(0, depth - unpairedCloses.length - mustacheClose)
    lines.push(INDENT.repeat(depth) + token)
    depth += unpairedOpens.length + mustacheOpen
  }

  const formatted = lines.join('\n')
  const docLength = cmView.value.state.doc.length
  cmView.value.dispatch({
    changes: { from: 0, to: docLength, insert: formatted },
  })
  toastStore.info('Template formatted')
}

function handleReplaceContent(event: CustomEvent) {
  if (!activeTemplate.value) { toastStore.warning('Please select or create a template first'); return }
  editorMode.value = 'html'
  htmlContent.value = event.detail as string
  toastStore.success('Template replaced')
}

function handleSnippetInsert(event: CustomEvent) {
  const snippet = event.detail as string
  if (!activeTemplate.value) { toastStore.warning('Please select or create a template first'); return }
  editorMode.value = 'html'
  if (cmView.value) {
    const { from, to } = cmView.value.state.selection.main
    cmView.value.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
    })
    cmView.value.focus()
  } else {
    htmlContent.value += '\n' + snippet
  }
  toastStore.info('Component inserted')
}

onMounted(() => {
  window.addEventListener('insert-snippet', handleSnippetInsert as (event: Event) => void)
  window.addEventListener('replace-template-content', handleReplaceContent as (event: Event) => void)
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)

  cmView.value = new EditorView({
    parent: editorEl.value!,
    state: EditorState.create({
      doc: htmlContent.value,
      extensions: [
        html(),
        oneDark,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
        keymap.of([indentWithTab]),
        placeholder('Enter your HTML template here...'),
        editableCompartment.of(EditorView.editable.of(!!activeTemplate.value)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) htmlContent.value = update.state.doc.toString()
        }),
      ],
    }),
  })
})

onUnmounted(() => {
  window.removeEventListener('insert-snippet', handleSnippetInsert as (event: Event) => void)
  window.removeEventListener('replace-template-content', handleReplaceContent as (event: Event) => void)
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  if (saveTimeout) clearTimeout(saveTimeout)
  cmView.value?.destroy()
})
</script>

<template>
  <div class="template-editor-view">
    <!-- Toolbar -->
    <!-- Toolbar -->
    <div class="ep-toolbar mb-3">
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <template v-if="activeTemplate">
          <i class="bi bi-file-code text-primary me-1"></i>
          <input v-model="templateName" type="text" class="ep-input fw-semibold" style="width: 220px" placeholder="Report name" />
          <div class="d-flex align-items-center gap-1 position-relative ms-1">
            <div class="ep-input-group" style="width: auto;">
              <span class="ep-input-group-text"><i class="bi bi-link-45deg me-1"></i> Data</span>
              <select v-model="selectedStructureId" class="ep-select" style="width: 150px" title="Data Structure">
                <option v-for="s in (structures ?? [])" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <button v-if="activeStructure" class="ep-btn" :class="{ active: showStructureHint }" title="View data schema" @click="showStructureHint = !showStructureHint">
              <i class="bi bi-diagram-3"></i>
            </button>
            <div v-if="showStructureHint && activeStructure" class="structure-hint-popup card">
              <div class="card-header d-flex justify-content-between align-items-center py-2">
                <span class="small fw-semibold mb-0"><i class="bi bi-diagram-3 me-1 text-primary"></i> {{ activeStructure.name }} Fields</span>
                <button type="button" class="btn-close btn-sm" @click="showStructureHint = false"></button>
              </div>
              <div class="card-body p-2">
                <p class="text-muted small mb-2 px-1">Use <code>{<!-- -->{field}}</code> in your template</p>
                <template v-for="field in activeStructure.fields" :key="field.name">
                  <div class="hint-field-item">
                    <div class="d-flex align-items-center">
                      <i :class="['bi', fieldTypeIcon(field.type), 'me-2 text-primary']"></i>
                      <span class="fw-medium">{{ field.name }}</span>
                      <span class="badge bg-light text-dark ms-2">{{ field.type }}</span>
                    </div>
                    <div v-if="field.type === 'array' || field.type === 'object'" class="text-muted small mt-1">
                      <code class="hint-mustache">{<!-- -->{#{{ field.name }}}} ... {<!-- -->{/{{ field.name }}}}</code>
                    </div>
                  </div>
                  <template v-if="field.children && field.children.length">
                    <div v-for="child in field.children" :key="child.name" class="hint-field-item nested" style="margin-left: 24px">
                      <div class="d-flex align-items-center">
                        <i :class="['bi', fieldTypeIcon(child.type), 'me-2 text-primary']"></i>
                        <span class="fw-medium">{{ child.name }}</span>
                        <span class="badge bg-light text-dark ms-2">{{ child.type }}</span>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>
          <button class="ep-btn ep-btn-primary ms-1" @click="saveTemplate" title="Save template"><i class="bi bi-save"></i></button>
          <button class="ep-btn ep-btn-danger" @click="deleteTemplate" title="Delete template"><i class="bi bi-trash"></i></button>
        </template>
        <template v-else>
          <span class="text-muted small">Select a template from the sidebar or create one</span>
        </template>
        <button class="ep-btn" @click="showNewTemplateModal = true"><i class="bi bi-plus-lg me-1"></i> New</button>
      </div>

      <div class="d-flex align-items-center gap-2 flex-wrap mt-2 mt-md-0">
        <div class="ep-btn-group" role="group">
          <button
            type="button"
            class="ep-btn"
            :class="{ active: editorMode === 'designer' }"
            @click="setEditorMode('designer')"
            title="Visual report designer"
          >
            <i class="bi bi-layout-text-window-reverse me-2"></i> Designer
          </button>
          <button
            type="button"
            class="ep-btn"
            :class="{ active: editorMode === 'html' }"
            @click="setEditorMode('html')"
            title="Advanced HTML + Mustache"
          >
            <i class="bi bi-code-square me-2"></i> HTML
          </button>
        </div>
        <div class="ep-btn-group" role="group">
          <button type="button" class="ep-btn" :class="{ active: canvasViewMode === 'editor' }" @click="setCanvasViewMode('editor')" title="Focus editor"><i class="bi bi-code-square"></i></button>
          <button type="button" class="ep-btn" :class="{ active: canvasViewMode === 'split' }" @click="setCanvasViewMode('split')" title="Split view"><i class="bi bi-layout-split"></i></button>
          <button type="button" class="ep-btn" :class="{ active: canvasViewMode === 'preview' }" @click="setCanvasViewMode('preview')" title="Focus preview"><i class="bi bi-eye"></i></button>
        </div>
        <div class="ep-btn-group" role="group">
          <button type="button" class="ep-btn" :class="{ active: splitRatio < 35 }" :disabled="!isSplitLayout" @click="setSplitRatio(30)" title="More preview"><i class="bi bi-layout-sidebar-reverse"></i></button>
          <button type="button" class="ep-btn" :class="{ active: splitRatio >= 35 && splitRatio <= 65 }" :disabled="!isSplitLayout" @click="setSplitRatio(50)" title="Equal split"><i class="bi bi-layout-split"></i></button>
          <button type="button" class="ep-btn" :class="{ active: splitRatio > 65 }" :disabled="!isSplitLayout" @click="setSplitRatio(70)" title="More editor"><i class="bi bi-layout-sidebar"></i></button>
        </div>
        <button class="ep-btn" :class="showAgentChat ? 'ep-btn-primary' : ''" @click="showAgentChat = !showAgentChat" title="AI Assistant">
          <i class="bi bi-robot me-1"></i> AI
        </button>
      </div>
    </div>

    <div v-if="activeTemplate" class="template-info-bar mb-2">
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-primary"><i class="bi bi-file-code me-1"></i> {{ activeTemplate.name }}</span>
        <span class="text-muted">→</span>
        <span class="badge bg-secondary"><i class="bi bi-diagram-3 me-1"></i> {{ getStructureName(selectedStructureId) }}</span>
        <span class="badge" :class="editorMode === 'designer' ? 'bg-success' : 'bg-dark'">
          {{ editorMode === 'designer' ? 'Designer mode' : 'HTML advanced mode' }}
        </span>
      </div>
    </div>

    <div class="editor-layout" :class="{ 'with-agent': showAgentChat }">
    <div class="split-view" ref="splitViewRef" :class="{ dragging: isDragging, 'focus-editor': canvasViewMode === 'editor', 'focus-preview': canvasViewMode === 'preview' }">
      <div
        v-if="showEditorPane"
        class="split-panel editor-panel"
        :class="{ 'full-width': !isSplitLayout }"
        :style="isSplitLayout ? { width: `calc(${splitRatio}% - 6px)` } : undefined"
      >
        <div class="panel-header" style="background-color: #1a1f36;">
          <h6 class="panel-title" style="color: #FFF;">
            <i :class="editorMode === 'designer' ? 'bi bi-layout-text-window-reverse me-2' : 'bi bi-code-square me-2'"></i>
            {{ editorMode === 'designer' ? 'Designer Canvas' : 'HTML Template' }}
          </h6>
          <div class="d-flex align-items-center gap-1">
            <template v-if="editorMode === 'html'">
              <span class="badge bg-secondary">Mustache</span>
              <button class="btn-syntax-help" title="Format HTML" @click="formatHtml"><i class="bi bi-braces-asterisk"></i></button>
              <button class="btn-syntax-help" @click="showMustacheHelp = !showMustacheHelp" title="Mustache syntax help"><i class="bi bi-info-circle"></i></button>
              <button class="btn-syntax-help" title="Load designer model from HTML metadata" @click="loadDesignerFromHtml"><i class="bi bi-arrow-repeat"></i></button>
            </template>
            <template v-else>
              <span class="badge bg-success">Reliable designer</span>
              <button class="btn-syntax-help" title="Push generated output to HTML advanced mode" @click="applyDesignerToHtml"><i class="bi bi-upload"></i></button>
            </template>
            <button class="btn-syntax-help" title="Switch to preview" @click="switchToPreview"><i class="bi bi-arrow-right-square"></i></button>
          </div>
        </div>
        <div v-if="editorMode === 'html' && showMustacheHelp" class="syntax-help-popup">
          <div class="syntax-help-header">
            <h6 class="mb-0"><i class="bi bi-mortarboard me-2"></i> Template Guide</h6>
            <button class="btn-close btn-close-white btn-sm" @click="showMustacheHelp = false"></button>
          </div>
          <div class="syntax-help-content">
            <div class="syntax-section-label">Mustache Syntax</div>
            <div class="syntax-item"><code>{{"\{\{fieldName\}\}"}}</code><span>Output a value</span></div>
            <div class="syntax-item"><code>{{"\{\{#rows\}\}...\{\{/rows\}\}"}}</code><span>Loop over data rows</span></div>
            <div class="syntax-item"><code>{{"\{\{#condition\}\}...\{\{/condition\}\}"}}</code><span>Conditional (truthy)</span></div>
            <div class="syntax-item"><code>{{"\{\{^condition\}\}...\{\{/condition\}\}"}}</code><span>Conditional (falsy)</span></div>
            <div class="syntax-item"><code>{{"\{\{_index\}\}"}}</code><span>Row number (1-based)</span></div>
            <div class="syntax-item"><code>{{"\{\{_total\}\}"}}</code><span>Total row count</span></div>
            <hr class="my-2">
            <div class="syntax-section-label">Report Components</div>
            <div class="syntax-item"><code>.report-page</code><span>Page wrapper (A4 size)</span></div>
            <div class="syntax-item"><code>.report-tile.tile-primary</code><span>Stat tile — blue</span></div>
            <div class="syntax-item"><code>.report-tile.tile-success</code><span>Stat tile — green</span></div>
            <div class="syntax-item"><code>.report-tile.tile-warning</code><span>Stat tile — amber</span></div>
            <div class="syntax-item"><code>.report-tile.tile-danger</code><span>Stat tile — red</span></div>
            <div class="syntax-item"><code>.report-table</code><span>Styled data table</span></div>
            <div class="syntax-item"><code>.report-bar-chart</code><span>Bar chart (data-labels / data-values)</span></div>
            <div class="syntax-item"><code>.report-pie-chart</code><span>Pie chart (data-labels / data-values)</span></div>
            <div class="syntax-item"><code>.page-number</code><span>Footer page counter</span></div>
            <hr class="my-2">
            <div class="syntax-section-label">Bootstrap 5</div>
            <p class="syntax-note">Bootstrap 5 is fully available — use any utility or grid class directly in your template.</p>
            <div class="syntax-item"><code>.row / .col-md-*</code><span>Responsive grid layout</span></div>
            <div class="syntax-item"><code>.d-flex / .gap-*</code><span>Flexbox utilities</span></div>
            <div class="syntax-item"><code>.badge / .text-muted</code><span>Typography helpers</span></div>
            <hr class="my-2">
            <div class="syntax-section-label">Conditional Styles</div>
            <div class="syntax-item"><code>{{"\{\{field\}\}"}}</code><span>Use as CSS class suffix</span></div>
            <p class="syntax-note">Interpolate a field into the class name, then define one CSS rule per value in a <code>&lt;style&gt;</code> block.</p>
            <div class="syntax-example">
              <pre>&lt;style&gt;
  .status-approved { background: #198754; color: white; }
  .status-pending  { background: #fd7e14; color: white; }
  .status-rejected { background: #dc3545; color: white; }
&lt;/style&gt;

&lt;span class="badge status-{{"\{\{approval_status\}\}"}}"&gt;
  {{"\{\{approval_status\}\}"}}
&lt;/span&gt;</pre>
            </div>
            <p class="syntax-note mt-2">For conditional blocks (not just colour), add boolean columns in your SQL: <code>status = 'approved' AS is_approved</code> then use <code>{{"\{\{#is_approved\}\}"}}</code>.</p>
            <hr class="my-2">
            <div class="syntax-section-label">Custom Styles</div>
            <p class="syntax-note">Add a <code>&lt;style&gt;</code> block at the top of your template for fully custom CSS.</p>
            <div class="syntax-example">
              <pre>&lt;style&gt;
  .my-header { background: #1a1f36; color: white; }
&lt;/style&gt;

{{"\{\{#rows\}\}"}}
&lt;div class="report-page"&gt;
  &lt;div class="my-header"&gt;{{"\{\{name\}\}"}}&lt;/div&gt;
  &lt;div class="page-number"&gt;{{"\{\{_index\}\}"}} / {{"\{\{_total\}\}"}}&lt;/div&gt;
&lt;/div&gt;
{{"\{\{/rows\}\}"}}</pre>
            </div>
          </div>
        </div>
        <div v-if="editorMode === 'designer'" class="designer-content">
          <div class="designer-grid">
            <section class="designer-card">
              <h6 class="designer-card-title"><i class="bi bi-card-heading me-2"></i>Header</h6>
              <label class="form-label form-label-sm">Report Title</label>
              <input v-model="designerModel.title" type="text" class="form-control form-control-sm mb-2">
              <label class="form-label form-label-sm">Subtitle</label>
              <input v-model="designerModel.subtitle" type="text" class="form-control form-control-sm mb-2">
              <label class="form-label form-label-sm">Period Label</label>
              <input v-model="designerModel.periodLabel" type="text" class="form-control form-control-sm mb-2">
              <label class="form-label form-label-sm">Run Date Field</label>
              <input v-model="designerModel.runDateField" type="text" class="form-control form-control-sm">
            </section>

            <section class="designer-card">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="designer-card-title mb-0"><i class="bi bi-table me-2"></i>Columns</h6>
                <div class="designer-column-add-row">
                  <select v-model="newColumnFieldPath" class="form-select form-select-sm">
                    <option disabled value="">Select field...</option>
                    <option v-for="field in addableDesignerFields" :key="field.path" :value="field.path">
                      {{ field.label }} ({{ field.type }})
                    </option>
                  </select>
                  <button
                    class="ep-btn"
                    :disabled="!newColumnFieldPath || addableDesignerFields.length === 0"
                    @click="addDesignerColumn"
                  >
                    <i class="bi bi-plus-lg me-1"></i>Add
                  </button>
                </div>
              </div>
              <p v-if="addableDesignerFields.length === 0" class="small text-muted mt-2 mb-0">
                All available fields are already added.
              </p>
              <label class="form-label form-label-sm mt-2">Account Group Label</label>
              <input v-model="designerModel.accountGroupLabel" type="text" class="form-control form-control-sm mb-2">
              <div class="form-check form-switch mb-2">
                <input id="show-row-number" v-model="designerModel.showRowNumber" class="form-check-input" type="checkbox">
                <label class="form-check-label small" for="show-row-number">Show row number column</label>
              </div>
              <div class="form-check form-switch mb-2">
                <input id="show-grand-total" v-model="designerModel.showGrandTotal" class="form-check-input" type="checkbox">
                <label class="form-check-label small" for="show-grand-total">Show grand total row</label>
              </div>
              <input
                v-model="designerModel.totalLabel"
                type="text"
                class="form-control form-control-sm mb-2"
                :disabled="!designerModel.showGrandTotal"
                placeholder="Grand total label"
              >
              <div class="row g-2 mb-2">
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Group by</label>
                  <select v-model="designerModel.groupByField" class="form-select form-select-sm">
                    <option :value="undefined">No grouping</option>
                    <option v-for="field in designerAvailableFields" :key="`group-${field.path}`" :value="field.path">
                      {{ field.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">Sort by</label>
                  <select v-model="designerModel.sortByField" class="form-select form-select-sm">
                    <option :value="undefined">Default</option>
                    <option v-for="field in designerAvailableFields" :key="`sort-${field.path}`" :value="field.path">
                      {{ field.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">Direction</label>
                  <select v-model="designerModel.sortDirection" class="form-select form-select-sm">
                    <option value="asc">ASC</option>
                    <option value="desc">DESC</option>
                  </select>
                </div>
              </div>
              <div class="form-check form-switch mb-2">
                <input id="show-group-subtotal" v-model="designerModel.showGroupSubtotals" class="form-check-input" type="checkbox" :disabled="!designerModel.groupByField">
                <label class="form-check-label small" for="show-group-subtotal">Show group subtotals</label>
              </div>
              <div v-if="hasColumnOverflowRisk" class="alert alert-warning py-1 px-2 small mb-2">
                Column count is high for A4 width. Consider reducing columns or using landscape in Preview.
              </div>
              <div v-for="(column, index) in designerModel.columns" :key="`${column.key}-${index}`" class="designer-column-row">
                <select v-model="column.key" class="ep-select w-100">
                  <option v-for="field in designerAvailableFields" :key="field.path" :value="field.path">
                    {{ field.label }} ({{ field.type }})
                  </option>
                </select>
                <input v-model="column.label" type="text" class="ep-input w-100" placeholder="Column label">
                <div class="ep-btn-group">
                  <button class="ep-btn" title="Align left" @click="alignDesignerColumn(index, 'left')">L</button>
                  <button class="ep-btn" title="Align center" @click="alignDesignerColumn(index, 'center')">C</button>
                  <button class="ep-btn" title="Align right" @click="alignDesignerColumn(index, 'right')">R</button>
                </div>
                <div class="ep-btn-group">
                  <button
                    class="ep-btn"
                    :class="isColumnInTotals(column.key) ? 'ep-btn-primary' : ''"
                    :disabled="!designerModel.showGrandTotal"
                    title="Include/exclude this column in grand total"
                    @click="toggleColumnTotal(column.key)"
                  >
                    Σ
                  </button>
                  <button class="ep-btn" title="Auto label" @click="resetColumnLabel(index)"><i class="bi bi-magic"></i></button>
                  <button class="ep-btn" title="Move up" :disabled="index === 0" @click="moveDesignerColumn(index, -1)"><i class="bi bi-arrow-up"></i></button>
                  <button class="ep-btn" title="Move down" :disabled="index === designerModel.columns.length - 1" @click="moveDesignerColumn(index, 1)"><i class="bi bi-arrow-down"></i></button>
                  <button class="ep-btn ep-btn-danger" title="Remove" :disabled="designerModel.columns.length <= 1" @click="removeDesignerColumn(index)"><i class="bi bi-trash"></i></button>
                </div>
              </div>
              <p class="small text-muted mb-0">
                Tip: use <strong>Σ</strong> to mark numeric columns included in grand total.
              </p>
            </section>

            <section class="designer-card">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="designer-card-title mb-0"><i class="bi bi-sliders me-2"></i>Parameters</h6>
              </div>
              <div class="designer-param-add-row">
                <input
                  v-model="newParameterLabel"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Label (e.g. DEPT)"
                >
                <select v-model="newParameterDataType" class="form-select form-select-sm">
                  <option v-for="type in parameterDataTypes" :key="`ptype-${type.value}`" :value="type.value">
                    Type: {{ type.label }}
                  </option>
                </select>
                <input
                  v-model="newParameterValue"
                  type="text"
                  class="form-control form-control-sm"
                  :disabled="Boolean(newParameterFieldPath)"
                  placeholder="Value (or bind field)"
                >
                <input
                  v-model="newParameterDefaultValue"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Default value"
                >
                <select v-model="newParameterFieldPath" class="form-select form-select-sm">
                  <option value="">Static value</option>
                  <option v-for="field in designerAvailableFields" :key="`bind-${field.path}`" :value="field.path">
                    Bind: {{ field.label }}
                  </option>
                </select>
                <button class="ep-btn" @click="addDesignerParameter">
                  <i class="bi bi-plus-lg me-1"></i>Add
                </button>
              </div>
              <div class="designer-param-add-row mt-1">
                <select v-model="newParameterFilterField" class="form-select form-select-sm">
                  <option value="">No dataset filter</option>
                  <option v-for="field in designerAvailableFields" :key="`filter-${field.path}`" :value="field.path">
                    Filter by: {{ field.label }}
                  </option>
                </select>
                <select v-model="newParameterFilterOperator" class="form-select form-select-sm" :disabled="!newParameterFilterField">
                  <option v-for="operator in parameterFilterOperators" :key="operator.value" :value="operator.value">
                    {{ operator.label }}
                  </option>
                </select>
                <select v-model="newParameterOptionsSourceField" class="form-select form-select-sm">
                  <option value="">Options source (auto)</option>
                  <option v-for="field in designerAvailableFields" :key="`option-${field.path}`" :value="field.path">
                    Options: {{ field.label }}
                  </option>
                </select>
                <input
                  v-model="newParameterStaticOptionsCsv"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Static options CSV (optional)"
                >
                <select v-model="newParameterDependsOn" class="form-select form-select-sm">
                  <option value="">No dependency</option>
                  <option v-for="label in parameterLabelOptions" :key="`dep-${label}`" :value="label">
                    Depends on: {{ label }}
                  </option>
                </select>
                <div class="d-flex align-items-center gap-2 px-2">
                  <div class="form-check form-check-inline m-0">
                    <input id="new-param-required" v-model="newParameterRequired" class="form-check-input" type="checkbox">
                    <label class="form-check-label small" for="new-param-required">Required</label>
                  </div>
                  <div class="form-check form-check-inline m-0">
                    <input id="new-param-multi" v-model="newParameterAllowMultiple" class="form-check-input" type="checkbox">
                    <label class="form-check-label small" for="new-param-multi">Multi</label>
                  </div>
                </div>
              </div>
              <p class="small text-muted mb-2">
                If you select a field binding, parameter value becomes <code v-pre>{{field_path}}</code>. Set
                <strong>Filter by</strong> to make this parameter behave like an SSRS dataset filter. Use
                <strong>Options source</strong> + <strong>Depends on</strong> for cascading dropdowns.
              </p>
              <div v-for="(param, index) in designerModel.parameters" :key="`${param.label}-${index}`" class="designer-param-row">
                <input v-model="param.label" type="text" class="form-control form-control-sm" placeholder="Label">
                <select v-model="param.dataType" class="form-select form-select-sm">
                  <option v-for="type in parameterDataTypes" :key="`row-ptype-${index}-${type.value}`" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
                <input v-model="param.value" type="text" class="form-control form-control-sm" placeholder="Value">
                <input v-model="param.defaultValue" type="text" class="form-control form-control-sm" placeholder="Default">
                <select v-model="param.filterField" class="form-select form-select-sm">
                  <option value="">No dataset filter</option>
                  <option v-for="field in designerAvailableFields" :key="`row-filter-${index}-${field.path}`" :value="field.path">
                    {{ field.label }}
                  </option>
                </select>
                <select v-model="param.filterOperator" class="form-select form-select-sm" :disabled="!param.filterField">
                  <option value="">Default (=)</option>
                  <option v-for="operator in parameterFilterOperators" :key="`row-operator-${index}-${operator.value}`" :value="operator.value">
                    {{ operator.label }}
                  </option>
                </select>
                <select v-model="param.optionsSourceField" class="form-select form-select-sm">
                  <option value="">Options source (auto)</option>
                  <option v-for="field in designerAvailableFields" :key="`row-option-${index}-${field.path}`" :value="field.path">
                    {{ field.label }}
                  </option>
                </select>
                <input
                  :value="(param.staticOptions || []).join(', ')"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Static options CSV"
                  @input="param.staticOptions = parseCsvOptions(($event.target as HTMLInputElement).value)"
                >
                <select v-model="param.dependsOn" class="form-select form-select-sm">
                  <option value="">No dependency</option>
                  <option v-for="label in parameterLabelOptions" :key="`row-dep-${index}-${label}`" :value="label">
                    {{ label }}
                  </option>
                </select>
                <div class="d-flex align-items-center gap-2 px-2">
                  <div class="form-check form-check-inline m-0">
                    <input :id="`param-required-${index}`" v-model="param.required" class="form-check-input" type="checkbox">
                    <label class="form-check-label small" :for="`param-required-${index}`">Required</label>
                  </div>
                  <div class="form-check form-check-inline m-0">
                    <input :id="`param-multi-${index}`" v-model="param.allowMultiple" class="form-check-input" type="checkbox">
                    <label class="form-check-label small" :for="`param-multi-${index}`">Multi</label>
                  </div>
                </div>
                <button class="ep-btn ep-btn-danger" title="Remove parameter" @click="removeDesignerParameter(index)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </section>

            <section class="designer-card">
              <h6 class="designer-card-title"><i class="bi bi-palette me-2"></i>Conditional Formatting</h6>
              <div class="designer-param-add-row">
                <select v-model="newConditionalField" class="form-select form-select-sm">
                  <option value="">Field</option>
                  <option v-for="field in designerAvailableFields" :key="`cf-field-${field.path}`" :value="field.path">
                    {{ field.label }}
                  </option>
                </select>
                <select v-model="newConditionalOperator" class="form-select form-select-sm">
                  <option v-for="operator in conditionalOperators" :key="`cf-op-${operator.value}`" :value="operator.value">
                    {{ operator.label }}
                  </option>
                </select>
                <input v-model="newConditionalValue" type="text" class="form-control form-control-sm" placeholder="Compare value">
                <input v-model="newConditionalCssClass" type="text" class="form-control form-control-sm" placeholder="CSS class (e.g. amount-alert)">
                <button class="ep-btn" @click="addConditionalRule">
                  <i class="bi bi-plus-lg me-1"></i>Add rule
                </button>
              </div>
              <div v-if="(designerModel.conditionalRules || []).length === 0" class="small text-muted mt-2">
                No conditional rules yet.
              </div>
              <div
                v-for="(rule, index) in (designerModel.conditionalRules || [])"
                :key="`cond-${index}`"
                class="designer-param-row"
              >
                <select v-model="rule.field" class="form-select form-select-sm">
                  <option v-for="field in designerAvailableFields" :key="`cf-row-field-${index}-${field.path}`" :value="field.path">
                    {{ field.label }}
                  </option>
                </select>
                <select v-model="rule.operator" class="form-select form-select-sm">
                  <option v-for="operator in conditionalOperators" :key="`cf-row-op-${index}-${operator.value}`" :value="operator.value">
                    {{ operator.label }}
                  </option>
                </select>
                <input v-model="rule.value" type="text" class="form-control form-control-sm" placeholder="Compare value">
                <input v-model="rule.cssClass" type="text" class="form-control form-control-sm" placeholder="css class">
                <button class="ep-btn ep-btn-danger" title="Remove rule" @click="removeConditionalRule(index)">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </section>

            <section class="designer-card">
              <h6 class="designer-card-title"><i class="bi bi-layout-text-sidebar-reverse me-2"></i>Footer</h6>
              <label class="form-label form-label-sm">Left</label>
              <input v-model="designerModel.footerLeft" type="text" class="form-control form-control-sm mb-2">
              <label class="form-label form-label-sm">Center</label>
              <input v-model="designerModel.footerCenter" type="text" class="form-control form-control-sm mb-2">
              <label class="form-label form-label-sm">Right</label>
              <input v-model="designerModel.footerRight" type="text" class="form-control form-control-sm">
              <p class="small text-muted mt-2 mb-0">
                Use Mustache in footer right, for example: <code v-pre>{{page_number}} / {{total_pages}}</code>
              </p>
            </section>
          </div>
        </div>
        <div v-else ref="editorEl" class="code-editor" />
      </div>
      <div v-if="isSplitLayout && showEditorPane && showPreviewPane" class="resize-handle" @mousedown="startDrag" title="Drag to resize panels"><div class="resize-handle-bar"></div></div>
      <div
        v-if="showPreviewPane"
        class="split-panel preview-panel"
        :class="{ 'full-width': !isSplitLayout }"
        :style="isSplitLayout ? { width: `calc(${100 - splitRatio}% - 6px)` } : undefined"
      >
        <div class="panel-header">
          <h6 class="panel-title"><i class="bi bi-eye me-2"></i> Live Preview</h6>
          <div class="d-flex align-items-center gap-1">
            <transition name="fade">
              <span v-if="previewLoading" class="preview-loading-badge">
                <span class="spinner-border spinner-border-sm me-1"></span> Loading data…
              </span>
            </transition>
            <button
              v-if="!isSplitLayout"
              class="btn btn-sm btn-outline-secondary"
              title="Back to split view"
              @click="setCanvasViewMode('split')"
            >
              <i class="bi bi-layout-split"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              title="Hide preview"
              @click="switchToEditor"
            >
              <i class="bi bi-chevron-bar-right"></i>
            </button>
          </div>
        </div>
        <div class="preview-content"><ReportPreview :html="renderedHtml" /></div>
      </div>
    </div>

    <!-- Agent Chat Panel -->
    <div v-if="showAgentChat" class="agent-panel">
      <AgentChatPanel
        :template-id="activeTemplate?.id || null"
        :template-name="activeTemplate?.name || null"
        :structure-name="activeStructure?.name || null"
      />
    </div>
    </div>

    <!-- Delete Template Modal -->
    <div v-if="showDeleteTemplateModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)" @keydown.esc="showDeleteTemplateModal = false">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle-fill text-danger me-2"></i> Delete Template</h5>
            <button type="button" class="btn-close" @click="showDeleteTemplateModal = false"></button>
          </div>
          <div class="modal-body">
            Delete <strong>{{ activeTemplate?.name }}</strong>? This cannot be undone.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteTemplateModal = false">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDeleteTemplate">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Template Modal -->
    <div v-if="showNewTemplateModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-file-earmark-plus me-2"></i> New Template</h5>
            <button type="button" class="btn-close" @click="showNewTemplateModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Template Name</label>
              <input v-model="newTemplateName" type="text" class="form-control" placeholder="e.g., Monthly Sales Report" />
            </div>
            <div class="mb-3">
              <label class="form-label"><i class="bi bi-link-45deg me-1"></i> Link to Data Structure</label>
              <select v-model="newTemplateStructureId" class="form-select">
                <option value="" disabled>Select a structure...</option>
                <option v-for="s in (structures ?? [])" :key="s.id" :value="s.id">{{ s.name }} ({{ s.fields?.length ?? 0 }} fields)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showNewTemplateModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="isCreatingTemplate" @click="createTemplate">
              <span v-if="isCreatingTemplate" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <i v-else class="bi bi-plus-lg me-1"></i>
              Create Template
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-editor-view { height: calc(100vh - var(--pr-navbar-height) - 3rem); display: flex; flex-direction: column; }
.toolbar { flex-shrink: 0; }
.template-info-bar { flex-shrink: 0; font-size: 0.8rem; }
.editor-layout { flex: 1; min-height: 0; display: flex; gap: 0; }
.editor-layout .split-view { flex: 1; min-width: 0; }
.agent-panel { width: 340px; flex-shrink: 0; min-height: 0; display: flex; flex-direction: column; border-radius: 0 8px 8px 0; overflow: hidden; border: 1px solid #dee2e6; border-left: none; }
.split-view { flex: 1; min-height: 0; display: flex; gap: 0; position: relative; }
.split-view.dragging { cursor: col-resize; user-select: none; }
.split-panel { flex: none !important; min-width: 200px; overflow: hidden; display: flex; flex-direction: column; transition: width 0.15s ease; }
.split-panel.full-width { width: 100% !important; flex: 1 1 auto !important; min-width: 0; }
.split-view.dragging .split-panel { transition: none; }
.resize-handle { width: 12px; cursor: col-resize; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: transparent; transition: background 0.2s ease; z-index: 10; }
.resize-handle:hover { background: rgba(52, 152, 219, 0.1); }
.resize-handle-bar { width: 4px; height: 40px; background: #dee2e6; border-radius: 2px; transition: all 0.2s ease; }
.resize-handle:hover .resize-handle-bar { background: var(--pr-info); height: 60px; }
.split-view.dragging .resize-handle-bar { background: var(--pr-info); height: 80px; }
.editor-panel { background: var(--pr-editor-bg); border-radius: 8px 0 0 8px; }
.preview-panel { background: #fff; border-radius: 0 8px 8px 0; border: 1px solid #dee2e6; border-left: none; }
.editor-panel.full-width { border-radius: 8px; }
.preview-panel.full-width { border-radius: 8px; border-left: 1px solid #dee2e6; }
.code-editor { flex: 1; min-height: 0; overflow: hidden; }
.code-editor :deep(.cm-editor) { height: 100%; font-size: 0.82rem; }
.code-editor :deep(.cm-scroller) { overflow: auto; font-family: 'Fira Code', 'Consolas', 'Monaco', monospace; }
.code-editor :deep(.cm-editor.cm-focused) { outline: none; }
.designer-content { flex: 1; overflow: auto; background: #0f1528; padding: 0.75rem; }
.designer-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
.designer-card {
  background: #ffffff;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 0.75rem;
}
.designer-card-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #334155;
  margin-bottom: 0.6rem;
}
.designer-column-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr auto auto;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}
.designer-column-add-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 0.4rem;
  align-items: center;
}
.designer-param-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 0.35rem;
  margin-top: 0.35rem;
  align-items: center;
}
.designer-param-add-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 0.35rem;
  margin-top: 0.35rem;
  margin-bottom: 0.45rem;
  align-items: center;
}
.preview-content { flex: 1; overflow: auto; padding: 0; }
.btn-group .btn.active { background-color: var(--pr-info); border-color: var(--pr-info); color: white; }
.btn-syntax-help { background: transparent; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 0.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.btn-syntax-help:hover { color: white; background: rgba(255,255,255,0.2); }
.syntax-help-popup { position: absolute; top: 45px; right: 10px; width: 340px; background: #1a1a2e; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 100; overflow: hidden; border: 1px solid #2d2d44; }
.syntax-help-header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
.syntax-help-content { padding: 1rem; max-height: 400px; overflow-y: auto; }
.syntax-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid #2d2d44; }
.syntax-item:last-of-type { border-bottom: none; }
.syntax-item code { background: #2d2d44; color: #e74c3c; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-family: 'Fira Code', 'Consolas', monospace; }
.syntax-item span { color: #a0a0a0; font-size: 0.75rem; }
.syntax-example { margin-top: 0.5rem; }
.syntax-example strong { color: #e0e0e0; font-size: 0.8rem; }
.syntax-example pre { background: #2d2d44; color: #a0e0a0; padding: 0.75rem; border-radius: 6px; font-size: 0.7rem; margin-top: 0.5rem; overflow-x: auto; white-space: pre-wrap; font-family: 'Fira Code', 'Consolas', monospace; }
.syntax-help-content hr { border-color: #2d2d44; }
.structure-hint-popup { position: absolute; top: 100%; left: 0; margin-top: 6px; width: 340px; z-index: 200; box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.structure-hint-popup .card-body { max-height: 360px; overflow-y: auto; }
.hint-field-item { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 0.4rem 0.6rem; margin-bottom: 0.35rem; font-size: 0.8rem; }
.hint-field-item.nested { border-left: 3px solid var(--pr-info); background: #fff; }
.hint-mustache { font-size: 0.72rem; color: #6c757d; }
.preview-loading-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 500;
  color: #0c63e4;
  background: #cfe2ff;
  border: 1px solid #b6d4fe;
  border-radius: 6px;
  padding: 0.2rem 0.55rem;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.syntax-section-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #7c83a0; margin: 0.6rem 0 0.4rem; }
.syntax-note { font-size: 0.75rem; color: #a0a0a0; margin: 0.15rem 0 0.5rem; line-height: 1.4; }
.syntax-note code { background: #2d2d44; color: #e74c3c; padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.72rem; }

@media (max-width: 1100px) {
  .designer-column-row {
    grid-template-columns: 1fr;
  }
  .designer-column-add-row {
    grid-template-columns: 1fr;
  }
  .designer-param-row {
    grid-template-columns: 1fr;
  }
  .designer-param-add-row {
    grid-template-columns: 1fr;
  }
}
</style>
