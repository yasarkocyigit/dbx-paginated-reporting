export type DesignerAlignment = 'left' | 'center' | 'right'
export type DesignerParameterType = 'string' | 'number' | 'date' | 'boolean' | 'enum'
export type DesignerFilterOperator =
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
export type DesignerSortDirection = 'asc' | 'desc'
export type DesignerConditionalOperator = 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'

export interface DesignerColumn {
  key: string
  label: string
  align: DesignerAlignment
}

export interface DesignerParameter {
  label: string
  value: string
  dataType?: DesignerParameterType
  required?: boolean
  allowMultiple?: boolean
  defaultValue?: string
  staticOptions?: string[]
  optionsSourceField?: string
  dependsOn?: string
  filterField?: string
  filterOperator?: DesignerFilterOperator
}

export interface DesignerConditionalRule {
  field: string
  operator: DesignerConditionalOperator
  value: string
  cssClass: string
}

export interface DesignerModel {
  version: number
  title: string
  subtitle: string
  periodLabel: string
  runDateField: string
  accountGroupLabel: string
  showRowNumber: boolean
  showGrandTotal: boolean
  totalLabel: string
  totalFields: string[]
  footerLeft: string
  footerCenter: string
  footerRight: string
  columns: DesignerColumn[]
  parameters: DesignerParameter[]
  groupByField?: string
  showGroupSubtotals?: boolean
  sortByField?: string
  sortDirection?: DesignerSortDirection
  conditionalRules?: DesignerConditionalRule[]
}

const DESIGNER_META_START = '<!-- DESIGNER_META_START'
const DESIGNER_META_END = 'DESIGNER_META_END -->'

