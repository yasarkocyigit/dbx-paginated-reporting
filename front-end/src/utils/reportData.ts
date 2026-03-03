function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export type ConditionalRuleOperator = 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'

export interface ConditionalRule {
  field: string
  operator: ConditionalRuleOperator
  value: string
  cssClass: string
}

export interface RenderEnrichmentOptions {
  totalFields?: string[]
  groupByField?: string
  showGroupSubtotals?: boolean
  sortByField?: string
  sortDirection?: 'asc' | 'desc'
  conditionalRules?: ConditionalRule[]
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function getValueByPath(input: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').filter(Boolean)
  let cursor: unknown = input
  for (const segment of segments) {
    if (!isPlainObject(cursor)) return undefined
    cursor = cursor[segment]
  }
  return cursor
}

function setValueByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.').filter(Boolean)
  if (!segments.length) return
  let cursor: Record<string, unknown> = target
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    if (!isPlainObject(cursor[segment])) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }
  cursor[segments[segments.length - 1]] = value
}

function formatTotal(value: number): string {
  const hasDecimals = Math.abs(value % 1) > 1e-9
  return value.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

export function extractRows(data: Record<string, unknown>): Record<string, unknown>[] {
  const rawRows = data.rows
  if (!Array.isArray(rawRows)) return []
  return rawRows.filter((item): item is Record<string, unknown> => isPlainObject(item))
}

function evaluateConditionalRule(row: Record<string, unknown>, rule: ConditionalRule): boolean {
  const fieldValue = getValueByPath(row, rule.field)
  const expected = rule.value

  if (rule.operator === 'equals') {
    return String(fieldValue ?? '').toLowerCase() === expected.toLowerCase()
  }
  if (rule.operator === 'not_equals') {
    return String(fieldValue ?? '').toLowerCase() !== expected.toLowerCase()
  }
  if (rule.operator === 'contains') {
    return String(fieldValue ?? '').toLowerCase().includes(expected.toLowerCase())
  }

  const left = toNumber(fieldValue)
  const right = toNumber(expected)
  if (left === null || right === null) return false
  if (rule.operator === 'gt') return left > right
  if (rule.operator === 'gte') return left >= right
  if (rule.operator === 'lt') return left < right
  if (rule.operator === 'lte') return left <= right
  return false
}

function applyConditionalClasses(
  rows: Record<string, unknown>[],
  rules: ConditionalRule[],
): Record<string, unknown>[] {
  if (!rules.length) return rows
  return rows.map((row) => {
    const classes = rules
      .filter((rule) => rule.field && rule.cssClass && evaluateConditionalRule(row, rule))
      .map((rule) => rule.cssClass)
    return {
      ...row,
      _row_class: classes.join(' ').trim(),
    }
  })
}

function computeTotalsForRows(rows: Record<string, unknown>[], totalFields: string[]): Record<string, unknown> {
  const totals: Record<string, unknown> = {}
  for (const fieldPath of totalFields) {
    let sum = 0
    let seenNumeric = false
    for (const row of rows) {
      const value = toNumber(getValueByPath(row, fieldPath))
      if (value === null) continue
      seenNumeric = true
      sum += value
    }
    if (seenNumeric) {
      setValueByPath(totals, fieldPath, formatTotal(sum))
    }
  }
  return totals
}

function buildGroupedRenderRows(
  rows: Record<string, unknown>[],
  groupByField: string,
  totalFields: string[],
  includeSubtotals: boolean,
): { rowsRender: Record<string, unknown>[]; groupSummaries: Record<string, unknown>[] } {
  const rowsRender: Record<string, unknown>[] = []
  const groupSummaries: Record<string, unknown>[] = []
  let currentGroup = '__GROUP_INIT__'
  let currentGroupRows: Record<string, unknown>[] = []

  const flushGroup = () => {
    if (currentGroupRows.length === 0) return
    const groupValue = currentGroup
    const groupTotals = computeTotalsForRows(currentGroupRows, totalFields)
    groupSummaries.push({
      value: groupValue,
      count: currentGroupRows.length,
      totals: groupTotals,
    })
    if (includeSubtotals) {
      rowsRender.push({
        _group_subtotal: true,
        _group_value: groupValue,
        _group_totals: groupTotals,
      })
    }
    currentGroupRows = []
  }

  for (const row of rows) {
    const groupValueRaw = getValueByPath(row, groupByField)
    const groupValue = String(groupValueRaw ?? '(empty)')
    if (currentGroup !== groupValue) {
      flushGroup()
      currentGroup = groupValue
      rowsRender.push({
        _group_header: true,
        _group_value: groupValue,
      })
    }
    currentGroupRows.push(row)
    rowsRender.push({
      ...row,
      _is_data: true,
      _group_value: groupValue,
    })
  }
  flushGroup()

  return { rowsRender, groupSummaries }
}

function sortRows(
  rows: Record<string, unknown>[],
  sortByField?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
): Record<string, unknown>[] {
  if (!sortByField) return rows
  const direction = sortDirection === 'desc' ? -1 : 1
  return [...rows].sort((left, right) => {
    const a = getValueByPath(left, sortByField)
    const b = getValueByPath(right, sortByField)
    const aNum = toNumber(a)
    const bNum = toNumber(b)
    if (aNum !== null && bNum !== null) return (aNum - bNum) * direction
    const aText = String(a ?? '').toLowerCase()
    const bText = String(b ?? '').toLowerCase()
    if (aText < bText) return -1 * direction
    if (aText > bText) return 1 * direction
    return 0
  })
}

export function enrichDataForRendering(
  data: Record<string, unknown>,
  optionsOrTotals: string[] | RenderEnrichmentOptions = [],
): Record<string, unknown> {
  const options: RenderEnrichmentOptions = Array.isArray(optionsOrTotals)
    ? { totalFields: optionsOrTotals }
    : optionsOrTotals
  const uniqueTotalFields = Array.from(new Set((options.totalFields || []).filter(Boolean)))

  const baseRows = sortRows(
    extractRows(data),
    options.sortByField,
    options.sortDirection === 'desc' ? 'desc' : 'asc',
  )
  const rows = applyConditionalClasses(baseRows, options.conditionalRules || [])
  const totals = computeTotalsForRows(rows, uniqueTotalFields)

  let rowsRender = rows
  let groupSummaries: Record<string, unknown>[] = []
  if (options.groupByField) {
    const grouped = buildGroupedRenderRows(
      rows,
      options.groupByField,
      uniqueTotalFields,
      Boolean(options.showGroupSubtotals),
    )
    rowsRender = grouped.rowsRender
    groupSummaries = grouped.groupSummaries
  }

  return {
    ...data,
    rows,
    rows_render: rowsRender,
    _row_count: rows.length,
    _group_count: groupSummaries.length,
    _group_summaries: groupSummaries,
    _totals: totals,
  }
}