function toTitleCase(input: string): string {
  return input
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlPreservingMustache(input: string): string {
  const tokens: string[] = []
  const replaced = input.replace(/\{\{[\s\S]*?\}\}/g, (match) => {
    const marker = `__MUSTACHE_TOKEN_${tokens.length}__`
    tokens.push(match)
    return marker
  })
  const escaped = escapeHtml(replaced)
  return escaped.replace(/__MUSTACHE_TOKEN_(\d+)__/g, (_all, rawIndex: string) => {
    const index = Number(rawIndex)
    return tokens[index] ?? ''
  })
}

function sanitizePath(input: string): string {
  return input.trim().replace(/[^\w.]/g, '')
}

function isFilterOperator(value: string): value is DesignerFilterOperator {
  return [
    'equals',
    'not_equals',
    'contains',
    'starts_with',
    'ends_with',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
  ].includes(value)
}

function isParameterType(value: string): value is DesignerParameterType {
  return ['string', 'number', 'date', 'boolean', 'enum'].includes(value)
}

function isSortDirection(value: string): value is DesignerSortDirection {
  return ['asc', 'desc'].includes(value)
}

function isConditionalOperator(value: string): value is DesignerConditionalOperator {
  return ['equals', 'not_equals', 'contains', 'gt', 'gte', 'lt', 'lte'].includes(value)
}

function normalizeStaticOptions(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return Array.from(
    new Set(
      input
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 0),
    ),
  )
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

export function suggestLabelFromPath(path: string): string {
  const leaf = path.split('.').pop() || path
  return toTitleCase(leaf)
}

export function createDefaultDesignerModel(availableFieldPaths: string[]): DesignerModel {
  const defaults = availableFieldPaths.slice(0, 6).map((path) => ({
    key: path,
    label: suggestLabelFromPath(path),
    align: 'left' as DesignerAlignment,
  }))
  const defaultTotals = availableFieldPaths
    .filter((path) => /amount|total|debit|credit|balance|qty|count/i.test(path))
    .slice(0, 3)

  return {
    version: 1,
    title: 'General Ledger Detail',
    subtitle: 'Consolidated Entity: Global Corp Inc.',
    periodLabel: 'Period: Dec 2024',
    runDateField: 'txn_date',
    accountGroupLabel: 'Account Group: 5000 - Operating Expenses',
    showRowNumber: true,
    showGrandTotal: true,
    totalLabel: 'GRAND TOTAL:',
    totalFields: defaultTotals,
    footerLeft: 'PAGINATED REPORTING',
    footerCenter: 'CONFIDENTIAL',
    footerRight: 'Page {{page_number}} of {{total_pages}}',
    columns: defaults,
    parameters: [
      { label: 'DEPT', value: 'ALL', dataType: 'string', defaultValue: 'ALL' },
      { label: 'STATUS', value: 'POSTED, PENDING', dataType: 'string', defaultValue: 'POSTED, PENDING' },
      { label: 'CURR', value: 'USD', dataType: 'string', defaultValue: 'USD' },
      { label: 'USER', value: 'SYS_ADMIN', dataType: 'string', defaultValue: 'SYS_ADMIN' },
    ],
    showGroupSubtotals: false,
    sortDirection: 'asc',
    conditionalRules: [],
  }
}

function normalizeDesignerModel(candidate: DesignerModel): DesignerModel {
  const sanitizedColumns = (candidate.columns || [])
    .map((col) => ({
      key: sanitizePath(col.key || ''),
      label: (col.label || '').trim(),
      align: (col.align === 'center' || col.align === 'right' ? col.align : 'left') as DesignerAlignment,
    }))
    .filter((col) => col.key.length > 0)
    .map((col) => ({
      ...col,
      label: col.label || suggestLabelFromPath(col.key),
    }))

  const columnKeySet = new Set(sanitizedColumns.map((col) => col.key))
  const groupByField = sanitizePath(candidate.groupByField || '')
  const sortByField = sanitizePath(candidate.sortByField || '')
  const normalizedSortDirection: DesignerSortDirection = isSortDirection(String(candidate.sortDirection || ''))
    ? (candidate.sortDirection as DesignerSortDirection)
    : 'asc'
  const conditionalRules = (candidate.conditionalRules || [])
    .map((rule) => ({
      field: sanitizePath(rule.field || ''),
      operator: isConditionalOperator(String(rule.operator || '')) ? rule.operator : 'equals',
      value: String(rule.value || '').trim(),
      cssClass: String(rule.cssClass || '').trim().replace(/[^\w-]/g, ''),
    }))
    .filter((rule) => rule.field.length > 0 && rule.cssClass.length > 0)

  return {
    version: 1,
    title: candidate.title?.trim() || 'General Ledger Detail',
    subtitle: candidate.subtitle?.trim() || 'Consolidated Entity: Global Corp Inc.',
    periodLabel: candidate.periodLabel?.trim() || 'Period: Dec 2024',
    runDateField: sanitizePath(candidate.runDateField || 'txn_date') || 'txn_date',
    accountGroupLabel: candidate.accountGroupLabel?.trim() || 'Account Group: 5000 - Operating Expenses',
    showRowNumber: Boolean(candidate.showRowNumber),
    showGrandTotal: typeof candidate.showGrandTotal === 'boolean'
      ? candidate.showGrandTotal
      : Boolean(candidate.totalFields?.length),
    totalLabel: candidate.totalLabel?.trim() || 'GRAND TOTAL:',
    totalFields: Array.from(new Set((candidate.totalFields || [])
      .map((path) => sanitizePath(path || ''))
      .filter((path) => path.length > 0 && columnKeySet.has(path)))),
    footerLeft: candidate.footerLeft?.trim() || 'PAGINATED REPORTING',
    footerCenter: candidate.footerCenter?.trim() || 'CONFIDENTIAL',
    footerRight: candidate.footerRight?.trim() || 'Page {{page_number}} of {{total_pages}}',
    columns: sanitizedColumns,
    groupByField: groupByField || undefined,
    showGroupSubtotals: Boolean(candidate.showGroupSubtotals),
    sortByField: sortByField || undefined,
    sortDirection: normalizedSortDirection,
    conditionalRules,
    parameters: (candidate.parameters || [])
      .map((param) => {
        const rawOperator = String(param.filterOperator || '')
        const filterOperator: DesignerFilterOperator | undefined =
          isFilterOperator(rawOperator) ? rawOperator : undefined
        const rawDataType = String(param.dataType || '')
        const dataType: DesignerParameterType = isParameterType(rawDataType) ? rawDataType : 'string'
        const staticOptions = normalizeStaticOptions(param.staticOptions)
        const optionsSourceField = sanitizePath(String(param.optionsSourceField || ''))
        const dependsOn = String(param.dependsOn || '').trim()
        return {
          label: (param.label || '').trim(),
          value: (param.value || '').trim(),
          defaultValue: String(param.defaultValue || '').trim(),
          dataType,
          required: Boolean(param.required),
          allowMultiple: Boolean(param.allowMultiple),
          staticOptions,
          optionsSourceField: optionsSourceField || undefined,
          dependsOn: dependsOn || undefined,
          filterField: sanitizePath(String(param.filterField || '')),
          filterOperator,
        }
      })
      .filter((param) => param.label.length > 0)
      .map((param) => ({
        ...param,
        defaultValue: param.defaultValue || undefined,
        staticOptions: param.staticOptions?.length ? param.staticOptions : undefined,
        filterField: param.filterField || undefined,
      })),
  }
}

export function parseDesignerModelFromDefinition(definition: unknown): DesignerModel | null {
  if (!isRecord(definition)) return null

  const rawColumns = Array.isArray(definition.columns) ? definition.columns : []
  const rawParameters = Array.isArray(definition.parameters) ? definition.parameters : []
  const rawConditionalRules = Array.isArray(definition.conditionalRules) ? definition.conditionalRules : []

  const candidate: DesignerModel = {
    version: Number(definition.version ?? 1) || 1,
    title: String(definition.title ?? ''),
    subtitle: String(definition.subtitle ?? ''),
    periodLabel: String(definition.periodLabel ?? ''),
    runDateField: String(definition.runDateField ?? ''),
    accountGroupLabel: String(definition.accountGroupLabel ?? ''),
    showRowNumber: Boolean(definition.showRowNumber),
    showGrandTotal: typeof definition.showGrandTotal === 'boolean'
      ? definition.showGrandTotal
      : (Array.isArray(definition.totalFields) && definition.totalFields.length > 0),
    totalLabel: String(definition.totalLabel ?? ''),
    totalFields: Array.isArray(definition.totalFields)
      ? definition.totalFields.map((v) => String(v))
      : [],
    footerLeft: String(definition.footerLeft ?? ''),
    footerCenter: String(definition.footerCenter ?? ''),
    footerRight: String(definition.footerRight ?? ''),
    groupByField: String(definition.groupByField ?? ''),
    showGroupSubtotals: Boolean(definition.showGroupSubtotals),
    sortByField: String(definition.sortByField ?? ''),
    sortDirection: String(definition.sortDirection ?? 'asc') as DesignerSortDirection,
    conditionalRules: rawConditionalRules.map((rule) => ({
      field: isRecord(rule) ? String(rule.field ?? '') : '',
      operator: isRecord(rule) ? String(rule.operator ?? 'equals') as DesignerConditionalOperator : 'equals',
      value: isRecord(rule) ? String(rule.value ?? '') : '',
      cssClass: isRecord(rule) ? String(rule.cssClass ?? '') : '',
    })),
    columns: rawColumns.map((col) => ({
      key: isRecord(col) ? String(col.key ?? '') : '',
      label: isRecord(col) ? String(col.label ?? '') : '',
      align: isRecord(col) ? String(col.align ?? 'left') as DesignerAlignment : 'left',
    })),
    parameters: rawParameters.map((param) => {
      const rawOperator = isRecord(param) ? String(param.filterOperator ?? '') : ''
      const filterOperator: DesignerFilterOperator | undefined =
        isFilterOperator(rawOperator) ? rawOperator : undefined
      return {
        label: isRecord(param) ? String(param.label ?? '') : '',
        value: isRecord(param) ? String(param.value ?? '') : '',
        defaultValue: isRecord(param) ? String(param.defaultValue ?? '') : '',
        dataType: isRecord(param) ? String(param.dataType ?? 'string') as DesignerParameterType : 'string',
        required: isRecord(param) ? Boolean(param.required) : false,
        allowMultiple: isRecord(param) ? Boolean(param.allowMultiple) : false,
        staticOptions: isRecord(param) ? normalizeStaticOptions(param.staticOptions) : [],
        optionsSourceField: isRecord(param) ? String(param.optionsSourceField ?? '') : '',
        dependsOn: isRecord(param) ? String(param.dependsOn ?? '') : '',
        filterField: isRecord(param) ? String(param.filterField ?? '') : '',
        filterOperator,
      }
    }),
  }

  if (!candidate.columns.length && !candidate.title && !candidate.accountGroupLabel) {
    return null
  }
  return normalizeDesignerModel(candidate)
}

export function serializeDesignerDefinition(input: DesignerModel): Record<string, unknown> {
  const normalized = normalizeDesignerModel(input)
  return {
    kind: 'designer_v1',
    ...normalized,
  }
}

export function parseDesignerModelFromHtml(html: string): DesignerModel | null {
  const match = html.match(/<!--\s*DESIGNER_META_START\s*([\s\S]*?)\s*DESIGNER_META_END\s*-->/)
  if (!match?.[1]) return null
  try {
    const parsed = JSON.parse(match[1]) as DesignerModel
    return normalizeDesignerModel(parsed)
  } catch {
    return null
  }
}

export function stripDesignerMeta(html: string): string {
  return html.replace(/<!--\s*DESIGNER_META_START[\s\S]*?DESIGNER_META_END\s*-->/g, '').trim()
}

function serializeDesignerMeta(model: DesignerModel): string {
  return `${DESIGNER_META_START}\n${JSON.stringify(model, null, 2)}\n${DESIGNER_META_END}`
}

function cellClass(align: DesignerAlignment, numericHint: boolean): string {
  if (align === 'right' || numericHint) return 'num'
  if (align === 'center') return 'center'
  return ''
}

function headerClass(align: DesignerAlignment, numericHint: boolean): string {
  if (align === 'right' || numericHint) return 'num'
  if (align === 'center') return 'center'
  return ''
}

export function renderDesignerModelToHtml(input: DesignerModel): string {
  const model = normalizeDesignerModel(input)
  const cols = model.columns.length ? model.columns : [{
    key: 'txn_id',
    label: 'Txn Id',
    align: 'left' as DesignerAlignment,
  }]
  const totalFieldsSet = new Set(model.totalFields)

  const headerCells = cols.map((col) => {
    const numericHint = /amount|total|debit|credit|balance|qty|count/i.test(col.key)
    const cls = headerClass(col.align, numericHint)
    return `<th class="${cls}">${escapeHtml(col.label)}</th>`
  }).join('\n            ')

  const dataCells = cols.map((col) => {
    const numericHint = /amount|total|debit|credit|balance|qty|count/i.test(col.key)
    const cls = cellClass(col.align, numericHint)
    const classAttr = cls ? ` class="${cls}"` : ''
    return `<td${classAttr}>{{${col.key}}}</td>`
  }).join('\n              ')

  const tableHead = model.showRowNumber
    ? `<th class="num">#</th>\n            ${headerCells}`
    : headerCells

  const tableRow = model.showRowNumber
    ? `<td class="num">{{_index}}</td>\n              ${dataCells}`
    : dataCells

  let labelPlaced = false
  const totalCells = cols.map((col) => {
    if (totalFieldsSet.has(col.key)) {
      return `<td class="num">{{_totals.${col.key}}}</td>`
    }
    if (!labelPlaced) {
      labelPlaced = true
      return `<td class="gl-total-label">${escapeHtml(model.totalLabel)}</td>`
    }
    return '<td></td>'
  }).join('\n              ')
  const totalRow = model.showGrandTotal
    ? `<tr class="gl-grand-total-row">
          ${model.showRowNumber ? '<td></td>' : ''}
          ${totalCells}
        </tr>`
    : ''

  let groupSubtotalLabelPlaced = false
  const groupSubtotalCells = cols.map((col) => {
    if (totalFieldsSet.has(col.key)) {
      return `<td class="num">{{_group_totals.${col.key}}}</td>`
    }
    if (!groupSubtotalLabelPlaced) {
      groupSubtotalLabelPlaced = true
      return '<td class="gl-total-label">GROUP SUBTOTAL:</td>'
    }
    return '<td></td>'
  }).join('\n              ')

  const groupColumnCount = model.showRowNumber ? cols.length + 1 : cols.length

  const groupedRowsTemplate = model.groupByField
    ? `
        {{#rows_render}}
        {{#_group_header}}
        <tr class="gl-group-break">
          <td colspan="${groupColumnCount}">${escapeHtml(model.groupByField)}: {{_group_value}}</td>
        </tr>
        {{/_group_header}}
        {{#_is_data}}
        <tr class="gl-data-row {{_row_class}}">
          ${tableRow}
        </tr>
        {{/_is_data}}
        ${model.showGroupSubtotals ? `{{#_group_subtotal}}
        <tr class="gl-group-subtotal-row">
          ${model.showRowNumber ? '<td></td>' : ''}
          ${groupSubtotalCells}
        </tr>
        {{/_group_subtotal}}` : ''}
        {{/rows_render}}
      `
    : `
        {{#rows}}
        <tr class="gl-data-row {{_row_class}}">
          ${tableRow}
        </tr>
        {{/rows}}
      `

  const params = model.parameters.map((param) => `
      <div class="gl-param-item">
        <span class="gl-param-label">${escapeHtml(param.label)}:</span>
        <span class="gl-param-value">${escapeHtmlPreservingMustache(param.defaultValue || param.value)}</span>
      </div>`).join('')

  const conditionalPalette = ['#fff8db', '#ffe9e9', '#e8f6ff', '#ecfdf3', '#f3ecff', '#fff4e5']
  const conditionalStyles = (model.conditionalRules || []).map((rule, index) => {
    const bg = conditionalPalette[index % conditionalPalette.length]
    return `.gl-table .${rule.cssClass} { background: ${bg}; }`
  }).join('\n  ')

  const runDateTemplate = `{{${model.runDateField}}}`

  const body = `
<div class="gl-report-shell">
  <div class="gl-report-page report-page">
    <div class="ssrs-band ssrs-header-band">
      <div class="gl-header-container">
        <div>
          <h1>${escapeHtml(model.title)}</h1>
          <div class="gl-subtitle">${escapeHtml(model.subtitle)}</div>
        </div>
        <div class="gl-header-right">
          <div class="gl-period">${escapeHtml(model.periodLabel)}</div>
          <div class="gl-run-date">RUN: ${runDateTemplate}</div>
        </div>
      </div>

      <div class="gl-parameter-block">
        ${params}
      </div>
    </div>

    <div class="ssrs-band ssrs-body-band">
      <table class="gl-table">
        <thead>
          <tr>
            ${tableHead}
          </tr>
        </thead>
        <tbody>
          <tr class="gl-group-row">
            <td colspan="${model.showRowNumber ? cols.length + 1 : cols.length}">${escapeHtml(model.accountGroupLabel)}</td>
          </tr>
          ${groupedRowsTemplate}
          ${totalRow}
        </tbody>
      </table>
    </div>

    <div class="ssrs-band ssrs-footer-band">
      <div class="gl-footer-container page-number">
        <div>${escapeHtml(model.footerLeft)}</div>
        <div>${escapeHtml(model.footerCenter)}</div>
        <div>${model.footerRight}</div>
      </div>
    </div>
  </div>
</div>

<style>
  .gl-report-shell { 
    background: #e2e8f0; 
    padding: 40px 24px; 
    min-height: 100vh; 
    display: flex; 
    justify-content: center; 
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; 
  }
  .gl-report-page {
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 15mm 25mm 15mm;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    color: #0f172a;
    position: relative;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .gl-header-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #cbd5e1;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .gl-header-container h1 {
    margin: 0;
    font-size: 24pt;
    line-height: 1.1;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .gl-subtitle {
    margin-top: 8px;
    font-size: 10pt;
    color: #64748b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .gl-header-right { text-align: right; }
  .gl-period { font-size: 12pt; font-weight: 700; color: #0f172a; }
  .gl-run-date {
    margin-top: 4px;
    font-size: 8pt;
    color: #94a3b8;
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  .gl-parameter-block {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 24px;
  }
  .gl-param-item {
    display: inline-flex;
    gap: 8px;
    font-size: 9pt;
  }
  .gl-param-label { color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .gl-param-value { color: #0f172a; font-weight: 700; }
  .gl-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    table-layout: auto;
  }
  .gl-table thead tr { 
    border-bottom: 2px solid #0f172a;
  }
  .gl-table th, .gl-table td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    line-height: 1.4;
    word-break: break-word;
  }
  .gl-table th { 
    color: #0f172a; 
    font-weight: 700; 
    text-transform: uppercase;
    font-size: 8pt;
    letter-spacing: 0.05em;
    white-space: nowrap;
    vertical-align: bottom;
  }
  .gl-table th.num, .gl-table td.num { 
    text-align: right; 
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; 
    font-variant-numeric: tabular-nums;
    font-size: 9.5pt;
  }
  .gl-table th.center, .gl-table td.center { text-align: center; }
  .gl-group-row td {
    background: #f8fafc;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
    color: #0f172a;
    font-weight: 700;
  }
  .gl-group-break td {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    color: #0f172a;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding-top: 16px;
    font-size: 10pt;
  }
  .gl-data-row td { border-bottom: 1px solid #f1f5f9; color: #334155; }
  .gl-group-subtotal-row td {
    border-top: 1px solid #94a3b8;
    background: #f8fafc;
    font-weight: 700;
    color: #0f172a;
  }
  .gl-grand-total-row td {
    border-top: 2px solid #0f172a;
    border-bottom: 3px double #0f172a;
    font-weight: 800;
    color: #0f172a;
    font-size: 10pt;
    background: #ffffff;
  }
  .gl-grand-total-row .gl-total-label {
    text-align: right;
    letter-spacing: 0.03em;
  }
  .gl-footer-container {
    position: absolute;
    left: 15mm;
    right: 15mm;
    bottom: 15mm;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #64748b;
    font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  .ssrs-band { width: 100%; }
  .ssrs-header-band { margin-bottom: 6px; }
  .ssrs-body-band { min-height: 640px; }
  .ssrs-footer-band { margin-top: auto; }
  ${conditionalStyles}
</style>`

  return `${serializeDesignerMeta(model)}\n\n${body}`.trim()
}
